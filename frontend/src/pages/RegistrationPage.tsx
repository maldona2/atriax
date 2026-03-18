import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { AtriaxLogo } from '@/components/landing';

export function RegistrationPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptedTerms: false,
    acceptedPrivacy: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await api.post('/registration/register', form);
      if (data?.success) {
        setSuccess(
          'Registro exitoso. Revisa tu email para verificar tu cuenta.'
        );
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(
          data?.errors?.join(', ') ||
            data?.message ||
            'No se pudo completar el registro'
        );
      }
    } catch (err: unknown) {
      const data =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (
          err as {
            response?: { data?: { message?: string; errors?: string[] } };
          }
        ).response?.data;
      setError(
        (data as { errors?: string[] } | undefined)?.errors?.join(', ') ||
          (data as { message?: string })?.message ||
          'No se pudo completar el registro'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link
        to="/"
        className="mb-8 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <AtriaxLogo />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atriax
        </span>
      </Link>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <CardDescription className="text-balance">
            Comienza con el plan gratuito (hasta 5 pacientes, sin calendario)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="firstName">Nombre</FieldLabel>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Apellido</FieldLabel>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  minLength={8}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmar contraseña
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </Field>

              <div className="space-y-2 pt-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={form.acceptedTerms}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        acceptedTerms: Boolean(checked),
                      }))
                    }
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-muted-foreground leading-snug"
                  >
                    Acepto los{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      términos y condiciones
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy"
                    checked={form.acceptedPrivacy}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        acceptedPrivacy: Boolean(checked),
                      }))
                    }
                  />
                  <label
                    htmlFor="privacy"
                    className="text-xs text-muted-foreground leading-snug"
                  >
                    Acepto la{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      política de privacidad
                    </Link>
                  </label>
                </div>
              </div>

              {error && <FieldError>{error}</FieldError>}
              {success && <p className="text-xs text-emerald-600">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
