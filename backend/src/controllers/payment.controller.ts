import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { AppError } from '../middleware/errorHandler';
import Stripe from 'stripe';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { appointmentId } = req.body;

    const paymentIntent = await paymentService.createPaymentIntent(appointmentId, userId!);

    res.json({
      success: true,
      data: paymentIntent,
    });
  } catch (error) {
    throw error;
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!STRIPE_WEBHOOK_SECRET) {
    throw new AppError('Stripe webhook secret not configured', 500);
  }

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await paymentService.handlePaymentSuccess(paymentIntent.id);
      console.log(`✅ PaymentIntent ${paymentIntent.id} succeeded`);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ PaymentIntent ${failedPayment.id} failed`);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    const payments = await paymentService.getPaymentHistory(userId!, role!);

    res.json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    throw error;
  }
};

export const processRefund = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const refund = await paymentService.processRefund(appointmentId, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { refund },
    });
  } catch (error) {
    throw error;
  }
};

export const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const invoicePDF = await paymentService.generateInvoice(appointmentId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${appointmentId}.pdf"`
    );
    res.send(invoicePDF);
  } catch (error) {
    throw error;
  }
};

export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const stats = await paymentService.getPaymentStats(
      clinicId!,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
};

export default {
  createPaymentIntent,
  handleWebhook,
  getPaymentHistory,
  processRefund,
  downloadInvoice,
  getPaymentStats,
};
