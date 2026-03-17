import { Subscription, SubscriptionTier, ResourceType, LimitCheck } from '../models';

/**
 * Subscription Manager interface
 * Handles subscription tier assignment and management
 */
export interface SubscriptionManager {
  /**
   * Assign free tier subscription to a new user
   * @param userId - ID of user to assign subscription to
   * @returns Promise resolving to created subscription
   */
  assignFreeTier(userId: string): Promise<Subscription>;

  /**
   * Get user's current subscription
   * @param userId - ID of user to get subscription for
   * @returns Promise resolving to user's subscription
   */
  getSubscription(userId: string): Promise<Subscription>;

  /**
   * Upgrade user's subscription to a new tier
   * @param userId - ID of user to upgrade
   * @param newTier - New subscription tier
   * @returns Promise resolving to updated subscription
   */
  upgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<Subscription>;

  /**
   * Check if user can access a specific resource within their limits
   * @param userId - ID of user to check limits for
   * @param resource - Type of resource to check
   * @returns Promise resolving to limit check result
   */
  checkLimit(userId: string, resource: ResourceType): Promise<LimitCheck>;

  /**
   * Get user's subscription tier
   * @param userId - ID of user to get tier for
   * @returns Promise resolving to subscription tier
   */
  getUserTier(userId: string): Promise<SubscriptionTier>;
}