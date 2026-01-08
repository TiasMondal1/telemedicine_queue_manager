import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { 
  generateTokens, 
  storeRefreshToken, 
  verifyRefreshToken, 
  validateRefreshToken, 
  revokeRefreshToken 
} from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, clinicId, dateOfBirth, gender } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Check if clinic exists and is active
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic || !clinic.isActive) {
      throw new AppError('Invalid or inactive clinic', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user and patient profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: Role.PATIENT,
          clinicId,
          firstName,
          lastName,
          phone,
          emailVerificationToken,
          emailVerified: false,
        },
      });

      await tx.patient.create({
        data: {
          userId: newUser.id,
          clinicId,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          allergies: [],
        },
      });

      return newUser;
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, emailVerificationToken, user.firstName);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, deviceToken, platform } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        clinic: true,
        doctor: true,
        patient: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 403);
    }

    // Check if clinic is active
    if (!user.clinic.isActive) {
      throw new AppError('Clinic is currently inactive. Please contact support.', 403);
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    });

    // Store refresh token
    await storeRefreshToken(user.id, tokens.refreshToken);

    // Store device token if provided (for push notifications)
    if (deviceToken && platform) {
      await prisma.deviceToken.upsert({
        where: { token: deviceToken },
        update: {
          userId: user.id,
          platform,
          isActive: true,
          lastUsed: new Date(),
        },
        create: {
          userId: user.id,
          token: deviceToken,
          platform,
          isActive: true,
        },
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePictureUrl: user.profilePictureUrl,
          emailVerified: user.emailVerified,
          clinicId: user.clinicId,
          clinic: {
            id: user.clinic.id,
            name: user.clinic.name,
            timezone: user.clinic.timezone,
          },
          doctorProfile: user.doctor,
          patientProfile: user.patient,
        },
        tokens,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Validate token exists in Redis
    const isValid = await validateRefreshToken(decoded.userId, refreshToken);
    if (!isValid) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    });

    // Store new refresh token
    await storeRefreshToken(user.id, tokens.refreshToken);

    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    throw error;
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { deviceToken } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Revoke refresh token
    await revokeRefreshToken(userId);

    // Deactivate device token if provided
    if (deviceToken) {
      await prisma.deviceToken.updateMany({
        where: { 
          userId,
          token: deviceToken,
        },
        data: { isActive: false },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    throw error;
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Verification token required', 400);
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken, // Reusing field for reset token
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password required', 400);
    }

    // Hash token to find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: hashedToken },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerificationToken: null,
      },
    });

    // Revoke all existing tokens for security
    await revokeRefreshToken(user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    throw error;
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: true,
        doctor: true,
        patient: true,
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

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phone, profilePictureUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        profilePictureUrl,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
};
