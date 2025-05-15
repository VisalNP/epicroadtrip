const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const poiController = require('../controllers/poiController');
const googlePlacesController = require('../controllers/googlePlacesController');
const authController = require('../controllers/authController');
const tripController = require('../controllers/tripController');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/trips', tripController.saveTrip);
router.get('/trips', tripController.getSavedTrips);
router.delete('/trips/:tripId', tripController.deleteSavedTrip);
router.get('/db/search', poiController.getPois);
router.get('/db/pois/:id', poiController.getPoiById);
router.get('/suggest/enjoy', poiController.getEnjoySuggestions);
router.get('/suggest/travel', poiController.getTravelSuggestions);
router.get('/google/hotels', googlePlacesController.getHotelSuggestions);
router.get('/google/restaurants', googlePlacesController.getRestaurantSuggestions);
router.get('/google/bars', googlePlacesController.getBarSuggestions);

router.post('/create-checkout-session', async (req, res) => {
  const { userId } = req.body;
  const YOUR_DOMAIN = process.env.CLIENT_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Epic Road Trip - Premium Plan',
            },
            unit_amount: 1000,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/?payment_status=success&stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/?payment_status=cancelled`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create payment session', details: error.message });
  }
});

module.exports = router;