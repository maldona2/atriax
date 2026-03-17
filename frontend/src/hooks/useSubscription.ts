import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionPlan {
  name: string;
  displayName: string;
  priceARS: number;
  features: {
    appointments: boolean;
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
  disabled?: boolean;
}

export interface SubscriptionStatus {
  userId: string;
  plan: string;
  status: string;
  preApprovalId: string | null;
  billingPeriodStart: string | null;
  features: {
    appointments: boolean;
    calendarSync: boolean;
    patientDatabase: boolean;
    aiFeatures: boolean;
    whatsappIntegration: boolean;
  };
}

export function useSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await api.get<SubscriptionPlan[]>(
        '/subscriptions/plans'
      );
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('No se pudieron cargar los planes');
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data } = await api.get<SubscriptionStatus>(
        `/subscriptions/${user.id}`
      );
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    }
  }, [user?.id]);

  const createSubscription = useCallback(
    async (planName: string) => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const { data } = await api.post<{ initUrl: string }>('/subscriptions', {
          userId: user.id,
          plan: planName,
        });

        // Redirect to Mercado Pago checkout
        window.location.href = data.initUrl;
      } catch (err: unknown) {
        const errorData =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: unknown } }).response?.data;
        const message =
          errorData &&
          typeof errorData === 'object' &&
          errorData !== null &&
          'error' in errorData
            ? (errorData as { error?: string }).error
            : 'No se pudo crear la suscripción';
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const cancelSubscription = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await api.delete(`/subscriptions/${user.id}`);
      toast.success('Suscripción cancelada');
      await fetchStatus();
    } catch (err: unknown) {
      const errorData =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const message =
        errorData &&
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData
          ? (errorData as { error?: string }).error
          : 'No se pudo cancelar la suscripción';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchStatus]);

  const pauseSubscription = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await api.post(`/subscriptions/${user.id}/pause`);
      toast.success('Suscripción pausada');
      await fetchStatus();
    } catch (err: unknown) {
      const errorData =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const message =
        errorData &&
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData
          ? (errorData as { error?: string }).error
          : 'No se pudo pausar la suscripción';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchStatus]);

  const resumeSubscription = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await api.post(`/subscriptions/${user.id}/resume`);
      toast.success('Suscripción reanudada');
      await fetchStatus();
    } catch (err: unknown) {
      const errorData =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const message =
        errorData &&
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData
          ? (errorData as { error?: string }).error
          : 'No se pudo reanudar la suscripción';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchStatus]);

  useEffect(() => {
    void fetchPlans();
    void fetchStatus();
  }, [fetchPlans, fetchStatus]);

  return {
    loading,
    plans,
    status,
    createSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    refreshStatus: fetchStatus,
  };
}
