import { RegistrationRequest, RegistrationResponse, VerificationResponse, ResendResponse } from '../models';

/**
 * Registration API interface
 * Handles registration requests and orchestrates the registration process
 */
export interface RegistrationAPI {
  /**
   * Process a user registration request
   * @param registrationData - The registration data from the user
   * @returns Promise resolving to registration response
   */
  registerUser(registrationData: RegistrationRequest): Promise<RegistrationResponse>;

  /**
   * Verify a user's email using verification token
   * @param token - The verification token from email
   * @returns Promise resolving to verification response
   */
  verifyEmail(token: string): Promise<VerificationResponse>;

  /**
   * Resend verification email to user
   * @param email - The user's email address
   * @returns Promise resolving to resend response
   */
  resendVerification(email: string): Promise<ResendResponse>;
}