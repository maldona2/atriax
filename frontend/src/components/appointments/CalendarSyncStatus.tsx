import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

type SyncStatus = 'synced' | 'pending' | 'failed' | 'unsynced';

interface SyncStatusData {
  status: SyncStatus;
  googleEventId: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  retryCount?: number;
}

interface CalendarSyncStatusProps {
  appointmentId: string;
  appointmentStatus: string;
}

const statusConfig: Record<
  SyncStatus,
  { icon: ReactNode; label: string; className: string }
> = {
  synced: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Synced',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    icon: <Clock className="h-3 w-3" />,
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    label: 'Sync failed',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  unsynced: {
    icon: <Calendar className="h-3 w-3" />,
    label: 'Not synced',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function CalendarSyncStatus({
  appointmentId,
  appointmentStatus,
}: CalendarSyncStatusProps) {
  const [syncData, setSyncData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await api.get<SyncStatusData>(
        `/calendar/sync/${appointmentId}/status`
      );
      setSyncData(res.data);
    } catch {
      // Silently fail — not critical
    }
  }, [appointmentId]);

  const checkCalendarAndFetchStatus = useCallback(async () => {
    try {
      const statusRes = await api.get<{ connected: boolean }>(
        '/calendar/status'
      );
      if (!statusRes.data.connected) {
        setIsCalendarConnected(false);
        return;
      }
      setIsCalendarConnected(true);
      await fetchSyncStatus();
    } catch {
      // Calendar not connected or error — don't show
    }
  }, [fetchSyncStatus]);

  useEffect(() => {
    void checkCalendarAndFetchStatus();
  }, [checkCalendarAndFetchStatus]);

  async function handleRetry() {
    setLoading(true);
    try {
      await api.post(`/calendar/sync/${appointmentId}/retry`);
      toast.success('Sync retry started');
      await fetchSyncStatus();
    } catch {
      toast.error('Failed to retry sync');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSync() {
    setLoading(true);
    try {
      await api.post(`/calendar/sync/${appointmentId}`);
      toast.success('Synced to Google Calendar');
      await fetchSyncStatus();
    } catch {
      toast.error('Failed to sync to Google Calendar');
    } finally {
      setLoading(false);
    }
  }

  if (!isCalendarConnected) return null;
  if (appointmentStatus !== 'confirmed') return null;

  const status: SyncStatus = syncData?.status ?? 'unsynced';
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`gap-1 text-xs ${config.className}`}>
        {config.icon}
        {config.label}
      </Badge>

      {syncData?.lastSyncedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(syncData.lastSyncedAt).toLocaleDateString()}
        </span>
      )}

      {status === 'failed' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleRetry}
          disabled={loading}
          title={syncData?.errorMessage ?? 'Retry sync'}
        >
          <RefreshCw
            className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`}
          />
          Retry
        </Button>
      )}

      {status === 'unsynced' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleManualSync}
          disabled={loading}
        >
          <Calendar className="mr-1 h-3 w-3" />
          Sync
        </Button>
      )}
    </div>
  );
}
