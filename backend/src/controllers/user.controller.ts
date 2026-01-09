import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { role, search } = req.query;

    const where: any = { clinicId };

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    throw error;
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const clinicId = req.user?.clinicId;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        clinicId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        patient: true,
        doctor: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const clinicId = req.user?.clinicId;
    const { firstName, lastName, phone, role } = req.body;

    // Check if user exists and belongs to the same clinic
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        clinicId,
      },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const clinicId = req.user?.clinicId;

    // Check if user exists and belongs to the same clinic
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        clinicId,
      },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // Don't allow deleting yourself
    if (userId === req.user?.userId) {
      throw new AppError('You cannot delete yourself', 400);
    }

    // Delete related records first (depending on role)
    if (existingUser.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId },
      });
      if (patient) {
        // Delete appointments
        await prisma.appointment.deleteMany({
          where: { patientId: patient.id },
        });
        // Delete queue entries
        await prisma.queueEntry.deleteMany({
          where: { patientId: patient.id },
        });
        // Delete patient record
        await prisma.patient.delete({
          where: { id: patient.id },
        });
      }
    } else if (existingUser.role === Role.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId },
      });
      if (doctor) {
        // Delete schedules
        await prisma.schedule.deleteMany({
          where: { doctorId: doctor.id },
        });
        // Delete blocked dates
        await prisma.blockedDate.deleteMany({
          where: { doctorId: doctor.id },
        });
        // Delete doctor record
        await prisma.doctor.delete({
          where: { id: doctor.id },
        });
      }
    }

    // Delete notifications
    await prisma.notification.deleteMany({
      where: { userId },
    });

    // Delete device tokens
    await prisma.deviceToken.deleteMany({
      where: { userId },
    });

    // Finally delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    throw error;
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        clinicId: clinicId!,
        isVerified: true, // Admin created users are auto-verified
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
      },
    });

    // Create role-specific records
    if (role === Role.PATIENT) {
      await prisma.patient.create({
        data: {
          userId: user.id,
          clinicId: clinicId!,
        },
      });
    } else if (role === Role.DOCTOR) {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          clinicId: clinicId!,
          specialization: 'General', // Default, can be updated later
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        patient: true,
        doctor: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  getUserProfile,
  updateUserProfile,
};
