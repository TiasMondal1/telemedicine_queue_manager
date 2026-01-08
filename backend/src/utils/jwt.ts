import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  clinicId: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
};

export const generateTokens = (payload: JWTPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// Store refresh token in Redis with expiry
export const storeRefreshToken = async (userId: string, token: string) => {
  const key = `refresh_token:${userId}`;
  // Store for 7 days (matching token expiry)
  await redis.setex(key, 7 * 24 * 60 * 60, token);
};

// Verify refresh token exists in Redis
export const validateRefreshToken = async (userId: string, token: string): Promise<boolean> => {
  const key = `refresh_token:${userId}`;
  const storedToken = await redis.get(key);
  return storedToken === token;
};

// Revoke refresh token
export const revokeRefreshToken = async (userId: string) => {
  const key = `refresh_token:${userId}`;
  await redis.del(key);
};

// Revoke all tokens for a user (useful for password reset, logout all devices)
export const revokeAllUserTokens = async (userId: string) => {
  const pattern = `refresh_token:${userId}*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
