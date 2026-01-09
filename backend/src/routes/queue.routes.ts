import { Router } from 'express';
import { z } from 'zod';
import * as queueController from '../controllers/queue.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

// Validation schemas
const checkInSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

const completeAppointmentSchema = z.object({
  consultationNotes: z.string().optional(),
  prescriptions: z.array(z.object({
    medicine: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })).optional(),
  diagnosis: z.string().optional(),
  followUpDate: z.string().optional(),
});

const reorderSchema = z.object({
  queueEntryIds: z.array(z.string().uuid()),
});

const doctorIdParamSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
});

const appointmentIdParamSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

// Patient routes
router.get(
  '/my-status',
  authenticate,
  authorize(Role.PATIENT),
  queueController.getMyQueueStatus
);

// Doctor/Staff routes
router.get(
  '/all',
  authenticate,
  authorize(Role.RECEPTIONIST, Role.ADMIN),
  queueController.getAllQueues
);

router.get(
  '/doctor/:doctorId',
  authenticate,
  authorize(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN),
  validateParams(doctorIdParamSchema),
  queueController.getDoctorQueue
);

router.post(
  '/check-in',
  authenticate,
  authorize(Role.RECEPTIONIST, Role.ADMIN),
  validateBody(checkInSchema),
  queueController.checkIn
);

router.post(
  '/doctor/:doctorId/call-next',
  authenticate,
  authorize(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN),
  validateParams(doctorIdParamSchema),
  queueController.callNext
);

router.post(
  '/appointment/:appointmentId/start',
  authenticate,
  authorize(Role.DOCTOR),
  validateParams(appointmentIdParamSchema),
  queueController.startAppointment
);

router.post(
  '/appointment/:appointmentId/complete',
  authenticate,
  authorize(Role.DOCTOR),
  validateParams(appointmentIdParamSchema),
  validateBody(completeAppointmentSchema),
  queueController.completeAppointment
);

router.put(
  '/doctor/:doctorId/reorder',
  authenticate,
  authorize(Role.RECEPTIONIST, Role.ADMIN),
  validateParams(doctorIdParamSchema),
  validateBody(reorderSchema),
  queueController.reorder
);

router.put(
  '/appointment/:appointmentId/no-show',
  authenticate,
  authorize(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN),
  validateParams(appointmentIdParamSchema),
  queueController.markPatientNoShow
);

export default router;
