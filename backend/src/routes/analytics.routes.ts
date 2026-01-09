import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Dashboard stats (all roles)
router.get('/dashboard', analyticsController.getDashboardStats);

// Appointment stats (admin, receptionist, doctor)
router.get(
  '/appointments',
  authorize(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  analyticsController.getAppointmentStats
);

// Appointment type distribution (admin, receptionist)
router.get(
  '/appointments/distribution',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  analyticsController.getAppointmentTypeDistribution
);

// Queue performance (admin, receptionist, doctor)
router.get(
  '/queue/performance',
  authorize(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  analyticsController.getQueuePerformance
);

// Doctor performance (admin, receptionist)
router.get(
  '/doctors/performance',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  analyticsController.getDoctorPerformance
);

// Recent activity (all roles)
router.get('/activity', analyticsController.getRecentActivity);

// Patient stats (patient only)
router.get(
  '/patient/stats',
  authorize(Role.PATIENT),
  analyticsController.getPatientStats
);

export default router;
