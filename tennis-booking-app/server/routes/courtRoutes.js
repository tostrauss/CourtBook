// server/routes/courtRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
  blockCourt,
  unblockCourt
} = require('../controllers/courtController');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  validateCreateCourt,
  validateMongoId
} = require('../middleware/validationMiddleware');

// Public routes
router.get('/', getCourts);
router.get('/:id', validateMongoId(), getCourt);

// Protected admin routes
// All subsequent routes in this file will use 'protect' and 'admin' middleware
router.use(protect, admin);

router.post('/', validateCreateCourt, createCourt);
router.put('/:id', validateMongoId(), updateCourt);
router.delete('/:id', validateMongoId(), deleteCourt);
router.post('/:id/block', validateMongoId(), blockCourt);
// Note: Your unblockCourt route in courtController might need adjustment if blockId is part of body or query
// If blockId is a sub-resource, it should be part of the path like /:id/block/:blockId
// Based on your controller, it seems like blockId is a param: router.post('/:id/unblock/:blockId', validateMongoId(), unblockCourt);
// Let's assume blockId is a route parameter for unblocking a specific block entry.
router.post('/:id/unblock/:blockId', validateMongoId('id'), validateMongoId('blockId'), unblockCourt);


module.exports = router;
