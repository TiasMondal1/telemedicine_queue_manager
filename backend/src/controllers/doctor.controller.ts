import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const { clinicId, specialization, isAcceptingAppointments } = req.query;

    const whereClause: any = {};

    if (clinicId) {
      whereClause.clinicId = clinicId;
    }

    if (specialization) {
      whereClause.specialization = {
        contains: specialization as string,
        mode: 'insensitive',
      };
    }

    if (isAcceptingAppointments === 'true') {
      whereClause.isAcceptingAppointments = true;
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
    });

    res.json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    throw error;
  }
};

export const getDoctorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
        schedules: {
          where: { isActive: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        blockedDates: {
          where: {
            date: {
              gte: new Date(),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      data: { doctor },
    });
  } catch (error) {
    throw error;
  }
};

export const getDoctorSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
        blockedDates: {
          where: {
            date: {
              gte: new Date(),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!doctor) {
      throw new AppError('Doctor profile not found', 404);
    }

    res.json({
      success: true,
      data: { 
        schedules: doctor.schedules,
        blockedDates: doctor.blockedDates,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const updateDoctorSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { schedules } = req.body;

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError('Doctor profile not found', 404);
    }

    // Delete existing schedules
    await prisma.schedule.deleteMany({
      where: { doctorId: doctor.id },
    });

    // Create new schedules
    const createdSchedules = await prisma.schedule.createMany({
      data: schedules.map((schedule: any) => ({
        ...schedule,
        doctorId: doctor.id,
      })),
    });

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { count: createdSchedules.count },
    });
  } catch (error) {
    throw error;
  }
};

export const addBlockedDate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { date, reason } = req.body;

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError('Doctor profile not found', 404);
    }

    const blockedDate = await prisma.blockedDate.create({
      data: {
        doctorId: doctor.id,
        date: new Date(date),
        reason,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Date blocked successfully',
      data: { blockedDate },
    });
  } catch (error) {
    throw error;
  }
};

export const removeBlockedDate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError('Doctor profile not found', 404);
    }

    await prisma.blockedDate.delete({
      where: {
        id,
        doctorId: doctor.id,
      },
    });

    res.json({
      success: true,
      message: 'Blocked date removed successfully',
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getDoctors,
  getDoctorById,
  getDoctorSchedule,
  updateDoctorSchedule,
  addBlockedDate,
  removeBlockedDate,
};
