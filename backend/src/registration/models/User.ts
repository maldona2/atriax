/**
 * User model for registration system
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscriptionId?: string;
  tenantId?: string;
}

/**
 * User data for creating new users
 */
export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

/**
 * User profile updates
 */
export interface UserUpdates {
  firstName?: string;
  lastName?: string;
  email?: string;
  isVerified?: boolean;
}

/**
 * Registration data from user input
 */
export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}