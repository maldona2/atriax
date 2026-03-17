import { TokenValidation } from '../models';

/**
 * Email Service interface
 * Manages email verification and notifications
 */
export interface EmailService {
  /**
   * Send verification email to user
   * @param email - User's email address
   * @param token - Verification token to include in email
   * @param firstName - User's first name for personalization
   * @returns Promise resolving when email is sent
   */
  sendVerificationEmail(email: string, token: string, firstName: string): Promise<void>;

  /**
   * Generate a unique verification token for user
   * @param userId - ID of user to generate token for
   * @returns Promise resolving to generated token
   */
  generateVerificationToken(userId: string): Promise<string>;

  /**
   * Validate a verification token
   * @param token - Token to validate
   * @returns Promise resolving to token validation result
   */
  validateVerificationToken(token: string): Promise<TokenValidation>;

  /**
   * Send welcome email after successful registration
   * @param email - User's email address
   * @param firstName - User's first name
   * @returns Promise resolving when email is sent
   */
  sendWelcomeEmail(email: string, firstName: string): Promise<void>;

  /**
   * Mark verification token as used
   * @param token - Token to mark as used
   * @returns Promise resolving when token is marked as used
   */
  markTokenAsUsed(token: string): Promise<void>;
}