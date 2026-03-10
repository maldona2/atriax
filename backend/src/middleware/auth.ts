import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  tenantId: string | null;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    const err = new Error('No token provided');
    (err as Error & { statusCode?: number }).statusCode = 401;
    return next(err);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('JWT_SECRET not configured'));
  }

  try {
    const payload = jwt.verify(token, secret) as {
      sub: string;
      email: string;
      tenantId?: string | null;
      role: string;
    };

    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch {
    const err = new Error('Invalid or expired token');
    (err as Error & { statusCode?: number }).statusCode = 401;
    next(err);
  }
};
