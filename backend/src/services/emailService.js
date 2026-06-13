const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');

// NOTE: Email reminders are experimental and may not be delivered reliably
// in all environments. In-app notifications are created as the primary channel.

let transporter = null;

const initEmailService = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email service: Credentials not configured. Skipping email notifications, but in-app notifications will still be scheduled.');
  } else {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify transporter on startup
    transporter.verify((error) => {
      if (error) {
        console.error('Email service: Failed to connect -', error.message);
        transporter = null;
      } else {
        console.log('Email service: Connected and ready to send.');
      }
    });
  }

  // Run scheduled jobs every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Email/Notification service: Running scheduled cron jobs...');
    const today = new Date();
    const isSunday = today.getDay() === 0;

    await sendDueTomorrowNotifications();
    await sendOverdueNotifications();
    await sendDailySummaries();
    if (isSunday) {
      await sendWeeklyReviews();
    }
  });

  console.log('Email/Notification service: Cron job scheduled (daily at 8:00 AM).');
};

const sendDueTomorrowNotifications = async () => {
  try {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    // Find incomplete tasks due tomorrow that haven't been notified yet
    const tasks = await Task.find({
      completed: false,
      dueDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
      notifiedDueTomorrow: false
    });

    for (const task of tasks) {
      const user = await User.findById(task.userId);
      if (!user) continue;

      // Create in-app notification (primary channel - unconditionally)
      await Notification.create({
        userId: user._id,
        type: 'task_due_tomorrow',
        title: 'Task Due Tomorrow',
        message: `"${task.title}" is due tomorrow. Tackle it first thing!`,
        taskId: task._id
      });

      // Send email if configured (experimental secondary channel)
      if (transporter && user.notificationPreferences?.emailReminders) {
        const dueTimeStr = new Date(task.dueDate).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit'
        });

        const emailHtml = `
          <div style="max-width: 600px; margin: 0 auto; background: #F8F6F1; padding: 40px 24px; font-family: Georgia, serif; color: #1C1C1C;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; color: #1C1C1C; margin: 0 0 4px;">🐸 Eat The Frog</h1>
              <p style="color: #6B6B6B; font-size: 14px; margin: 0;">Task Due Tomorrow Reminder</p>
            </div>
            
            <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <p style="color: #1C1C1C; font-size: 16px; margin: 0 0 16px;">
                Hi ${user.name},
              </p>
              <p style="color: #6B6B6B; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Just a quick reminder that you have a task due tomorrow. Remember to tackle it first thing!
              </p>
              
              <div style="background: #F8F6F1; padding: 20px; border-radius: 8px; border: 1px solid #E8E4DE;">
                <h3 style="margin: 0 0 10px; font-family: Georgia, serif; color: #1C1C1C;">${task.title}</h3>
                <p style="margin: 4px 0; font-size: 14px; color: #6B6B6B;"><strong>Due:</strong> Tomorrow at ${dueTimeStr}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #6B6B6B; text-transform: capitalize;"><strong>Priority:</strong> ${task.priority}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 28px;">
              <p style="color: #6B6B6B; font-size: 13px; margin: 0;">
                — Eat The Frog Task Manager
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"Eat The Frog" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `⏰ Task Due Tomorrow: ${task.title} — Eat The Frog`,
            html: emailHtml
          });
          console.log(`Email service: Sent due tomorrow email for task ${task._id} to ${user.email}`);
        } catch (mailErr) {
          console.error(`Email service: Failed to send due tomorrow email to ${user.email} -`, mailErr.message);
        }
      }

      task.notifiedDueTomorrow = true;
      await task.save();
      console.log(`Notification service: Processed due tomorrow status for task ${task._id}`);
    }
  } catch (error) {
    console.error('Email/Notification service: Error in due tomorrow reminders -', error.message);
  }
};

const sendOverdueNotifications = async () => {
  try {
    const now = new Date();

    // Find overdue, incomplete tasks that haven't been notified for overdue status
    const overdueTasks = await Task.find({
      completed: false,
      dueDate: { $lt: now },
      notifiedOverdue: false
    });

    for (const task of overdueTasks) {
      const user = await User.findById(task.userId);
      if (!user) continue;

      if (!user.notificationPreferences?.overdueAlerts) continue;

      const dueStr = new Date(task.dueDate).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });

      // Create in-app notification (primary channel - unconditionally)
      await Notification.create({
        userId: user._id,
        type: 'task_overdue',
        title: 'Task Overdue',
        message: `"${task.title}" was due ${dueStr}. Please review or reschedule.`,
        taskId: task._id
      });

      // Send email if configured (experimental secondary channel)
      if (transporter) {
        const emailHtml = `
          <div style="max-width: 600px; margin: 0 auto; background: #F8F6F1; padding: 40px 24px; font-family: Georgia, serif; color: #1C1C1C;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; color: #1C1C1C; margin: 0 0 4px;">🐸 Eat The Frog</h1>
              <p style="color: #B23A3A; font-size: 14px; margin: 0;">Task Overdue Reminder</p>
            </div>
            
            <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <p style="color: #1C1C1C; font-size: 16px; margin: 0 0 16px;">
                Hi ${user.name},
              </p>
              <p style="color: #6B6B6B; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Your task is overdue. Please review, reschedule or mark it as completed:
              </p>
              
              <div style="background: #F8F6F1; padding: 20px; border-radius: 8px; border: 1px solid #E8E4DE;">
                <h3 style="margin: 0 0 10px; font-family: Georgia, serif; color: #1C1C1C;">${task.title}</h3>
                <p style="margin: 4px 0; font-size: 14px; color: #B23A3A;"><strong>Was due:</strong> ${dueStr}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #6B6B6B; text-transform: capitalize;"><strong>Priority:</strong> ${task.priority}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 28px;">
              <p style="color: #6B6B6B; font-size: 13px; margin: 0;">
                — Eat The Frog Task Manager
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"Eat The Frog" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `⚠️ Task Overdue: ${task.title} — Eat The Frog`,
            html: emailHtml
          });
          console.log(`Email service: Sent overdue email for task ${task._id} to ${user.email}`);
        } catch (mailErr) {
          console.error(`Email service: Failed to send overdue email to ${user.email} -`, mailErr.message);
        }
      }

      task.notifiedOverdue = true;
      await task.save();
      console.log(`Notification service: Processed overdue status for task ${task._id}`);
    }
  } catch (error) {
    console.error('Email/Notification service: Error in overdue alerts -', error.message);
  }
};

const sendDailySummaries = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const users = await User.find({ 'notificationPreferences.dailySummary': true });

    for (const user of users) {
      // Check duplicate daily summary sending safety
      if (user.lastDailySummarySent) {
        const lastSent = new Date(user.lastDailySummarySent);
        if (lastSent.getFullYear() === now.getFullYear() &&
            lastSent.getMonth() === now.getMonth() &&
            lastSent.getDate() === now.getDate()) {
          console.log(`Notification service: Daily summary already sent today to ${user.email}. Skipping.`);
          continue;
        }
      }

      const allTasks = await Task.find({ userId: user._id });

      const dueTodayCount = allTasks.filter(t => !t.completed && t.dueDate >= todayStart && t.dueDate < todayEnd).length;
      const pendingCount = allTasks.filter(t => !t.completed).length;
      const completedYesterdayCount = allTasks.filter(t => t.completed && t.completedAt >= yesterdayStart && t.completedAt < yesterdayEnd).length;
      const overdueCount = allTasks.filter(t => !t.completed && t.dueDate < todayStart).length;

      // Create in-app notification (primary channel - unconditionally)
      await Notification.create({
        userId: user._id,
        type: 'daily_summary',
        title: 'Daily Summary',
        message: `Today: ${dueTodayCount} due, ${pendingCount} pending, ${overdueCount} overdue. ${completedYesterdayCount} completed yesterday.`
      });

      // Send email if configured (experimental secondary channel)
      if (transporter) {
        const emailHtml = `
          <div style="max-width: 600px; margin: 0 auto; background: #F8F6F1; padding: 40px 24px; font-family: Georgia, serif; color: #1C1C1C;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; color: #1C1C1C; margin: 0 0 4px;">🐸 Eat The Frog</h1>
              <p style="color: #6B6B6B; font-size: 14px; margin: 0;">Today's Productivity Digest</p>
            </div>
            
            <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <p style="color: #1C1C1C; font-size: 16px; margin: 0 0 16px;">
                Hi ${user.name},
              </p>
              <p style="color: #6B6B6B; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Here is your productivity digest for today:
              </p>
              
              <div style="background: #F8F6F1; padding: 20px; border-radius: 8px; border: 1px solid #E8E4DE;">
                <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Tasks Due Today:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${dueTodayCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Pending Tasks:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${pendingCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Completed Yesterday:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${completedYesterdayCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #B23A3A;"><strong>Overdue Tasks:</strong></td>
                    <td style="padding: 8px 0; color: #B23A3A; text-align: right;"><strong>${overdueCount}</strong></td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 28px;">
              <p style="color: #6B6B6B; font-size: 13px; margin: 0;">
                — Eat The Frog Task Manager
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"Eat The Frog" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `🐸 Daily Summary — Eat The Frog`,
            html: emailHtml
          });
          console.log(`Email service: Sent daily summary to ${user.email}`);
        } catch (mailErr) {
          console.error(`Email service: Failed to send daily summary to ${user.email} -`, mailErr.message);
        }
      }

      user.lastDailySummarySent = new Date();
      await user.save();
      console.log(`Notification service: Processed daily summary for user ${user._id}`);
    }
  } catch (error) {
    console.error('Email/Notification service: Error sending daily summaries -', error.message);
  }
};

const sendWeeklyReviews = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'notificationPreferences.weeklyReview': true });

    for (const user of users) {
      // Check duplicate weekly review sending safety
      if (user.lastWeeklyReviewSent) {
        const lastSent = new Date(user.lastWeeklyReviewSent);
        const timeDiff = now.getTime() - lastSent.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        if (daysDiff < 6) {
          console.log(`Notification service: Weekly review already sent recently to ${user.email}. Skipping.`);
          continue;
        }
      }

      const allTasks = await Task.find({ userId: user._id });

      const completedLast7Days = allTasks.filter(t => t.completed && t.completedAt >= sevenDaysAgo);
      const createdLast7Days = allTasks.filter(t => t.createdAt >= sevenDaysAgo);

      const completedCount = completedLast7Days.length;
      const createdCount = createdLast7Days.length;
      const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;

      // Best Day calculation
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const completedCountsByDay = [0, 0, 0, 0, 0, 0, 0];
      completedLast7Days.forEach(t => {
        const day = new Date(t.completedAt).getDay();
        completedCountsByDay[day]++;
      });

      let maxDayIndex = 1;
      let maxCount = completedCountsByDay[1];
      for (let i = 0; i < 7; i++) {
        if (completedCountsByDay[i] > maxCount) {
          maxCount = completedCountsByDay[i];
          maxDayIndex = i;
        }
      }
      const bestDay = daysOfWeek[maxDayIndex];

      // Create in-app notification (primary channel - unconditionally)
      await Notification.create({
        userId: user._id,
        type: 'weekly_review',
        title: 'Weekly Review',
        message: `This week: ${completedCount} completed, ${createdCount} created (${completionRate}% rate). Best day: ${completedCount > 0 ? bestDay : 'N/A'}.`
      });

      // Send email if configured (experimental secondary channel)
      if (transporter) {
        const emailHtml = `
          <div style="max-width: 600px; margin: 0 auto; background: #F8F6F1; padding: 40px 24px; font-family: Georgia, serif; color: #1C1C1C;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; color: #1C1C1C; margin: 0 0 4px;">🐸 Eat The Frog</h1>
              <p style="color: #6B6B6B; font-size: 14px; margin: 0;">Weekly Productivity Digest</p>
            </div>
            
            <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <p style="color: #1C1C1C; font-size: 16px; margin: 0 0 16px;">
                Hi ${user.name},
              </p>
              <p style="color: #6B6B6B; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Here is a review of your productivity this past week:
              </p>
              
              <div style="background: #F8F6F1; padding: 20px; border-radius: 8px; border: 1px solid #E8E4DE;">
                <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Tasks Completed:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${completedCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Tasks Created:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${createdCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C;"><strong>Completion Rate:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #E8E4DE; color: #1C1C1C; text-align: right;">${completionRate}%</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #1C1C1C;"><strong>Best Day:</strong></td>
                    <td style="padding: 8px 0; color: #1C1C1C; text-align: right;"><strong>${completedCount > 0 ? bestDay : 'N/A'}</strong></td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 28px;">
              <p style="color: #6B6B6B; font-size: 13px; margin: 0;">
                — Eat The Frog Task Manager
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: `"Eat The Frog" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `📊 Weekly Review — Eat The Frog`,
            html: emailHtml
          });
          console.log(`Email service: Sent weekly review to ${user.email}`);
        } catch (mailErr) {
          console.error(`Email service: Failed to send weekly review to ${user.email} -`, mailErr.message);
        }
      }

      user.lastWeeklyReviewSent = new Date();
      await user.save();
      console.log(`Notification service: Processed weekly review for user ${user._id}`);
    }
  } catch (error) {
    console.error('Email/Notification service: Error sending weekly reviews -', error.message);
  }
};

module.exports = { 
  initEmailService, 
  sendDueTomorrowNotifications, 
  sendOverdueNotifications, 
  sendDailySummaries, 
  sendWeeklyReviews 
};
