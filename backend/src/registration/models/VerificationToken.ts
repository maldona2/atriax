/**
 * Verification token model
 */
export interface VerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  valid: boolean;
  userId?: string;
  expired: boolean;
  used: boolean;
  message?: string;
}