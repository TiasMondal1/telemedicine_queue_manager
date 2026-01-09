import { prisma } from '../config/database';
import { QueueStatus, AppointmentStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { getIO } from '../config/socket';
import { AppError } from '../middleware/errorHandler';

export const getTodayQueue = async (doctorId: string, clinicId: string) => {
  const today = new Date();

  const queueEntries = await prisma.queueEntry.findMany({
    where: {
      doctorId,
      clinicId,
      createdAt: {
        gte: startOfDay(today),
        lte: endOfDay(today),
      },
      status: {
        not: QueueStatus.COMPLETED,
      },
    },
    include: {
      appointment: {
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
        },
      },
    },
    orderBy: {
      queuePosition: 'asc',
    },
  });

  return queueEntries;
};

export const checkInPatient = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: true,
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    throw new AppError('Appointment is not in scheduled status', 400);
  }

  // Update appointment status
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.WAITING },
  });

  // Create or update queue entry
  const queueEntry = await prisma.queueEntry.upsert({
    where: { appointmentId },
    update: {
      status: QueueStatus.WAITING,
      arrivalTime: new Date(),
    },
    create: {
      appointmentId,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
      queuePosition: appointment.queueNumber!,
      status: QueueStatus.WAITING,
      arrivalTime: new Date(),
    },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  // Emit real-time update
  const io = getIO();
  io.to(`clinic:${appointment.clinicId}`).emit('queue:updated', {
    doctorId: appointment.doctorId,
  });

  io.to(`user:${appointment.patient.userId}`).emit('queue:checked_in', {
    queuePosition: queueEntry.queuePosition,
    estimatedWait: appointment.estimatedWaitMinutes,
  });

  return queueEntry;
};

export const callNextPatient = async (doctorId: string, clinicId: string) => {
  // Get next waiting patient
  const nextEntry = await prisma.queueEntry.findFirst({
    where: {
      doctorId,
      clinicId,
      status: QueueStatus.WAITING,
      createdAt: {
        gte: startOfDay(new Date()),
      },
    },
    orderBy: {
      queuePosition: 'asc',
    },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!nextEntry) {
    throw new AppError('No patients in queue', 404);
  }

  // Update queue entry
  const updatedEntry = await prisma.queueEntry.update({
    where: { id: nextEntry.id },
    data: {
      status: QueueStatus.CALLED,
      calledAt: new Date(),
    },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  // Emit real-time notifications
  const io = getIO();
  
  // Notify the patient
  io.to(`user:${updatedEntry.appointment.patient.userId}`).emit('queue:your_turn', {
    appointmentId: updatedEntry.appointmentId,
    message: "It's your turn! Please proceed to the consultation room.",
  });

  // Notify clinic/doctor
  io.to(`clinic:${clinicId}`).emit('queue:patient_called', {
    doctorId,
    patientName: `${updatedEntry.appointment.patient.user.firstName} ${updatedEntry.appointment.patient.user.lastName}`,
    queueNumber: updatedEntry.queuePosition,
  });

  return updatedEntry;
};

export const startConsultation = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Update appointment
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.IN_PROGRESS,
      actualStartTime: new Date(),
    },
  });

  // Update queue entry
  await prisma.queueEntry.updateMany({
    where: { appointmentId },
    data: {
      status: QueueStatus.IN_CONSULTATION,
    },
  });

  // Emit real-time update
  const io = getIO();
  io.to(`clinic:${appointment.clinicId}`).emit('queue:consultation_started', {
    doctorId: appointment.doctorId,
    appointmentId,
  });

  io.to(`user:${appointment.patient.userId}`).emit('appointment:status_changed', {
    appointmentId,
    status: AppointmentStatus.IN_PROGRESS,
  });

  return updatedAppointment;
};

export const completeConsultation = async (
  appointmentId: string,
  consultationData: {
    consultationNotes?: string;
    prescriptions?: any[];
    diagnosis?: string;
    followUpDate?: Date;
  }
) => {
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
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Update appointment
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.COMPLETED,
      actualEndTime: new Date(),
      ...consultationData,
    },
  });

  // Update queue entry
  await prisma.queueEntry.updateMany({
    where: { appointmentId },
    data: {
      status: QueueStatus.COMPLETED,
    },
  });

  // Recalculate wait times for remaining patients
  await recalculateWaitTimes(appointment.doctorId);

  // Emit real-time updates
  const io = getIO();
  io.to(`clinic:${appointment.clinicId}`).emit('queue:updated', {
    doctorId: appointment.doctorId,
  });

  io.to(`user:${appointment.patient.userId}`).emit('appointment:completed', {
    appointmentId,
  });

  return updatedAppointment;
};

export const reorderQueue = async (
  doctorId: string,
  clinicId: string,
  reorderedIds: string[]
) => {
  // Update queue positions
  for (let i = 0; i < reorderedIds.length; i++) {
    await prisma.queueEntry.update({
      where: { id: reorderedIds[i] },
      data: { queuePosition: i + 1 },
    });
  }

  // Recalculate wait times
  await recalculateWaitTimes(doctorId);

  // Emit real-time update
  const io = getIO();
  io.to(`clinic:${clinicId}`).emit('queue:reordered', {
    doctorId,
  });

  return true;
};

export const recalculateWaitTimes = async (doctorId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { slotDurationMinutes: true },
  });

  if (!doctor) {
    return;
  }

  const waitingEntries = await prisma.queueEntry.findMany({
    where: {
      doctorId,
      status: QueueStatus.WAITING,
      createdAt: {
        gte: startOfDay(new Date()),
      },
    },
    orderBy: {
      queuePosition: 'asc',
    },
    include: {
      appointment: true,
    },
  });

  // Update estimated wait times
  for (let i = 0; i < waitingEntries.length; i++) {
    const estimatedWait = i * doctor.slotDurationMinutes;
    
    await prisma.appointment.update({
      where: { id: waitingEntries[i].appointmentId },
      data: { estimatedWaitMinutes: estimatedWait },
    });

    // Notify patient of updated wait time
    const io = getIO();
    const appointment = waitingEntries[i].appointment;
    
    if (appointment.patient) {
      const patient = await prisma.patient.findUnique({
        where: { id: appointment.patientId },
        select: { userId: true },
      });

      if (patient) {
        io.to(`user:${patient.userId}`).emit('queue:wait_time_updated', {
          appointmentId: appointment.id,
          estimatedWait,
          position: i + 1,
        });
      }
    }
  }
};

export const markNoShow = async (appointmentId: string) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.NO_SHOW,
    },
  });

  await prisma.queueEntry.updateMany({
    where: { appointmentId },
    data: {
      status: QueueStatus.COMPLETED,
    },
  });

  // Recalculate wait times
  await recalculateWaitTimes(appointment.doctorId);

  const io = getIO();
  io.to(`clinic:${appointment.clinicId}`).emit('queue:updated', {
    doctorId: appointment.doctorId,
  });

  return appointment;
};

export const getQueueStatistics = async (doctorId: string) => {
  const today = new Date();

  const [totalToday, waiting, inConsultation, completed] = await Promise.all([
    prisma.queueEntry.count({
      where: {
        doctorId,
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    }),
    prisma.queueEntry.count({
      where: {
        doctorId,
        status: QueueStatus.WAITING,
        createdAt: {
          gte: startOfDay(today),
        },
      },
    }),
    prisma.queueEntry.count({
      where: {
        doctorId,
        status: QueueStatus.IN_CONSULTATION,
        createdAt: {
          gte: startOfDay(today),
        },
      },
    }),
    prisma.queueEntry.count({
      where: {
        doctorId,
        status: QueueStatus.COMPLETED,
        createdAt: {
          gte: startOfDay(today),
        },
      },
    }),
  ]);

  return {
    totalToday,
    waiting,
    inConsultation,
    completed,
  };
};
