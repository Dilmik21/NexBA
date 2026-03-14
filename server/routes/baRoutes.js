const express = require('express');
const router = express.Router();
const baController = require('../controllers/baController');

router.get('/overview', baController.getDashboardOverview);
router.get('/search', baController.searchAllItems);

// NEW: Fetch requirements for the inbox page
router.get('/inbox', baController.getInboxRequirements);

module.exports = router;