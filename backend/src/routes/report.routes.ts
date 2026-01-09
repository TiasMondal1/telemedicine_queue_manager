import { Router } from 'express';
import { z } from 'zod';
import * as reportController from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

// All report routes require authentication and admin/receptionist role
router.use(authenticate);
router.use(authorize(Role.ADMIN, Role.RECEPTIONIST));

// Validation schemas
const reportQuerySchema = z.object({
  reportType: z.enum(['appointment', 'queue', 'doctor', 'financial']),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['json', 'pdf', 'csv']).optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// General report endpoint with format support
router.get(
  '/generate',
  validateQuery(reportQuerySchema),
  reportController.generateReport
);

// Specific report endpoints (JSON only)
router.get(
  '/appointments',
  validateQuery(dateRangeSchema),
  reportController.getAppointmentReport
);

router.get(
  '/queue',
  validateQuery(dateRangeSchema),
  reportController.getQueueReport
);

router.get(
  '/doctors',
  validateQuery(dateRangeSchema),
  reportController.getDoctorReport
);

router.get(
  '/financial',
  authorize(Role.ADMIN),
  validateQuery(dateRangeSchema),
  reportController.getFinancialReport
);

export default router;
