import { Router } from 'express';
import { z } from 'zod';
import * as notificationController from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { Role, NotificationType } from '@prisma/client';

const router = Router();

// Validation schemas
const notificationsQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
});

const testNotificationSchema = z.object({
  type: z.enum([
    NotificationType.SMS,
    NotificationType.EMAIL,
    NotificationType.PUSH,
    NotificationType.WHATSAPP,
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
});

const updateSettingsSchema = z.object({
  autoReminderEnabled: z.boolean().optional(),
  enableSmsNotifications: z.boolean().optional(),
  enableEmailNotifications: z.boolean().optional(),
  enablePushNotifications: z.boolean().optional(),
});

// Get user's notifications
router.get(
  '/',
  authenticate,
  validateQuery(notificationsQuerySchema),
  notificationController.getUserNotifications
);

// Get unread count
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

// Send test notification
router.post(
  '/test',
  authenticate,
  validateBody(testNotificationSchema),
  notificationController.sendTestNotification
);

// Get notification settings (admin only)
router.get(
  '/settings',
  authenticate,
  authorize(Role.ADMIN),
  notificationController.getNotificationSettings
);

// Update notification settings (admin only)
router.put(
  '/settings',
  authenticate,
  authorize(Role.ADMIN),
  validateBody(updateSettingsSchema),
  notificationController.updateNotificationSettings
);

export default router;
