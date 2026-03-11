import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface UpdateProfileInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  specialty?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  bio?: string | null;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }> | null;
  workingHours?: { start: string; end: string; days: string[] } | null;
  appointmentDuration?: number | null;
  avatarUrl?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useProfile() {
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const updateProfile = useCallback(
    async (data: UpdateProfileInput) => {
      setSaving(true);
      try {
        await api.patch('/auth/me', data);
        await refreshUser();
        toast.success('Perfil actualizado');
      } catch (err: unknown) {
        const data =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: unknown } }).response?.data;
        const message =
          data && typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: { message?: string } }).error?.message
            : 'No se pudo actualizar el perfil';
        toast.error(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [refreshUser]
  );

  const changePassword = useCallback(async (data: ChangePasswordInput) => {
    setSaving(true);
    try {
      await api.post('/auth/me/password', data);
      toast.success('Contraseña actualizada');
    } catch (err: unknown) {
      const data =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const message =
        data && typeof data === 'object' && data !== null && 'error' in data
          ? (data as { error?: { message?: string } }).error?.message
          : 'No se pudo cambiar la contraseña';
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, updateProfile, changePassword };
}
