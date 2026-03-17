import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AtriaxLogo } from '@/components/landing';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    'pending'
  );
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación inválido.');
      return;
    }

    api
      .get(`/registration/verify/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (data?.success) {
          setStatus('success');
          setMessage('Email verificado correctamente. Ya puedes iniciar sesión.');
        } else {
          setStatus('error');
          setMessage(data?.message || 'No se pudo verificar el email.');
        }
      })
      .catch((err: unknown) => {
        const data =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response
            ?.data;
        setStatus('error');
        setMessage(data?.message || 'No se pudo verificar el email.');
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <AtriaxLogo />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atriax
        </span>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verificación de email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Verificando tu email, por favor espera...
            </p>
          )}
          {status !== 'pending' && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          <Button onClick={() => navigate('/login')} className="mt-2 w-full">
            Ir a iniciar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

