import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

const updateSettingsSchema = z.object({
  autoReminderEnabled: z.boolean().optional(),
  reminderHoursBefore24h: z.boolean().optional(),
  reminderHoursBefore1h: z.boolean().optional(),
  enableSmsNotifications: z.boolean().optional(),
  enableEmailNotifications: z.boolean().optional(),
  enablePushNotifications: z.boolean().optional(),
  enableWhatsappNotifications: z.boolean().optional(),
});

router.get('/', settingsController.getSettings);
router.put('/', validateBody(updateSettingsSchema), settingsController.updateSettings);

export default router;
