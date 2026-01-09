import Queue from 'bull';
import { prisma } from '../config/database';
import { sendNotification, sendAppointmentReminder } from '../services/notification.service';
import { startOfDay, addDays, addHours, subHours } from 'date-fns';
import { NotificationStatus, AppointmentStatus } from '@prisma/client';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create notification queue
export const notificationQueue = new Queue('notifications', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Process pending notifications
notificationQueue.process('send-notification', async (job) => {
  const { notificationId } = job.data;
  console.log(`Processing notification ${notificationId}`);
  
  await sendNotification(notificationId);
});

// Process appointment reminders
notificationQueue.process('appointment-reminder', async (job) => {
  const { appointmentId, hoursBefore } = job.data;
  console.log(`Sending ${hoursBefore}h reminder for appointment ${appointmentId}`);
  
  await sendAppointmentReminder(appointmentId, hoursBefore);
});

// Schedule 24-hour reminders (runs every hour)
export const schedule24HourReminders = async () => {
  try {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const tomorrowEnd = addDays(startOfDay(new Date()), 2);

    // Find appointments scheduled for tomorrow that haven't sent 24h reminder
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: tomorrow,
          lt: tomorrowEnd,
        },
        status: AppointmentStatus.SCHEDULED,
        reminderSent24h: false,
      },
      include: {
        clinic: {
          include: {
            settings: true,
          },
        },
      },
    });

    console.log(`Found ${appointments.length} appointments needing 24h reminders`);

    for (const appointment of appointments) {
      if (appointment.clinic.settings?.autoReminderEnabled) {
        await notificationQueue.add(
          'appointment-reminder',
          {
            appointmentId: appointment.id,
            hoursBefore: 24,
          },
          {
            delay: 0, // Send immediately
          }
        );
      }
    }
  } catch (error) {
    console.error('Error scheduling 24h reminders:', error);
  }
};

// Schedule 1-hour reminders (runs every 15 minutes)
export const schedule1HourReminders = async () => {
  try {
    const oneHourFromNow = addHours(new Date(), 1);
    const oneHourFifteenMinFromNow = addHours(new Date(), 1.25);

    // Find appointments in the next 1-1.25 hours that haven't sent 1h reminder
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledDate: startOfDay(new Date()),
        reminderSent1h: false,
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        clinic: {
          include: {
            settings: true,
          },
        },
      },
    });

    console.log(`Checking ${appointments.length} appointments for 1h reminders`);

    for (const appointment of appointments) {
      const appointmentTime = new Date(appointment.scheduledTime);
      
      // Check if appointment is in the 1-hour window
      if (appointmentTime >= oneHourFromNow && appointmentTime <= oneHourFifteenMinFromNow) {
        if (appointment.clinic.settings?.autoReminderEnabled) {
          await notificationQueue.add(
            'appointment-reminder',
            {
              appointmentId: appointment.id,
              hoursBefore: 1,
            },
            {
              delay: 0,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling 1h reminders:', error);
  }
};

// Process pending notifications (runs every minute)
export const processPendingNotifications = async () => {
  try {
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      take: 100, // Process 100 at a time
    });

    console.log(`Found ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      await notificationQueue.add(
        'send-notification',
        {
          notificationId: notification.id,
        },
        {
          delay: 0,
        }
      );
    }
  } catch (error) {
    console.error('Error processing pending notifications:', error);
  }
};

// Initialize cron jobs
export const initializeNotificationJobs = () => {
  console.log('🔔 Initializing notification jobs...');

  // Process pending notifications every minute
  setInterval(processPendingNotifications, 60 * 1000);

  // Schedule 24-hour reminders every hour
  setInterval(schedule24HourReminders, 60 * 60 * 1000);

  // Schedule 1-hour reminders every 15 minutes
  setInterval(schedule1HourReminders, 15 * 60 * 1000);

  // Run immediately on startup
  processPendingNotifications();
  schedule24HourReminders();
  schedule1HourReminders();

  console.log('✅ Notification jobs initialized');
};

export default {
  notificationQueue,
  initializeNotificationJobs,
};
