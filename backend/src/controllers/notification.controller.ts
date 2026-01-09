import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { createNotification, sendNotification } from '../services/notification.service';
import { NotificationType } from '@prisma/client';

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 50, offset = 0, unreadOnly = 'false' } = req.query;

    const where: any = { userId };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
      include: {
        appointment: {
          select: {
            id: true,
            appointmentType: true,
            scheduledDate: true,
            scheduledTime: true,
          },
        },
      },
    });

    const total = await prisma.notification.count({ where });

    res.json({
      success: true,
      data: {
        notifications,
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    throw error;
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    // For this MVP, we'll count all recent notifications
    // In production, you might want a separate 'read' field
    const count = await prisma.notification.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    throw error;
  }
};

export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userClinicId = req.user?.clinicId;
    const { type, title, content } = req.body;

    // Create notification
    const notification = await createNotification(
      userId!,
      userClinicId!,
      type as NotificationType,
      title,
      content
    );

    // Send immediately
    const success = await sendNotification(notification.id);

    res.json({
      success: true,
      message: success ? 'Notification sent successfully' : 'Notification failed to send',
      data: { notification },
    });
  } catch (error) {
    throw error;
  }
};

export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userClinicId = req.user?.clinicId;

    const settings = await prisma.clinicSettings.findUnique({
      where: { clinicId: userClinicId },
      select: {
        autoReminderEnabled: true,
        reminderHoursBefore24h: true,
        reminderHoursBefore1h: true,
        enableSmsNotifications: true,
        enableEmailNotifications: true,
        enablePushNotifications: true,
        enableWhatsappNotifications: true,
      },
    });

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    throw error;
  }
};

export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userClinicId = req.user?.clinicId;
    const {
      autoReminderEnabled,
      enableSmsNotifications,
      enableEmailNotifications,
      enablePushNotifications,
    } = req.body;

    const settings = await prisma.clinicSettings.update({
      where: { clinicId: userClinicId },
      data: {
        autoReminderEnabled,
        enableSmsNotifications,
        enableEmailNotifications,
        enablePushNotifications,
      },
    });

    res.json({
      success: true,
      message: 'Notification settings updated',
      data: { settings },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getUserNotifications,
  getUnreadCount,
  sendTestNotification,
  getNotificationSettings,
  updateNotificationSettings,
};
