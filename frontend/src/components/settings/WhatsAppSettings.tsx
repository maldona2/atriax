import { useState, useEffect } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Phone,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface PhoneStatus {
  verified: boolean;
  phoneNumber: string | null;
}

interface WhatsAppSettingsProps {
  isGoldPlan: boolean;
}

export function WhatsAppSettings({ isGoldPlan }: WhatsAppSettingsProps) {
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'enterPhone' | 'enterOtp'>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (isGoldPlan) {
      void fetchStatus();
    } else {
      setLoading(false);
    }
  }, [isGoldPlan]);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await api.get<PhoneStatus>('/whatsapp/phone-status');
      setStatus(res.data);
      if (res.data.verified) {
        setStep('idle');
      }
    } catch {
      setError('Error al cargar el estado de WhatsApp.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!phoneNumber.trim()) return;
    try {
      setActionLoading(true);
      setError(null);
      await api.post('/whatsapp/verify-phone', {
        phoneNumber: phoneNumber.trim(),
      });
      setSuccessMessage('Se envió un código de 6 dígitos a tu WhatsApp.');
      setStep('enterOtp');
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error;
      setError(msg ?? 'No se pudo enviar el código. Intentá nuevamente.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmOtp() {
    if (!otp.trim()) return;
    try {
      setActionLoading(true);
      setError(null);
      await api.post('/whatsapp/confirm-phone', {
        phoneNumber: phoneNumber.trim(),
        otp: otp.trim(),
      });
      setSuccessMessage('¡Número de WhatsApp verificado correctamente!');
      setStep('idle');
      setPhoneNumber('');
      setOtp('');
      await fetchStatus();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error;
      setError(msg ?? 'Código incorrecto o expirado. Intentá nuevamente.');
    } finally {
      setActionLoading(false);
    }
  }

  if (!isGoldPlan) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>WhatsApp Bot</CardTitle>
              <CardDescription>
                Conectá tu número de WhatsApp para recibir recordatorios y
                chatear con el bot
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
            <Lock className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              Esta función está disponible exclusivamente para el plan{' '}
              <strong>Gold</strong>. Actualizá tu suscripción para conectar tu
              WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <MessageCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle>WhatsApp Bot</CardTitle>
            <CardDescription>
              Conectá tu número de WhatsApp para recibir recordatorios y usar el
              bot
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
            Cargando estado...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado</span>
              </div>
              {status?.verified ? (
                <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Verificado
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-muted-foreground"
                >
                  <XCircle className="h-3 w-3" />
                  No verificado
                </Badge>
              )}
            </div>

            {status?.verified && status.phoneNumber && (
              <p className="text-sm text-muted-foreground">
                Número conectado: <strong>{status.phoneNumber}</strong>
              </p>
            )}

            {step === 'idle' && (
              <Button
                size="sm"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setStep('enterPhone');
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                {status?.verified ? 'Cambiar número' : 'Conectar WhatsApp'}
              </Button>
            )}

            {step === 'enterPhone' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="wa-phone">Número de WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">
                    Ingresá tu número en formato internacional (ej:
                    +5491112345678)
                  </p>
                  <Input
                    id="wa-phone"
                    type="tel"
                    placeholder="+5491112345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={actionLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSendOtp()}
                    disabled={actionLoading || !phoneNumber.trim()}
                  >
                    {actionLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Enviar código
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStep('idle');
                      setPhoneNumber('');
                      setError(null);
                    }}
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {step === 'enterOtp' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="wa-otp">Código de verificación</Label>
                  <p className="text-xs text-muted-foreground">
                    Ingresá el código de 6 dígitos que recibiste por WhatsApp
                  </p>
                  <Input
                    id="wa-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={actionLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleConfirmOtp()}
                    disabled={actionLoading || otp.length !== 6}
                  >
                    {actionLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Verificar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStep('enterPhone');
                      setOtp('');
                      setError(null);
                    }}
                    disabled={actionLoading}
                  >
                    Reenviar código
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStep('idle');
                      setPhoneNumber('');
                      setOtp('');
                      setError(null);
                    }}
                    disabled={actionLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {status?.verified && (
              <p className="text-xs text-muted-foreground">
                Recibirás recordatorios de tus turnos por WhatsApp y podrás
                interactuar con el asistente de IA directamente desde tu
                celular.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
