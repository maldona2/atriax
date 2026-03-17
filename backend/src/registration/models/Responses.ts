import { User } from './User';

/**
 * Registration response
 */
export interface RegistrationResponse {
  success: boolean;
  user?: Partial<User>;
  message: string;
  errors?: string[];
}

/**
 * Email verification response
 */
export interface VerificationResponse {
  success: boolean;
  message: string;
  user?: Partial<User>;
}

/**
 * Resend verification response
 */
export interface ResendResponse {
  success: boolean;
  message: string;
}