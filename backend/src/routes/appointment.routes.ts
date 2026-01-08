import { Router } from 'express';
import { z } from 'zod';
import * as appointmentController from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { Role, AppointmentType, AppointmentStatus } from '@prisma/client';

const router = Router();

// Validation schemas
const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  scheduledDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  appointmentType: z.enum([AppointmentType.IN_PERSON, AppointmentType.VIDEO]),
  isEmergency: z.boolean().optional(),
});

const availableSlotsSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

const rescheduleAppointmentSchema = z.object({
  newDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  newTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
});

const updateStatusSchema = z.object({
  status: z.enum([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ]),
});

const consultationNotesSchema = z.object({
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

const myAppointmentsQuerySchema = z.object({
  status: z.enum([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const doctorAppointmentsQuerySchema = z.object({
  date: z.string().optional(),
  status: z.enum([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.WAITING,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ]).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
});

// Public/Patient routes
router.post(
  '/',
  authenticate,
  authorize(Role.PATIENT),
  validateBody(createAppointmentSchema),
  appointmentController.createAppointment
);

router.get(
  '/available-slots',
  authenticate,
  validateQuery(availableSlotsSchema),
  appointmentController.getAvailableSlotsForDoctor
);

router.get(
  '/my-appointments',
  authenticate,
  authorize(Role.PATIENT),
  validateQuery(myAppointmentsQuerySchema),
  appointmentController.getMyAppointments
);

router.get(
  '/doctor-appointments',
  authenticate,
  authorize(Role.DOCTOR),
  validateQuery(doctorAppointmentsQuerySchema),
  appointmentController.getDoctorAppointments
);

router.get(
  '/:id',
  authenticate,
  validateParams(uuidParamSchema),
  appointmentController.getAppointmentById
);

router.put(
  '/:id/cancel',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(cancelAppointmentSchema),
  appointmentController.cancelAppointment
);

router.put(
  '/:id/reschedule',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(rescheduleAppointmentSchema),
  appointmentController.rescheduleAppointment
);

// Doctor/Staff routes
router.put(
  '/:id/status',
  authenticate,
  authorize(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN),
  validateParams(uuidParamSchema),
  validateBody(updateStatusSchema),
  appointmentController.updateAppointmentStatus
);

router.put(
  '/:id/notes',
  authenticate,
  authorize(Role.DOCTOR),
  validateParams(uuidParamSchema),
  validateBody(consultationNotesSchema),
  appointmentController.addConsultationNotes
);

export default router;
