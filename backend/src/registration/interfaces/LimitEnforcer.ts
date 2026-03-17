/**
 * Limit Enforcer interface
 * Enforces subscription-based limits across the application
 */
export interface LimitEnforcer {
  /**
   * Check if user can create a new patient
   * @param userId - ID of user to check
   * @returns Promise resolving to true if user can create patient
   */
  canCreatePatient(userId: string): Promise<boolean>;

  /**
   * Check if user can access calendar features
   * @param userId - ID of user to check
   * @returns Promise resolving to true if user can access calendar
   */
  canAccessCalendar(userId: string): Promise<boolean>;

  /**
   * Get current patient count for user
   * @param userId - ID of user to get count for
   * @returns Promise resolving to current patient count
   */
  getPatientCount(userId: string): Promise<number>;

  /**
   * Increment patient count for user
   * @param userId - ID of user to increment count for
   * @returns Promise resolving when count is incremented
   */
  incrementPatientCount(userId: string): Promise<void>;

  /**
   * Decrement patient count for user
   * @param userId - ID of user to decrement count for
   * @returns Promise resolving when count is decremented
   */
  decrementPatientCount(userId: string): Promise<void>;

  /**
   * Get user's patient limit based on subscription tier
   * @param userId - ID of user to get limit for
   * @returns Promise resolving to patient limit
   */
  getPatientLimit(userId: string): Promise<number>;
}