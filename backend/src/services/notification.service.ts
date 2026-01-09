import { prisma } from '../config/database';
import { NotificationType, NotificationStatus } from '@prisma/client';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import admin from 'firebase-admin';
import { sendEmail } from '../utils/email';

// Initialize Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize Firebase Admin (if not already initialized)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY,
      clientEmail: FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const sendSMS = async (to: string, message: string): Promise<boolean> => {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.warn('⚠️  Twilio not configured. SMS would be sent to:', to);
    console.log('Message:', message);
    return false;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });
    console.log(`✅ SMS sent to ${to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending SMS:', error.message);
    return false;
  }
};

export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: any
): Promise<boolean> => {
  if (!admin.apps.length) {
    console.warn('⚠️  Firebase not configured. Push would be sent to:', tokens.length, 'devices');
    console.log('Title:', title);
    console.log('Body:', body);
    return false;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Push notifications sent: ${response.successCount}/${tokens.length}`);
    
    if (response.failureCount > 0) {
      console.log('Failed tokens:', response.responses
        .filter((r) => !r.success)
        .map((r) => r.error?.message));
    }

    return response.successCount > 0;
  } catch (error: any) {
    console.error('❌ Error sending push notification:', error.message);
    return false;
  }
};

export const createNotification = async (
  userId: string,
  clinicId: string,
  type: NotificationType,
  title: string,
  content: string,
  appointmentId?: string,
  scheduledFor?: Date
) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      clinicId,
      appointmentId,
      type,
      title,
      content,
      status: NotificationStatus.PENDING,
      scheduledFor: scheduledFor || new Date(),
    },
  });

  return notification;
};

export const sendNotification = async (notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: true,
      clinic: {
        include: {
          settings: true,
        },
      },
    },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  const settings = notification.clinic.settings;
  let success = false;
  let failureReason: string | undefined;

  try {
    switch (notification.type) {
      case NotificationType.SMS:
        if (settings?.enableSmsNotifications) {
          success = await sendSMS(notification.user.phone, notification.content);
        } else {
          failureReason = 'SMS notifications disabled for clinic';
        }
        break;

      case NotificationType.EMAIL:
        if (settings?.enableEmailNotifications) {
          await sendEmail({
            to: notification.user.email,
            subject: notification.title,
            html: `<p>${notification.content}</p>`,
          });
          success = true;
        } else {
          failureReason = 'Email notifications disabled for clinic';
        }
        break;

      case NotificationType.PUSH:
        if (settings?.enablePushNotifications) {
          // Get user's device tokens
          const deviceTokens = await prisma.deviceToken.findMany({
            where: {
              userId: notification.userId,
              isActive: true,
            },
            select: {
              token: true,
            },
          });

          const tokens = deviceTokens.map((dt) => dt.token);
          
          if (tokens.length > 0) {
            success = await sendPushNotification(
              tokens,
              notification.title,
              notification.content,
              { appointmentId: notification.appointmentId }
            );
          } else {
            failureReason = 'No active device tokens found';
          }
        } else {
          failureReason = 'Push notifications disabled for clinic';
        }
        break;

      case NotificationType.WHATSAPP:
        // WhatsApp implementation would go here
        failureReason = 'WhatsApp not yet implemented';
        break;
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: success ? new Date() : undefined,
        failureReason: success ? undefined : failureReason,
      },
    });

    return success;
  } catch (error: any) {
    console.error('Error sending notification:', error);
    
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        failureReason: error.message,
      },
    });

    return false;
  }
};

export const sendAppointmentReminder = async (
  appointmentId: string,
  hoursBefore: number
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
      clinic: {
        include: { settings: true },
      },
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const patient = appointment.patient.user;
  const doctor = appointment.doctor.user;
  const appointmentDate = new Date(appointment.scheduledDate);
  const appointmentTime = new Date(appointment.scheduledTime);

  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const reminderMessage = hoursBefore === 24
    ? `Reminder: You have an appointment with Dr. ${doctor.lastName} tomorrow at ${formattedTime}. Type: ${appointment.appointmentType}. Please arrive 10 minutes early.`
    : `Reminder: Your appointment with Dr. ${doctor.lastName} starts in 1 hour at ${formattedTime}. Please be ready.`;

  const reminderTitle = hoursBefore === 24
    ? 'Appointment Tomorrow'
    : 'Appointment in 1 Hour';

  const settings = appointment.clinic.settings;

  // Send SMS
  if (settings?.enableSmsNotifications) {
    const smsNotification = await createNotification(
      patient.id,
      appointment.clinicId,
      NotificationType.SMS,
      reminderTitle,
      reminderMessage,
      appointmentId
    );
    await sendNotification(smsNotification.id);
  }

  // Send Email
  if (settings?.enableEmailNotifications) {
    const emailNotification = await createNotification(
      patient.id,
      appointment.clinicId,
      NotificationType.EMAIL,
      reminderTitle,
      reminderMessage,
      appointmentId
    );
    await sendNotification(emailNotification.id);
  }

  // Send Push
  if (settings?.enablePushNotifications) {
    const pushNotification = await createNotification(
      patient.id,
      appointment.clinicId,
      NotificationType.PUSH,
      reminderTitle,
      reminderMessage,
      appointmentId
    );
    await sendNotification(pushNotification.id);
  }

  // Mark reminder as sent
  const field = hoursBefore === 24 ? 'reminderSent24h' : 'reminderSent1h';
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { [field]: true },
  });

  console.log(`✅ Reminders sent for appointment ${appointmentId} (${hoursBefore}h before)`);
};

export default {
  sendSMS,
  sendPushNotification,
  createNotification,
  sendNotification,
  sendAppointmentReminder,
};
