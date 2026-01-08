import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { Role } from '@prisma/client';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please refresh your token.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token. Please login again.' 
    });
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

// Middleware to check if user belongs to the same clinic
export const checkClinicAccess = (req: Request, res: Response, next: NextFunction) => {
  const { clinicId } = req.params;
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  // Admins can access any clinic
  if (req.user.role === Role.ADMIN) {
    return next();
  }

  // Other users can only access their own clinic
  if (req.user.clinicId !== clinicId) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. You can only access your clinic data.' 
    });
  }

  next();
};

// Middleware to check if user is accessing their own data
export const checkSelfAccess = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  // Users can access their own data
  if (req.user.userId === userId) {
    return next();
  }

  // Admins and staff can access any user data in their clinic
  if ([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST].includes(req.user.role as Role)) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. You can only access your own data.' 
  });
};
