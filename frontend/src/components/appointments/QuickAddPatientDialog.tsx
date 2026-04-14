import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { Patient } from '@/types';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '54', name: 'Argentina', dialCode: '+54' },
  { code: '55', name: 'Brasil', dialCode: '+55' },
  { code: '56', name: 'Chile', dialCode: '+56' },
  { code: '57', name: 'Colombia', dialCode: '+57' },
  { code: '52', name: 'México', dialCode: '+52' },
  { code: '51', name: 'Perú', dialCode: '+51' },
  { code: '598', name: 'Uruguay', dialCode: '+598' },
  { code: '58', name: 'Venezuela', dialCode: '+58' },
  { code: '1', name: 'Estados Unidos', dialCode: '+1' },
  { code: '34', name: 'España', dialCode: '+34' },
];

interface QuickAddPatientDialogProps {
  onPatientCreated: (patient: Patient) => void;
}

export function QuickAddPatientDialog({
  onPatientCreated,
}: QuickAddPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    countryCode: '54',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) return;

    // Format phone number in WhatsApp format (country code + phone, no spaces)
    const formattedPhone = form.phone.trim()
      ? `${form.countryCode}${form.phone.replace(/\D/g, '')}`
      : '';

    setSubmitting(true);
    try {
      const { data } = await api.post<Patient>('/patients', {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: formattedPhone,
        email: form.email,
        date_of_birth: '',
        notes: '',
      });
      onPatientCreated(data);
      setForm({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        countryCode: '54',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error creating patient:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-lg border-dashed"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Crear nuevo paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, first_name: e.target.value }))
              }
              placeholder="Juan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, last_name: e.target.value }))
              }
              placeholder="Pérez"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <div className="flex gap-2">
              <Select
                value={form.countryCode}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, countryCode: value }))
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.dialCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="3813000120"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="juan@ejemplo.com"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting || !form.first_name || !form.last_name}
            >
              {submitting ? 'Creando...' : 'Crear paciente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
