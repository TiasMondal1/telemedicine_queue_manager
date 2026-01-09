import { Router } from 'express';
import { z } from 'zod';
import * as videoController from '../controllers/video.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';

const router = Router();

// Validation schemas
const startCallSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

const appointmentIdParamSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

// Video routes
router.post(
  '/start',
  authenticate,
  validateBody(startCallSchema),
  videoController.startVideoCall
);

router.get(
  '/join/:appointmentId',
  authenticate,
  validateParams(appointmentIdParamSchema),
  videoController.joinCall
);

router.post(
  '/end/:appointmentId',
  authenticate,
  validateParams(appointmentIdParamSchema),
  videoController.endCall
);

router.get(
  '/session/:appointmentId',
  authenticate,
  validateParams(appointmentIdParamSchema),
  videoController.getSessionInfo
);

export default router;
