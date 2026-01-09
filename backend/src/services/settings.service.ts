import { prisma } from '../config/database';

export const getClinicSettings = async (clinicId: string) => {
  let settings = await prisma.clinicSettings.findUnique({
    where: { clinicId },
  });

  if (!settings) {
    // Create default settings if none exist
    settings = await prisma.clinicSettings.create({
      data: {
        clinicId,
        autoReminderEnabled: true,
        reminderHoursBefore24h: true,
        reminderHoursBefore1h: true,
        enableSmsNotifications: false,
        enableEmailNotifications: true,
        enablePushNotifications: true,
        enableWhatsappNotifications: false,
      },
    });
  }

  return settings;
};

export const updateClinicSettings = async (
  clinicId: string,
  data: {
    autoReminderEnabled?: boolean;
    reminderHoursBefore24h?: boolean;
    reminderHoursBefore1h?: boolean;
    enableSmsNotifications?: boolean;
    enableEmailNotifications?: boolean;
    enablePushNotifications?: boolean;
    enableWhatsappNotifications?: boolean;
  }
) => {
  const settings = await prisma.clinicSettings.upsert({
    where: { clinicId },
    update: data,
    create: {
      clinicId,
      autoReminderEnabled: data.autoReminderEnabled ?? true,
      reminderHoursBefore24h: data.reminderHoursBefore24h ?? true,
      reminderHoursBefore1h: data.reminderHoursBefore1h ?? true,
      enableSmsNotifications: data.enableSmsNotifications ?? false,
      enableEmailNotifications: data.enableEmailNotifications ?? true,
      enablePushNotifications: data.enablePushNotifications ?? true,
      enableWhatsappNotifications: data.enableWhatsappNotifications ?? false,
    },
  });

  return settings;
};

export default {
  getClinicSettings,
  updateClinicSettings,
};
