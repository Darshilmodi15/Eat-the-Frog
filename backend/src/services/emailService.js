const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');

let transporter = null;

const initEmailService = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email service: Credentials not configured. Skipping email notifications.');
    return;
  }

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

  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Email service: Running overdue task check...');
    await sendOverdueNotifications();
  });

  console.log('Email service: Cron job scheduled (daily at 8:00 AM).');
};

const sendOverdueNotifications = async () => {
  if (!transporter) return;

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find overdue, incomplete tasks that haven't been notified in the last 24 hours
    const overdueTasks = await Task.find({
      completed: false,
      dueDate: { $lt: now },
      $or: [
        { lastNotified: null },
        { lastNotified: { $lt: oneDayAgo } }
      ]
    });

    if (overdueTasks.length === 0) {
      console.log('Email service: No overdue tasks to notify about.');
      return;
    }

    // Group tasks by user
    const tasksByUser = {};
    for (const task of overdueTasks) {
      const uid = task.userId.toString();
      if (!tasksByUser[uid]) tasksByUser[uid] = [];
      tasksByUser[uid].push(task);
    }

    // Send one email per user with all their overdue tasks
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      const user = await User.findById(userId);
      if (!user) continue;

      const taskListHtml = tasks.map(t => {
        const dueStr = new Date(t.dueDate).toLocaleDateString('en-US', {
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
        const priorityColors = { high: '#B23A3A', medium: '#C58B00', low: '#2F7D32' };
        return `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E8E4DE; font-family: Georgia, serif; color: #1C1C1C;">${t.title}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E8E4DE; font-family: Georgia, serif; color: ${priorityColors[t.priority]}; text-transform: capitalize;">${t.priority}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E8E4DE; font-family: Georgia, serif; color: #B23A3A;">${dueStr}</td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <div style="max-width: 600px; margin: 0 auto; background: #F8F6F1; padding: 40px 24px; font-family: Georgia, 'Times New Roman', serif;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; color: #1C1C1C; margin: 0 0 4px;">🐸 Eat The Frog</h1>
            <p style="color: #6B6B6B; font-size: 14px; margin: 0;">Your overdue task reminder</p>
          </div>
          
          <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <p style="color: #1C1C1C; font-size: 16px; margin: 0 0 16px;">
              Hi ${user.name},
            </p>
            <p style="color: #6B6B6B; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
              You have <strong style="color: #B23A3A;">${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}</strong> waiting for your attention. 
              Remember — eat the frog first!
            </p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #F8F6F1;">
                  <th style="padding: 10px 16px; text-align: left; font-family: Georgia, serif; color: #6B6B6B; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Task</th>
                  <th style="padding: 10px 16px; text-align: left; font-family: Georgia, serif; color: #6B6B6B; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Priority</th>
                  <th style="padding: 10px 16px; text-align: left; font-family: Georgia, serif; color: #6B6B6B; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${taskListHtml}
              </tbody>
            </table>
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
          subject: `🐸 You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} — Eat The Frog`,
          html: emailHtml
        });

        // Update lastNotified for all sent tasks
        const taskIds = tasks.map(t => t._id);
        await Task.updateMany(
          { _id: { $in: taskIds } },
          { $set: { lastNotified: new Date() } }
        );

        console.log(`Email service: Sent overdue notification to ${user.email} (${tasks.length} tasks).`);
      } catch (emailError) {
        console.error(`Email service: Failed to send to ${user.email} -`, emailError.message);
      }
    }
  } catch (error) {
    console.error('Email service: Error during overdue check -', error.message);
  }
};

module.exports = { initEmailService, sendOverdueNotifications };
