/**
 * Database utilities for subscription system
 */

import { db } from '../../db/client.js';

export { db };

/**
 * Execute a database operation with error handling
 */
export async function withTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw error;
  }
}
