import { Router } from 'express';
import { z } from 'zod';
import * as doctorController from '../controllers/doctor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

// Validation schemas
const updateScheduleSchema = z.object({
  schedules: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    breakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    breakEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    isActive: z.boolean().default(true),
  })),
});

const blockedDateSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  reason: z.string().optional(),
});

const doctorsQuerySchema = z.object({
  clinicId: z.string().uuid().optional(),
  specialization: z.string().optional(),
  isAcceptingAppointments: z.enum(['true', 'false']).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

// Public routes
router.get(
  '/',
  authenticate,
  validateQuery(doctorsQuerySchema),
  doctorController.getDoctors
);

router.get(
  '/:id',
  authenticate,
  validateParams(uuidParamSchema),
  doctorController.getDoctorById
);

// Doctor routes
router.get(
  '/me/schedule',
  authenticate,
  authorize(Role.DOCTOR),
  doctorController.getDoctorSchedule
);

router.put(
  '/me/schedule',
  authenticate,
  authorize(Role.DOCTOR),
  validateBody(updateScheduleSchema),
  doctorController.updateDoctorSchedule
);

router.post(
  '/me/blocked-dates',
  authenticate,
  authorize(Role.DOCTOR),
  validateBody(blockedDateSchema),
  doctorController.addBlockedDate
);

router.delete(
  '/me/blocked-dates/:id',
  authenticate,
  authorize(Role.DOCTOR),
  validateParams(uuidParamSchema),
  doctorController.removeBlockedDate
);

export default router;
