import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth.js';
import { getBillingMode } from '../services/billingAccessService.js';
import {
  BILLING_DUE_DAY,
  getTenantStatus,
} from '../services/infraPaymentService.js';

/**
 * Prefixes that stay reachable while a tenant is locked out, so the user can
 * still read the payment data and close the session.
 */
const OPEN_PREFIXES = ['/auth', '/billing', '/health'];

function isOpenPath(path: string): boolean {
  return OPEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Blocks manual-transfer tenants from the API once the monthly payment is past
 * its due day. Mounted on `/api` before the routers, so it authenticates the
 * request itself; the routers run their own `authenticate` afterwards.
 */
export function requireBillingCurrent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (isOpenPath(req.path)) return next();
  if (!req.headers.authorization) return next();

  authenticate(req, res, (err?: unknown) => {
    // Invalid/absent token: let the route's own auth middleware reject it.
    if (err || !req.user?.tenantId) return next();
    if (getBillingMode(req.user.email) !== 'manual_transfer') return next();

    // ponytail: one status query per request; add a short-lived cache if the
    // manual-billing tenant count ever grows beyond a handful.
    getTenantStatus(req.user.tenantId)
      .then((status) => {
        if (!status.overdue) return next();
        const error = new Error(
          `El pago de la infraestructura vencía el día ${BILLING_DUE_DAY}. Regularizá la transferencia para volver a usar la aplicación.`
        );
        (error as Error & { statusCode?: number }).statusCode = 402;
        next(error);
      })
      .catch(next);
  });
}
