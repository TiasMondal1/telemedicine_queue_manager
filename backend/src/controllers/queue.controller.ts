import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { QueueStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { AppError } from '../middleware/errorHandler';
import {
  getTodayQueue,
  checkInPatient,
  callNextPatient,
  startConsultation,
  completeConsultation,
  reorderQueue,
  markNoShow,
  getQueueStatistics,
} from '../services/queue.service';

export const getDoctorQueue = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userClinicId = req.user?.clinicId;

    // Verify access
    if (userRole === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!doctor || doctor.id !== doctorId) {
        throw new AppError('Access denied', 403);
      }
    }

    const queue = await getTodayQueue(doctorId, userClinicId!);
    const statistics = await getQueueStatistics(doctorId);

    res.json({
      success: true,
      data: { queue, statistics },
    });
  } catch (error) {
    throw error;
  }
};

export const getAllQueues = async (req: Request, res: Response) => {
  try {
    const userClinicId = req.user?.clinicId;

    // Get all doctors in clinic
    const doctors = await prisma.doctor.findMany({
      where: { clinicId: userClinicId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get queues for all doctors
    const queues = await Promise.all(
      doctors.map(async (doctor) => {
        const queue = await getTodayQueue(doctor.id, userClinicId!);
        const statistics = await getQueueStatistics(doctor.id);

        return {
          doctor: {
            id: doctor.id,
            name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
            specialization: doctor.specialization,
          },
          queue,
          statistics,
        };
      })
    );

    res.json({
      success: true,
      data: { queues },
    });
  } catch (error) {
    throw error;
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body;

    const queueEntry = await checkInPatient(appointmentId);

    res.json({
      success: true,
      message: 'Patient checked in successfully',
      data: { queueEntry },
    });
  } catch (error) {
    throw error;
  }
};

export const callNext = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const userClinicId = req.user?.clinicId;

    const queueEntry = await callNextPatient(doctorId, userClinicId!);

    res.json({
      success: true,
      message: 'Next patient called',
      data: { queueEntry },
    });
  } catch (error) {
    throw error;
  }
};

export const startAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await startConsultation(appointmentId);

    res.json({
      success: true,
      message: 'Consultation started',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const completeAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { consultationNotes, prescriptions, diagnosis, followUpDate } = req.body;

    const appointment = await completeConsultation(appointmentId, {
      consultationNotes,
      prescriptions,
      diagnosis,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    });

    res.json({
      success: true,
      message: 'Consultation completed',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const reorder = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { queueEntryIds } = req.body;
    const userClinicId = req.user?.clinicId;

    await reorderQueue(doctorId, userClinicId!, queueEntryIds);

    res.json({
      success: true,
      message: 'Queue reordered successfully',
    });
  } catch (error) {
    throw error;
  }
};

export const markPatientNoShow = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await markNoShow(appointmentId);

    res.json({
      success: true,
      message: 'Patient marked as no-show',
      data: { appointment },
    });
  } catch (error) {
    throw error;
  }
};

export const getMyQueueStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Get patient's active appointments today
    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new AppError('Patient profile not found', 404);
    }

    const today = new Date();

    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        scheduledDate: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        queueEntry: true,
      },
    });

    if (!appointment) {
      return res.json({
        success: true,
        data: { inQueue: false },
      });
    }

    // Get position in queue
    const aheadInQueue = await prisma.queueEntry.count({
      where: {
        doctorId: appointment.doctorId,
        status: QueueStatus.WAITING,
        queuePosition: {
          lt: appointment.queueEntry?.queuePosition || 0,
        },
        createdAt: {
          gte: startOfDay(today),
        },
      },
    });

    res.json({
      success: true,
      data: {
        inQueue: true,
        appointment,
        position: appointment.queueEntry?.queuePosition,
        aheadOfYou: aheadInQueue,
        estimatedWaitMinutes: appointment.estimatedWaitMinutes,
      },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getDoctorQueue,
  getAllQueues,
  checkIn,
  callNext,
  startAppointment,
  completeAppointment,
  reorder,
  markPatientNoShow,
  getMyQueueStatus,
};
