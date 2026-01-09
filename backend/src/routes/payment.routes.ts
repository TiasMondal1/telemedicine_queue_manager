import { Router } from 'express';
import { z } from 'zod';
import * as paymentController from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { Role } from '@prisma/client';
import express from 'express';

const router = Router();

// Webhook endpoint (no auth, raw body needed)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// All other routes require authentication
router.use(authenticate);

// Validation schemas
const createPaymentIntentSchema = z.object({
  appointmentId: z.string(),
});

const refundSchema = z.object({
  reason: z.string().optional(),
});

const statsQuerySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// Create payment intent (patient only)
router.post(
  '/create-intent',
  authorize(Role.PATIENT),
  validateBody(createPaymentIntentSchema),
  paymentController.createPaymentIntent
);

// Get payment history (all authenticated users)
router.get('/history', paymentController.getPaymentHistory);

// Process refund (admin only)
router.post(
  '/refund/:appointmentId',
  authorize(Role.ADMIN),
  validateBody(refundSchema),
  paymentController.processRefund
);

// Download invoice
router.get('/invoice/:appointmentId', paymentController.downloadInvoice);

// Get payment stats (admin only)
router.get(
  '/stats',
  authorize(Role.ADMIN),
  validateQuery(statsQuerySchema),
  paymentController.getPaymentStats
);

export default router;
