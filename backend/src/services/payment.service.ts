import { prisma } from '../config/database';
import Stripe from 'stripe';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

// Pricing configuration (would come from database in production)
export const PRICING = {
  VIDEO: 5000, // $50.00 in cents
  IN_PERSON: 7500, // $75.00
  URGENT: 10000, // $100.00
};

export const createPaymentIntent = async (
  appointmentId: string,
  userId: string
) => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Verify user owns this appointment
  if (appointment.patient.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Check if already paid
  if (appointment.paymentStatus === 'PAID') {
    throw new Error('Appointment already paid');
  }

  // Get amount based on appointment type
  const amount = PRICING[appointment.appointmentType as keyof typeof PRICING];

  // Create or retrieve payment intent
  let paymentIntent;
  
  if (appointment.paymentIntentId) {
    // Retrieve existing payment intent
    paymentIntent = await stripe.paymentIntents.retrieve(appointment.paymentIntentId);
  } else {
    // Create new payment intent
    paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
      },
      description: `Appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
    });

    // Update appointment with payment intent ID
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentIntentId: paymentIntent.id,
      },
    });
  }

  return {
    clientSecret: paymentIntent.client_secret,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
};

export const handlePaymentSuccess = async (paymentIntentId: string) => {
  const appointment = await prisma.appointment.findFirst({
    where: { paymentIntentId },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found for payment intent');
  }

  // Update appointment payment status
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
    },
  });

  console.log(`✅ Payment successful for appointment ${appointment.id}`);
  
  return appointment;
};

export const processRefund = async (appointmentId: string, reason?: string) => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.paymentStatus !== 'PAID') {
    throw new Error('Appointment not paid');
  }

  if (!appointment.paymentIntentId) {
    throw new Error('No payment intent found');
  }

  // Create refund
  const refund = await stripe.refunds.create({
    payment_intent: appointment.paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      appointmentId: appointment.id,
      refundReason: reason || 'Customer requested',
    },
  });

  // Update appointment
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      paymentStatus: 'REFUNDED',
      refundedAt: new Date(),
    },
  });

  console.log(`💸 Refund processed for appointment ${appointmentId}`);
  
  return refund;
};

export const getPaymentHistory = async (userId: string, role: string) => {
  let payments;

  if (role === 'PATIENT') {
    // Get patient's payments
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    payments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        paymentStatus: {
          in: ['PAID', 'REFUNDED'],
        },
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  } else if (role === 'DOCTOR') {
    // Get doctor's earnings
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    payments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        paymentStatus: 'PAID',
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  } else {
    // Admin/Receptionist - get all clinic payments
    payments = await prisma.appointment.findMany({
      where: {
        paymentStatus: {
          in: ['PAID', 'REFUNDED'],
        },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        doctor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }

  return payments.map((payment) => ({
    id: payment.id,
    amount: PRICING[payment.appointmentType as keyof typeof PRICING] / 100,
    currency: 'USD',
    status: payment.paymentStatus,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    appointmentType: payment.appointmentType,
    scheduledDate: payment.scheduledDate,
    patientName: role === 'DOCTOR' 
      ? `${payment.patient.user.firstName} ${payment.patient.user.lastName}`
      : undefined,
    doctorName: role === 'PATIENT'
      ? `Dr. ${payment.doctor.user.firstName} ${payment.doctor.user.lastName}`
      : undefined,
  }));
};

export const generateInvoice = async (appointmentId: string): Promise<Buffer> => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
      clinic: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.paymentStatus !== 'PAID') {
    throw new Error('Invoice only available for paid appointments');
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const amount = PRICING[appointment.appointmentType as keyof typeof PRICING];

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Clinic Info
      doc.fontSize(12).text(appointment.clinic.name, { align: 'left' });
      doc.fontSize(10).text('Telemedicine Services', { align: 'left' });
      doc.moveDown();

      // Invoice Details
      doc.fontSize(10);
      doc.text(`Invoice #: INV-${appointment.id.slice(-8).toUpperCase()}`);
      doc.text(`Date: ${format(appointment.paidAt!, 'MMMM dd, yyyy')}`);
      doc.text(`Payment Status: ${appointment.paymentStatus}`);
      doc.moveDown();

      // Bill To
      doc.fontSize(12).text('Bill To:', { underline: true });
      doc.fontSize(10);
      doc.text(`${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`);
      doc.text(`Email: ${appointment.patient.user.email}`);
      doc.text(`Phone: ${appointment.patient.user.phone}`);
      doc.moveDown(2);

      // Service Details
      doc.fontSize(12).text('Service Details:', { underline: true });
      doc.moveDown(0.5);

      // Table Header
      doc.fontSize(10);
      const tableTop = doc.y;
      doc.text('Description', 50, tableTop);
      doc.text('Date', 250, tableTop);
      doc.text('Amount', 450, tableTop, { align: 'right' });
      
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();

      // Table Row
      const rowTop = tableTop + 25;
      doc.text(
        `${appointment.appointmentType} Consultation with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
        50,
        rowTop,
        { width: 180 }
      );
      doc.text(
        format(new Date(appointment.scheduledDate), 'MMM dd, yyyy'),
        250,
        rowTop
      );
      doc.text(`$${(amount / 100).toFixed(2)}`, 450, rowTop, { align: 'right' });

      doc.moveDown(3);

      // Total
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text('Total Amount:', 350, doc.y);
      doc.text(`$${(amount / 100).toFixed(2)}`, 450, doc.y, { align: 'right' });

      doc.moveDown(2);

      // Footer
      doc.fontSize(10);
      doc.text('Thank you for choosing our services!', { align: 'center' });
      doc.moveDown();
      doc.fontSize(8);
      doc.text('This is a computer-generated invoice.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const getPaymentStats = async (clinicId: string, startDate: Date, endDate: Date) => {
  const payments = await prisma.appointment.findMany({
    where: {
      clinicId,
      paymentStatus: 'PAID',
      paidAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRevenue = payments.reduce((sum, payment) => {
    return sum + PRICING[payment.appointmentType as keyof typeof PRICING];
  }, 0);

  const refunds = await prisma.appointment.findMany({
    where: {
      clinicId,
      paymentStatus: 'REFUNDED',
      refundedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRefunded = refunds.reduce((sum, refund) => {
    return sum + PRICING[refund.appointmentType as keyof typeof PRICING];
  }, 0);

  return {
    totalRevenue: totalRevenue / 100,
    totalRefunded: totalRefunded / 100,
    netRevenue: (totalRevenue - totalRefunded) / 100,
    totalTransactions: payments.length,
    totalRefunds: refunds.length,
    averageTransactionValue: payments.length > 0 ? totalRevenue / payments.length / 100 : 0,
  };
};

export default {
  createPaymentIntent,
  handlePaymentSuccess,
  processRefund,
  getPaymentHistory,
  generateInvoice,
  getPaymentStats,
};
