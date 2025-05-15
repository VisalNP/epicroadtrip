module.exports = {
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**', 
    '!**/__tests__/**',   
    '!**/__mocks__/**',   
    '!jest.config.js',   
    '!coverage/**',       
    '!server.js',         
    '!utils/googleApiHelper.js', 
    '!dataImporter.js', 
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/',
    '/coverage/',
    'jest.config.js',
    'server.js',
    'utils/googleApiHelper.js', 
    'dataImporter.js',          
    'routes/',             
  ],

  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
};