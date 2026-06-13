const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(auth);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', dismissNotification);

module.exports = router;
