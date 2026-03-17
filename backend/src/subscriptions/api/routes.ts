/**
 * Subscription API Routes
 *
 * This file exports the subscription API router with JWT-based authentication.
 */

import { SubscriptionAPI } from './SubscriptionAPI.js';

// Create and export the subscription API router
const subscriptionAPI = new SubscriptionAPI();
export default subscriptionAPI.getRouter();
