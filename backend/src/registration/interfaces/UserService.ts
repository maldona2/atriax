import { UserData, User, UserUpdates } from '../models';

/**
 * User Service interface
 * Manages user account creation and lifecycle
 */
export interface UserService {
  /**
   * Create a new user account
   * @param userData - User data for account creation
   * @returns Promise resolving to created user
   */
  createUser(userData: UserData): Promise<User>;

  /**
   * Get user by email address
   * @param email - Email address to search for
   * @returns Promise resolving to user or null if not found
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Get user by ID
   * @param userId - User ID to search for
   * @returns Promise resolving to user or null if not found
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Activate a user account after email verification
   * @param userId - ID of user to activate
   * @returns Promise resolving when activation is complete
   */
  activateUser(userId: string): Promise<void>;

  /**
   * Update user profile information
   * @param userId - ID of user to update
   * @param updates - Updates to apply to user profile
   * @returns Promise resolving to updated user
   */
  updateUserProfile(userId: string, updates: UserUpdates): Promise<User>;

  /**
   * Check if email is already registered
   * @param email - Email address to check
   * @returns Promise resolving to true if email exists
   */
  emailExists(email: string): Promise<boolean>;
}