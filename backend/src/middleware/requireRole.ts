import { Request, Response, NextFunction } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const err = new Error('Unauthorized');
      (err as Error & { statusCode?: number }).statusCode = 401;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err = new Error('Forbidden');
      (err as Error & { statusCode?: number }).statusCode = 403;
      return next(err);
    }

    next();
  };
};
