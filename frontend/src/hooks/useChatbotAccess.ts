import { useSubscription } from './useSubscription';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns whether the current user has access to the AI chatbot.
 * Access requires an active gold plan with aiFeatures enabled.
 */
export function useChatbotAccess(): { hasAccess: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const { status } = useSubscription();

  if (!user) {
    return { hasAccess: false, isLoading: false };
  }

  const hasAccess =
    status !== null &&
    status.features?.aiFeatures === true &&
    (status.status === 'active' || status.status === 'authorized');

  return { hasAccess, isLoading: status === null };
}
