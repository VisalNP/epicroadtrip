require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const POI = require('../models/poiModel'); 
const JSONStream = require('jsonstream');
const es = require('event-stream');

function getLocalizedValue(obj, lang = 'fr') {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj['@value'] && obj['@language'] === lang) return obj['@value'];
  if (obj['@value']) return obj['@value'];
  if (Array.isArray(obj)) {
    const preferred = obj.find(item => item['@language'] === lang);
    if (preferred) return preferred['@value'];
    if (obj.length > 0 && obj[0] && obj[0]['@value']) return obj[0]['@value'];
  }
  return null;
}

function transformDatatourismeLieu(item) {
  if (!item || !item['@id']) {
    throw new Error('Item missing @id');
  }

  const name = getLocalizedValue(item['rdfs:label']);
  if (!name) {
    throw new Error(`Item ${item['@id']} missing name`);
  }

  if (!item.isLocatedAt || !item.isLocatedAt['schema:address']) {
    throw new Error(`Item ${item['@id']} missing essential isLocatedAt or schema:address information.`);
  }
  const addr = item.isLocatedAt['schema:address'];

  let localityValue = null;
  if (addr['schema:addressLocality']) {
    if (Array.isArray(addr['schema:addressLocality'])) {
      localityValue = addr['schema:addressLocality'][0];
    } else {
      localityValue = addr['schema:addressLocality'];
    }
  }

  const cityValue = addr.hasAddressCity ? getLocalizedValue(addr.hasAddressCity['rdfs:label']) : localityValue;

  if (!localityValue && !cityValue) {
      throw new Error(`Item ${item['@id']} missing both locality and city in address.`);
  }
  
  const streetAddressValue = Array.isArray(addr['schema:streetAddress']) ? addr['schema:streetAddress'].join(', ') : addr['schema:streetAddress'];

  const address = {
    streetAddress: streetAddressValue,
    postalCode: addr['schema:postalCode'],
    locality: localityValue,
    city: cityValue,
  };

  let location = null;
  if (item.isLocatedAt['schema:geo']) {
    const geo = item.isLocatedAt['schema:geo'];
    let lat, lon;
    const rawLat = geo['schema:latitude']?.['@value'] || geo['schema:latitude'];
    const rawLon = geo['schema:longitude']?.['@value'] || geo['schema:longitude'];

    if (rawLat !== undefined && rawLon !== undefined) {
      lat = parseFloat(rawLat);
      lon = parseFloat(rawLon);
    }

    if ((isNaN(lat) || isNaN(lon)) && geo.latlon?.['@value']) {
      const latLonString = geo.latlon['@value'];
      const parts = latLonString.split('#');
      if (parts.length === 2) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      }
    }

    if (!isNaN(lat) && !isNaN(lon)) {
      location = {
        type: 'Point',
        coordinates: [lon, lat],
      };
    }
  }

  const types = Array.isArray(item['@type'])
    ? item['@type'].map(t => t.replace('schema:', '').replace('urn:resource', '')).filter(t => t && t !== 'PointOfInterest' && t !== 'PlaceOfInterest')
    : [];

  const shortDescription = item.owl_topObjectProperty?.shortDescription
    ? getLocalizedValue(item.owl_topObjectProperty.shortDescription)
    : getLocalizedValue(item['rdfs:comment']);

  const description = getLocalizedValue(item['rdfs:comment']);

  return {
    originalId: item['@id'],
    dataSource: 'datatourisme-lieux',
    name,
    types,
    shortDescription,
    description: description !== shortDescription ? description : null,
    address: address,
    location: location,
    lastUpdateSource: item.lastUpdateDatatourisme ? new Date(item.lastUpdateDatatourisme['@value'] || item.lastUpdateDatatourisme) : (item.lastUpdate ? new Date(item.lastUpdate['@value'] || item.lastUpdate) : null),
  };
}

async function processJsonFileStream(filePath, dataSourceName, transformFunction, errorSkipLimit = 100) {
  return new Promise(async (resolve, reject) => {
    if (!(await fs.pathExists(filePath))) {
      console.log(`${path.basename(filePath)} not found.`);
      return resolve({ processed: 0, upserted: 0, modified: 0, skipped: 0 });
    }

    console.log(`Starting to stream and process ${path.basename(filePath)}...`);

    const batchSize = 500;
    let operationsBatch = [];
    let processedCount = 0;
    let skippedCount = 0;
    let totalUpserted = 0;
    let totalModified = 0;
    let continueStreaming = true;

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const jsonStream = JSONStream.parse('@graph.*');

    fileStream.pipe(jsonStream)
      .pipe(es.map(async (item, callback) => {
        if (!continueStreaming) {
          return callback();
        }
        try {
          const transformedItem = transformFunction(item);
          if (transformedItem) {
            transformedItem.dataSource = dataSourceName;
            operationsBatch.push({
              updateOne: {
                filter: { originalId: transformedItem.originalId, dataSource: dataSourceName },
                update: { $set: transformedItem },
                upsert: true,
              },
            });
            processedCount++;

            if (operationsBatch.length >= batchSize) {
              jsonStream.pause();
              const batchToProcess = [...operationsBatch];
              operationsBatch = [];
              const result = await POI.bulkWrite(batchToProcess);
              totalUpserted += result.upsertedCount || 0;
              totalModified += result.modifiedCount || 0;
              jsonStream.resume();
            }
          } else {
             skippedCount++;
             console.warn(`Item transformation returned null, skipping. ID: ${item && item['@id'] ? item['@id'] : 'Unknown'}`);
          }
          callback();
        } catch (err) {
          skippedCount++;
          console.warn(`Error transforming item, skipping. ID: ${item && item['@id'] ? item['@id'] : 'Unknown Item'}. Error: ${err.message}`);
          if (errorSkipLimit !== Infinity && skippedCount >= errorSkipLimit) {
            console.error(`Reached error skip limit of ${errorSkipLimit} for ${path.basename(filePath)}. Halting processing for this file.`);
            continueStreaming = false;
            fileStream.destroy();
            jsonStream.destroy();
          }
          callback();
        }
      }))
      .on('error', (err) => {
        if (continueStreaming) {
          console.error(`Critical stream error in ${path.basename(filePath)}:`, err);
          reject(err);
        }
      })
      .on('end', async () => {
        if (!continueStreaming && errorSkipLimit !== Infinity && skippedCount >= errorSkipLimit) {
           console.log(`Processing for ${path.basename(filePath)} was halted due to exceeding error limit.`);
           return resolve({ processed: processedCount, upserted: totalUpserted, modified: totalModified, skipped: skippedCount });
        }
        try {
          if (operationsBatch.length > 0) {
            const result = await POI.bulkWrite(operationsBatch);
            totalUpserted += result.upsertedCount || 0;
            totalModified += result.modifiedCount || 0;
          }
          console.log(`Finished processing ${path.basename(filePath)}. Total items processed successfully: ${processedCount}. Items skipped due to errors: ${skippedCount}. DB: ${totalUpserted} upserted, ${totalModified} modified.`);
          resolve({ processed: processedCount, upserted: totalUpserted, modified: totalModified, skipped: skippedCount });
        } catch (dbError) {
          console.error(`Error in final DB write for ${dataSourceName}:`, dbError);
          reject(dbError);
        }
      });
  });
}

function transformDatatourismeEvent(item) {
    try {
        if (!item || !item['@id']) throw new Error('Item missing @id');
        console.warn(`transformDatatourismeEvent not fully implemented. Skipping event item: ${item['@id']}`);
        return null;
    } catch (e) {
        throw e;
    }
}

function transformDatatourismeProduit(item) {
    try {
        if (!item || !item['@id']) throw new Error('Item missing @id');
        console.warn(`transformDatatourismeProduit not fully implemented. Skipping product item: ${item['@id']}`);
        return null;
    } catch(e) {
        throw e;
    }
}

async function importData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for import.');

    const errorLimitPerFile = Infinity;

    const lieuxFilePath = path.join(__dirname, '..', 'data', 'lieux.json');
    await processJsonFileStream(lieuxFilePath, 'datatourisme-lieux', transformDatatourismeLieu, errorLimitPerFile);

    const evenementsFilePath = path.join(__dirname, '..', 'data', 'evenements.json');
    await processJsonFileStream(evenementsFilePath, 'datatourisme-events', transformDatatourismeEvent, errorLimitPerFile);

    const produitsFilePath = path.join(__dirname, '..', 'data', 'produits.json');
    await processJsonFileStream(produitsFilePath, 'datatourisme-products', transformDatatourismeProduit, errorLimitPerFile);

  } catch (error) {
    console.error('Error during data import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

if (require.main === module) {
  importData();
}

module.exports = importData;