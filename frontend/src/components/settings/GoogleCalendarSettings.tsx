import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link2,
  Link2Off,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface CalendarStatus {
  connected: boolean;
  tokenExpiresAt: string | null;
}

export function GoogleCalendarSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const calendarConnected = searchParams.get('calendar_connected');
    const calendarError = searchParams.get('calendar_error');

    if (calendarConnected === 'true') {
      setSuccessMessage('Google Calendar connected successfully!');
      setSearchParams((prev) => {
        prev.delete('calendar_connected');
        return prev;
      });
    }

    if (calendarError) {
      setError(`Google OAuth error: ${calendarError}`);
      setSearchParams((prev) => {
        prev.delete('calendar_error');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await api.get<CalendarStatus>('/calendar/status');
      setStatus(res.data);
    } catch {
      setError('Failed to load Google Calendar status.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setActionLoading(true);
      setError(null);
      const res = await api.get<{ url: string }>('/auth/google/calendar');
      window.location.href = res.data.url;
    } catch {
      setError('Failed to initiate Google Calendar connection.');
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        'Disconnect Google Calendar? All synced events will be removed from your calendar.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await api.delete('/calendar/disconnect');
      setSuccessMessage('Google Calendar disconnected successfully.');
      await fetchStatus();
    } catch {
      setError('Failed to disconnect Google Calendar.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSyncAll() {
    try {
      setActionLoading(true);
      setError(null);
      await api.post('/calendar/sync/all');
      setSuccessMessage(
        'Sync started! Your appointments will be synced shortly.'
      );
    } catch {
      setError('Failed to trigger sync.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Sync your confirmed appointments to Google Calendar
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading status...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status</span>
              </div>
              {status?.connected ? (
                <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-muted-foreground"
                >
                  <XCircle className="h-3 w-3" />
                  Not connected
                </Badge>
              )}
            </div>

            {status?.connected && status.tokenExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Token expires:{' '}
                {new Date(status.tokenExpiresAt).toLocaleDateString()}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {status?.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAll}
                    disabled={actionLoading}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`}
                    />
                    Sync All Appointments
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                  >
                    <Link2Off className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={actionLoading}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect Google Calendar
                </Button>
              )}
            </div>

            {status?.connected && (
              <p className="text-xs text-muted-foreground">
                Confirmed appointments are automatically synced. Cancellations
                remove events from your calendar.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
