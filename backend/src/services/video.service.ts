import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { nanoid } from 'nanoid';

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

// Token expires in 24 hours
const TOKEN_EXPIRATION_TIME = 24 * 60 * 60;

export const generateAgoraToken = (
  channelName: string,
  uid: number,
  role: 'host' | 'audience' = 'host'
): string => {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new AppError('Agora credentials not configured', 500);
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRATION_TIME;

  const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs
  );

  return token;
};

export const createVideoRoom = async (appointmentId: string) => {
  // Verify appointment exists and is for video
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

  if (appointment.appointmentType !== 'VIDEO') {
    throw new AppError('Appointment is not a video consultation', 400);
  }

  // Generate unique room ID
  const roomId = `room-${nanoid(12)}`;

  // Create video session
  const videoSession = await prisma.videoSession.create({
    data: {
      appointmentId,
      clinicId: appointment.clinicId,
      roomId,
      startTime: new Date(),
      participants: [],
    },
  });

  // Update appointment with room ID
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { videoRoomId: roomId },
  });

  return videoSession;
};

export const joinVideoRoom = async (
  appointmentId: string,
  userId: string,
  userRole: 'doctor' | 'patient'
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
      videoSession: true,
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Verify user has access
  if (userRole === 'patient' && appointment.patient.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  if (userRole === 'doctor' && appointment.doctor.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  let videoSession = appointment.videoSession;

  // Create session if it doesn't exist
  if (!videoSession) {
    videoSession = await createVideoRoom(appointmentId);
  }

  // Generate Agora token
  // Use userId hash as UID (Agora requires integer)
  const uid = Math.abs(hashCode(userId));
  const token = generateAgoraToken(
    videoSession.roomId,
    uid,
    userRole === 'doctor' ? 'host' : 'host' // Both can publish
  );

  // Update participants
  const participants = (videoSession.participants as any[]) || [];
  const existingParticipant = participants.find((p) => p.userId === userId);

  if (!existingParticipant) {
    participants.push({
      userId,
      role: userRole,
      joinedAt: new Date().toISOString(),
    });

    await prisma.videoSession.update({
      where: { id: videoSession.id },
      data: { participants },
    });
  }

  return {
    roomId: videoSession.roomId,
    token,
    appId: AGORA_APP_ID,
    uid,
    channelName: videoSession.roomId,
  };
};

export const endVideoCall = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      videoSession: true,
    },
  });

  if (!appointment || !appointment.videoSession) {
    throw new AppError('Video session not found', 404);
  }

  const startTime = new Date(appointment.videoSession.startTime);
  const endTime = new Date();
  const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

  // Update video session
  const updatedSession = await prisma.videoSession.update({
    where: { id: appointment.videoSession.id },
    data: {
      endTime,
      durationMinutes,
    },
  });

  // Update appointment if not already completed
  if (appointment.status !== 'COMPLETED') {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED',
        actualEndTime: endTime,
      },
    });
  }

  return updatedSession;
};

export const getVideoSessionStats = async (appointmentId: string) => {
  const videoSession = await prisma.videoSession.findFirst({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!videoSession) {
    throw new AppError('Video session not found', 404);
  }

  return videoSession;
};

// Helper function to generate consistent integer UID from string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}
