import { prisma } from '../config/database';
import { AppointmentStatus, AppointmentType, QueueStatus } from '@prisma/client';
import { addMinutes, format, parse, startOfDay, endOfDay, isBefore, isAfter, parseISO } from 'date-fns';
import { AppError } from '../middleware/errorHandler';

export const getAvailableSlots = async (
  doctorId: string,
  date: Date
): Promise<string[]> => {
  const dayOfWeek = date.getDay();

  // Get doctor's schedule for this day
  const schedule = await prisma.schedule.findFirst({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true,
    },
  });

  if (!schedule) {
    return []; // Doctor not available on this day
  }

  // Check if date is blocked
  const blockedDate = await prisma.blockedDate.findFirst({
    where: {
      doctorId,
      date: startOfDay(date),
    },
  });

  if (blockedDate) {
    return []; // Date is blocked
  }

  // Get doctor details for slot duration
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { slotDurationMinutes: true, maxPatientsPerDay: true },
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Generate all possible slots
  const slots: string[] = [];
  const startTime = parse(schedule.startTime, 'HH:mm', date);
  const endTime = parse(schedule.endTime, 'HH:mm', date);
  const breakStart = schedule.breakStartTime
    ? parse(schedule.breakStartTime, 'HH:mm', date)
    : null;
  const breakEnd = schedule.breakEndTime
    ? parse(schedule.breakEndTime, 'HH:mm', date)
    : null;

  let currentSlot = startTime;

  while (isBefore(currentSlot, endTime)) {
    const slotTime = format(currentSlot, 'HH:mm');

    // Skip break time
    if (
      breakStart &&
      breakEnd &&
      !isBefore(currentSlot, breakStart) &&
      isBefore(currentSlot, breakEnd)
    ) {
      currentSlot = addMinutes(currentSlot, doctor.slotDurationMinutes);
      continue;
    }

    slots.push(slotTime);
    currentSlot = addMinutes(currentSlot, doctor.slotDurationMinutes);
  }

  // Get existing appointments for this date
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledDate: startOfDay(date),
      status: {
        notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
    },
    select: {
      scheduledTime: true,
    },
  });

  // Filter out booked slots
  const bookedTimes = existingAppointments.map((apt) =>
    format(apt.scheduledTime, 'HH:mm')
  );

  const availableSlots = slots.filter((slot) => !bookedTimes.includes(slot));

  return availableSlots;
};

export const generateQueueNumber = async (
  doctorId: string,
  date: Date
): Promise<number> => {
  const existingAppointments = await prisma.appointment.count({
    where: {
      doctorId,
      scheduledDate: startOfDay(date),
      status: {
        notIn: [AppointmentStatus.CANCELLED],
      },
    },
  });

  return existingAppointments + 1;
};

export const calculateEstimatedWaitTime = async (
  doctorId: string,
  queueNumber: number
): Promise<number> => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { slotDurationMinutes: true },
  });

  if (!doctor) {
    return 0;
  }

  // Simple estimation: queue position * slot duration
  // In Phase 9, we'll replace this with ML-based prediction
  return (queueNumber - 1) * doctor.slotDurationMinutes;
};

export const validateAppointmentBooking = async (
  doctorId: string,
  patientId: string,
  scheduledDate: Date,
  scheduledTime: string
): Promise<void> => {
  // Check if doctor exists and is accepting appointments
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  if (!doctor.isAcceptingAppointments) {
    throw new AppError('Doctor is not accepting appointments', 400);
  }

  if (!doctor.user.isActive) {
    throw new AppError('Doctor account is inactive', 400);
  }

  // Check if patient has already booked for this slot
  const existingPatientAppointment = await prisma.appointment.findFirst({
    where: {
      patientId,
      scheduledDate: startOfDay(scheduledDate),
      status: {
        notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
    },
  });

  if (existingPatientAppointment) {
    throw new AppError('You already have an appointment on this date', 400);
  }

  // Check if slot is still available
  const timeDate = parse(scheduledTime, 'HH:mm', scheduledDate);
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      doctorId,
      scheduledDate: startOfDay(scheduledDate),
      scheduledTime: timeDate,
      status: {
        notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
    },
  });

  if (conflictingAppointment) {
    throw new AppError('This slot is already booked', 400);
  }

  // Check if booking is for past date/time
  const now = new Date();
  const appointmentDateTime = parse(scheduledTime, 'HH:mm', scheduledDate);

  if (isBefore(appointmentDateTime, now)) {
    throw new AppError('Cannot book appointments in the past', 400);
  }
};

export const canCancelAppointment = async (
  appointmentId: string,
  userId: string
): Promise<{ canCancel: boolean; reason?: string }> => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      clinic: { include: { settings: true } },
    },
  });

  if (!appointment) {
    return { canCancel: false, reason: 'Appointment not found' };
  }

  // Check if user has permission to cancel
  const patient = appointment.patient;
  if (patient.user.id !== userId) {
    // Check if user is admin or receptionist from same clinic
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    if (
      !user ||
      (user.role !== 'ADMIN' && user.role !== 'RECEPTIONIST') ||
      user.clinicId !== appointment.clinicId
    ) {
      return { canCancel: false, reason: 'Unauthorized to cancel this appointment' };
    }
  }

  // Check if appointment is already completed or cancelled
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    return { canCancel: false, reason: 'Appointment is already completed or cancelled' };
  }

  // Check cancellation window
  const cancellationWindowHours =
    appointment.clinic.settings?.cancellationWindowHours || 24;
  const appointmentDateTime = parse(
    format(appointment.scheduledTime, 'HH:mm'),
    'HH:mm',
    appointment.scheduledDate
  );
  const now = new Date();
  const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursDifference < cancellationWindowHours) {
    return {
      canCancel: false,
      reason: `Appointments must be cancelled at least ${cancellationWindowHours} hours in advance`,
    };
  }

  return { canCancel: true };
};
