// server/routes/announcementRoutes.js
// Replace validateMongoId() with validateUUID()
router.get('/:id', optionalAuth, validateUUID(), getAnnouncement);
router.put('/:id', validateUUID(), updateAnnouncement);
router.delete('/:id', validateUUID(), deleteAnnouncement);

// server/routes/bookingRoutes.js
// Replace validateMongoId() with validateUUID()
router.get('/:id', validateUUID(), getBooking);
router.put('/:id/cancel', validateUUID(), cancelBooking);
router.put('/:id', admin, validateUUID(), updateBooking);
router.delete('/:id', admin, validateUUID(), deleteBooking);

// server/routes/courtRoutes.js
// Replace validateMongoId() with validateUUID()
router.get('/:id', validateUUID(), getCourt);
router.put('/:id', validateUUID(), updateCourt);
router.delete('/:id', validateUUID(), deleteCourt);
router.post('/:id/block', validateUUID(), blockCourt);
router.post('/:id/unblock/:blockId', validateUUID('id'), validateUUID('blockId'), unblockCourt);

// server/routes/userRoutes.js
// Replace validateMongoId() with validateUUID()
router.get('/:id', admin, validateUUID(), getUser);
router.put('/:id', admin, validateUUID(), updateUser);
router.delete('/:id', admin, validateUUID(), deleteUser);
