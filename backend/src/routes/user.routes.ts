import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
  role: z.enum([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT]),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  role: z.enum([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT]).optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
});

const getUsersQuerySchema = z.object({
  role: z.enum([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT]).optional(),
  search: z.string().optional(),
});

// Get current user's profile
router.get('/profile', authenticate, userController.getUserProfile);

// Update current user's profile
router.put(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  userController.updateUserProfile
);

// Admin-only routes
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateQuery(getUsersQuerySchema),
  userController.getAllUsers
);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateBody(createUserSchema),
  userController.createUser
);

router.get(
  '/:userId',
  authenticate,
  authorize(Role.ADMIN),
  userController.getUserById
);

router.put(
  '/:userId',
  authenticate,
  authorize(Role.ADMIN),
  validateBody(updateUserSchema),
  userController.updateUser
);

router.delete(
  '/:userId',
  authenticate,
  authorize(Role.ADMIN),
  userController.deleteUser
);

export default router;
