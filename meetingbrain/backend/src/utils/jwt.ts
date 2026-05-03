import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

interface TokenPayload {
  userId: string;
  email: string;
}

interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

// ─── Generate access token (short-lived) ─────────────────────────────────────
export const generateAccessToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError('JWT secret is not configured.', 500);
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'meetingbrain',
    audience: 'meetingbrain-client',
  } as jwt.SignOptions);
};

// ─── Generate refresh token (long-lived) ─────────────────────────────────────
export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError('JWT refresh secret is not configured.', 500);
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'meetingbrain',
    audience: 'meetingbrain-client',
  } as jwt.SignOptions);
};

// ─── Verify access token ──────────────────────────────────────────────────────
export const verifyAccessToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError('JWT secret is not configured.', 500);
  }

  try {
    return jwt.verify(token, secret, {
      issuer: 'meetingbrain',
      audience: 'meetingbrain-client',
    }) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token has expired. Please log in again.', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token. Please log in again.', 401);
    }
    throw new AppError('Token verification failed.', 401);
  }
};

// ─── Verify refresh token ─────────────────────────────────────────────────────
export const verifyRefreshToken = (token: string): DecodedToken => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError('JWT refresh secret is not configured.', 500);
  }

  try {
    return jwt.verify(token, secret, {
      issuer: 'meetingbrain',
      audience: 'meetingbrain-client',
    }) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token has expired. Please log in again.', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token. Please log in again.', 401);
    }
    throw new AppError('Refresh token verification failed.', 401);
  }
};

// ─── Decode token without verification (for debugging only) ──────────────────
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
};

// ─── Extract token from Authorization header ──────────────────────────────────
export const extractTokenFromHeader = (authHeader: string | undefined): string => {
  if (!authHeader) {
    throw new AppError('Authorization header is missing.', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Invalid authorization format. Use: Bearer <token>', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    throw new AppError('Token is missing from Authorization header.', 401);
  }

  return token;
};

// ─── Generate both tokens at once ────────────────────────────────────────────
export const generateTokenPair = (
  payload: TokenPayload
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// ─── Get token expiry as Date ─────────────────────────────────────────────────
export const getTokenExpiry = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
};