import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AppointmentStatus, AppointmentType, QueueStatus, PaymentStatus } from '@prisma/client';
import { startOfDay, parse, format } from 'date-fns';
import { getIO } from '../config/socket';
import {
  getAvailableSlots,
  generateQueueNumber,
  calculateEstimatedWaitTime,
  validateAppointmentBooking,
  canCancelAppointment,
} from '../services/appointment.service';

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { doctorId, scheduledDate, scheduledTime, appointmentType, isEmergency } = req.body;
    const userId = req.user?.userId;

    // Get patient ID from user
    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: { id: true, clinicId: true },
    });

    if (!patient) {
      throw new AppError('Patient profile not found', 404);
    }

    const date = new Date(scheduledDate);

    // Validate booking
    await validateAppointmentBooking(doctorId, patient.id, date, scheduledTime);

    // Get doctor for fee calculation
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { 
        consultationFee: true, 
        clinicId: true,
        videoConsultationEnabled: true 
      },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    // Verify same clinic
    if (doctor.clinicId !== patient.clinicId) {
      throw new AppError('Doctor and patient must be from the same clinic', 400);
    }

    // Check video consultation availability
    if (appointmentType === AppointmentType.VIDEO && !doctor.videoConsultationEnabled) {
      throw new AppError('This doctor does not offer video consultations', 400);
    }

    // Generate queue number
    const queueNumber = isEmergency ? 1 : await generateQueueNumber(doctorId, date);

    // If emergency, bump other queue numbers
    if (isEmergency) {
      await prisma.appointment.updateMany({
        where: {
          doctorId,
          scheduledDate: startOfDay(date),
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.WAITING],
          },
        },
        data: {
          queueNumber: {
            increment: 1,
          },
        },
      });
    }

    // Calculate estimated wait time
    const estimatedWaitMinutes = await calculateEstimatedWaitTime(doctorId, queueNumber);

    // Calculate payment amount
    const clinicSettings = await prisma.clinicSettings.findUnique({
      where: { clinicId: doctor.clinicId },
      select: { videoConsultationPriceMultiplier: true },
    });

    const multiplier =
      appointmentType === AppointmentType.VIDEO
        ? clinicSettings?.videoConsultationPriceMultiplier || 1.5
        : 1;

    const paymentAmount = doctor.consultationFee * multiplier;

    // Parse time
    const timeDate = parse(scheduledTime, 'HH:mm', date);

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        clinicId: doctor.clinicId,
        appointmentType,
        scheduledDate: startOfDay(date),
        scheduledTime: timeDate,
        status: AppointmentStatus.SCHEDULED,
        queueNumber,
        estimatedWaitMinutes,
        paymentAmount,
        paymentStatus: PaymentStatus.PENDING,
        isEmergency: isEmergency || false,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Emit socket event
    const io = getIO();
    io.to(`clinic:${doctor.clinicId}`).emit('appointment:created', {
      appointmentId: appointment.id,
      doctorId,
      patientName: `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: format(appointment.scheduledTime, 'HH:mm'),
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
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
        queueEntry: true,
        videoSession: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Check access permission
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    const hasAccess =
      appointment.patient.userId === userId ||
      appointment.doctor.userId === userId ||
      (user?.clinicId === appointment.clinicId &&
        ['ADMIN', 'RECEPTIONIST'].includes(user.role));

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const getMyAppointments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { status, startDate, endDate } = req.query;

    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new AppError('Patient profile not found', 404);
    }

    const whereClause: any = {
      patientId: patient.id,
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.scheduledDate = {};
      if (startDate) {
        whereClause.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.scheduledDate.lte = new Date(endDate as string);
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        queueEntry: true,
      },
      orderBy: [
        { scheduledDate: 'desc' },
        { scheduledTime: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: { appointments },
    });
  } catch (error) {
    throw error;
  }
};

export const getDoctorAppointments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { date, status } = req.query;

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError('Doctor profile not found', 404);
    }

    const whereClause: any = {
      doctorId: doctor.id,
    };

    if (date) {
      whereClause.scheduledDate = startOfDay(new Date(date as string));
    }

    if (status) {
      whereClause.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        queueEntry: true,
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { queueNumber: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: { appointments },
    });
  } catch (error) {
    throw error;
  }
};

export const getAvailableSlotsForDoctor = async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      throw new AppError('Doctor ID and date are required', 400);
    }

    const appointmentDate = new Date(date as string);
    const slots = await getAvailableSlots(doctorId as string, appointmentDate);

    res.json({
      success: true,
      data: { 
        date: appointmentDate,
        slots,
        count: slots.length,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;

    // Check if can cancel
    const { canCancel, reason: errorReason } = await canCancelAppointment(id, userId!);

    if (!canCancel) {
      throw new AppError(errorReason || 'Cannot cancel appointment', 400);
    }

    // Cancel appointment
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: userId,
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
      },
    });

    // Cancel queue entry if exists
    await prisma.queueEntry.updateMany({
      where: { appointmentId: id },
      data: { status: QueueStatus.COMPLETED },
    });

    // Emit socket event
    const io = getIO();
    io.to(`user:${appointment.patient.userId}`).emit('appointment:cancelled', {
      appointmentId: id,
    });
    io.to(`user:${appointment.doctor.userId}`).emit('appointment:cancelled', {
      appointmentId: id,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newDate, newTime } = req.body;
    const userId = req.user?.userId;

    // Check if can cancel (reschedule follows same rules)
    const { canCancel, reason: errorReason } = await canCancelAppointment(id, userId!);

    if (!canCancel) {
      throw new AppError(errorReason || 'Cannot reschedule appointment', 400);
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const date = new Date(newDate);

    // Validate new slot
    await validateAppointmentBooking(
      appointment.doctorId,
      appointment.patientId,
      date,
      newTime
    );

    // Generate new queue number
    const queueNumber = await generateQueueNumber(appointment.doctorId, date);
    const estimatedWaitMinutes = await calculateEstimatedWaitTime(
      appointment.doctorId,
      queueNumber
    );

    // Parse time
    const timeDate = parse(newTime, 'HH:mm', date);

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledDate: startOfDay(date),
        scheduledTime: timeDate,
        queueNumber,
        estimatedWaitMinutes,
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
      },
    });

    // Emit socket event
    const io = getIO();
    io.to(`user:${updatedAppointment.patient.userId}`).emit('appointment:rescheduled', {
      appointmentId: id,
      newDate: updatedAppointment.scheduledDate,
      newTime: format(updatedAppointment.scheduledTime, 'HH:mm'),
    });

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: { appointment: updatedAppointment },
    });
  } catch (error) {
    throw error;
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status,
        ...(status === AppointmentStatus.IN_PROGRESS && { actualStartTime: new Date() }),
        ...(status === AppointmentStatus.COMPLETED && { actualEndTime: new Date() }),
      },
      include: {
        patient: {
          include: { user: true },
        },
      },
    });

    // Emit socket event
    const io = getIO();
    io.to(`user:${appointment.patient.userId}`).emit('appointment:status_changed', {
      appointmentId: id,
      status,
    });

    res.json({
      success: true,
      message: 'Appointment status updated',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const addConsultationNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { consultationNotes, prescriptions, diagnosis, followUpDate } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        consultationNotes,
        prescriptions,
        diagnosis,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
    });

    res.json({
      success: true,
      message: 'Consultation notes added successfully',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  createAppointment,
  getAppointmentById,
  getMyAppointments,
  getDoctorAppointments,
  getAvailableSlotsForDoctor,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  addConsultationNotes,
};
