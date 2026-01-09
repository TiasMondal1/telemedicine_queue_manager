import { Router } from 'express';
import { z } from 'zod';
import * as prescriptionController from '../controllers/prescription.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

const createPrescriptionSchema = z.object({
  appointmentId: z.string(),
  medications: z.string().min(1),
  instructions: z.string().optional(),
  diagnosis: z.string().optional(),
  validUntil: z.string().optional(),
});

// Create prescription (doctors only)
router.post(
  '/',
  authorize(Role.DOCTOR),
  validateBody(createPrescriptionSchema),
  prescriptionController.createPrescription
);

// Get prescriptions (patient sees theirs, doctor sees their created ones)
router.get(
  '/my-prescriptions',
  authorize(Role.PATIENT, Role.DOCTOR),
  prescriptionController.getMyPrescriptions
);

export default router;
