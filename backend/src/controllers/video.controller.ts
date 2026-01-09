import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../config/socket';
import {
  createVideoRoom,
  joinVideoRoom,
  endVideoCall,
  getVideoSessionStats,
} from '../services/video.service';

export const startVideoCall = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Verify appointment
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
      throw new AppError('Appointment not found', 404);
    }

    // Verify user is doctor or patient for this appointment
    const isDoctor = appointment.doctor.userId === userId;
    const isPatient = appointment.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new AppError('Access denied', 403);
    }

    // Create video room
    const videoSession = await createVideoRoom(appointmentId);

    // Emit socket event
    const io = getIO();
    io.to(`user:${appointment.patient.userId}`).emit('video:call_started', {
      appointmentId,
      roomId: videoSession.roomId,
    });
    io.to(`user:${appointment.doctor.userId}`).emit('video:call_started', {
      appointmentId,
      roomId: videoSession.roomId,
    });

    res.json({
      success: true,
      message: 'Video call started',
      data: { videoSession },
    });
  } catch (error) {
    throw error;
  }
};

export const joinCall = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Determine if user is doctor or patient
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const isDoctor = appointment.doctor.userId === userId;
    const isPatient = appointment.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new AppError('Access denied', 403);
    }

    const role = isDoctor ? 'doctor' : 'patient';

    // Get video credentials
    const videoCredentials = await joinVideoRoom(appointmentId, userId!, role);

    res.json({
      success: true,
      data: videoCredentials,
    });
  } catch (error) {
    throw error;
  }
};

export const endCall = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user?.userId;

    // Verify user has access
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const isDoctor = appointment.doctor.userId === userId;
    const isPatient = appointment.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new AppError('Access denied', 403);
    }

    const videoSession = await endVideoCall(appointmentId);

    // Emit socket event
    const io = getIO();
    io.to(`user:${appointment.patient.userId}`).emit('video:call_ended', {
      appointmentId,
      duration: videoSession.durationMinutes,
    });
    io.to(`user:${appointment.doctor.userId}`).emit('video:call_ended', {
      appointmentId,
      duration: videoSession.durationMinutes,
    });

    res.json({
      success: true,
      message: 'Video call ended',
      data: { videoSession },
    });
  } catch (error) {
    throw error;
  }
};

export const getSessionInfo = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const videoSession = await getVideoSessionStats(appointmentId);

    res.json({
      success: true,
      data: { videoSession },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  startVideoCall,
  joinCall,
  endCall,
  getSessionInfo,
};
