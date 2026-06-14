const Notification = require('../models/Notification');
const { sendDueTomorrowNotifications, sendOverdueNotifications } = require('../services/emailService');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    // Check and trigger notifications for this user in real time
    await sendDueTomorrowNotifications(req.user._id);
    await sendOverdueNotifications(req.user._id);

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      read: false 
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ notification });
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notifications/:id
const dismissNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification dismissed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification
};
