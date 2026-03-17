/**
 * Registration request from client
 */
export interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}