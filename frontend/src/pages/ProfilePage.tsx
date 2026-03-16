import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  Save,
  ArrowLeft,
  Camera,
  FileText,
  Shield,
  Bell,
  Palette,
  Syringe,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GoogleCalendarSettings } from '@/components/settings/GoogleCalendarSettings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useTreatments } from '@/hooks/useTreatments';
import { TreatmentFormDialog } from '@/components/treatments';

interface ProfileDoctor {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  address: string;
  bio: string;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
  appointmentDuration: number;
  avatarUrl: string;
}

const DEFAULT_WORKING_HOURS = {
  start: '08:00',
  end: '18:00',
  days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
};

function userToDoctor(user: {
  email: string;
  fullName: string | null;
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
}): ProfileDoctor {
  const [firstName = '', lastName = ''] = (user.fullName ?? '').split(' ');
  return {
    firstName: firstName || 'Usuario',
    lastName: lastName || '',
    email: user.email,
    phone: user.phone ?? '',
    specialty: user.specialty ?? '',
    licenseNumber: user.licenseNumber ?? '',
    address: user.address ?? '',
    bio: user.bio ?? '',
    education: user.education ?? [],
    workingHours: user.workingHours ?? DEFAULT_WORKING_HOURS,
    appointmentDuration: user.appointmentDuration ?? 30,
    avatarUrl: user.avatarUrl ?? '',
  };
}

const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { saving, updateProfile, changePassword } = useProfile();
  const { appointments } = useAppointments();
  const { patients } = usePatients();
  const {
    treatments,
    loading: treatmentsLoading,
    create: createTreatment,
    update: updateTreatment,
    remove: removeTreatment,
  } = useTreatments();
  const [doctor, setDoctor] = useState<ProfileDoctor>(() =>
    user ? userToDoctor(user) : userToDoctor({ email: '', fullName: null })
  );
  const [isEditing, setIsEditing] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<{
    id: string;
    name: string;
    price_cents: number;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    reminder: true,
  });

  useEffect(() => {
    if (user) {
      setDoctor(userToDoctor(user));
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const fullName = `${doctor.firstName} ${doctor.lastName}`.trim();
      await updateProfile({
        fullName: fullName || undefined,
        email: doctor.email,
        phone: doctor.phone || null,
        specialty: doctor.specialty || null,
        licenseNumber: doctor.licenseNumber || null,
        address: doctor.address || null,
        bio: doctor.bio || null,
        education: doctor.education.length > 0 ? doctor.education : null,
        workingHours: doctor.workingHours,
        appointmentDuration: doctor.appointmentDuration,
        avatarUrl: doctor.avatarUrl || null,
      });
      setIsEditing(false);
    } catch {
      // Error shown by useProfile toast
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    await changePassword({ currentPassword, newPassword });
    setChangePasswordOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const appointmentsThisMonth = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const hoursAttended =
    appointmentsThisMonth.reduce(
      (sum, a) => sum + (a.duration_minutes ?? 0),
      0
    ) / 60;

  const initials =
    `${doctor.firstName[0] ?? ''}${doctor.lastName[0] ?? ''}`.toUpperCase() ||
    'U';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-0 sm:h-16">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10"
              asChild
            >
              <Link to="/app/appointments">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                Mi Perfil
              </h1>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                Gestiona tu información personal
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-9 px-2.5 sm:px-3"
                >
                  <span className="hidden sm:inline">Cancelar</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-2.5 sm:px-3"
                >
                  {saving ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="mr-1.5 h-4 w-4 sm:mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-9 px-2.5 sm:px-3"
              >
                <span className="hidden sm:inline">Editar perfil</span>
                <span className="sm:hidden">Editar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-8 flex flex-col">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="treatments" className="gap-2">
              <Syringe className="h-4 w-4" />
              <span className="hidden sm:inline">Tratamientos</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="relative">
                    <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                      <AvatarImage
                        src={doctor.avatarUrl}
                        alt={`${doctor.firstName} ${doctor.lastName}`}
                      />
                      <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-md"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="sr-only">
                            Nombre completo
                          </Label>
                          <Input
                            id="fullName"
                            value={`${doctor.firstName} ${doctor.lastName}`.trim()}
                            onChange={(e) => {
                              const parts = e.target.value.trim().split(/\s+/);
                              setDoctor({
                                ...doctor,
                                firstName: parts[0] ?? '',
                                lastName: parts.slice(1).join(' ') ?? '',
                              });
                            }}
                            placeholder="Nombre completo"
                            className="text-lg font-bold h-11"
                          />
                        </div>
                      ) : (
                        <h2 className="text-2xl font-bold tracking-tight">
                          {doctor.firstName} {doctor.lastName}
                        </h2>
                      )}
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {doctor.specialty && (
                          <Badge variant="secondary" className="gap-1.5">
                            <Briefcase className="h-3 w-3" />
                            {doctor.specialty}
                          </Badge>
                        )}
                        {doctor.licenseNumber && (
                          <Badge variant="outline" className="gap-1.5">
                            <FileText className="h-3 w-3" />
                            {doctor.licenseNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {doctor.bio ? (
                      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                        {doctor.bio}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Información de contacto
                </CardTitle>
                <CardDescription>
                  Tu información de contacto profesional
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={doctor.email}
                      onChange={(e) =>
                        setDoctor({ ...doctor, email: e.target.value })
                      }
                      className="h-11"
                    />
                  ) : (
                    <div className="flex h-11 items-center rounded-lg border bg-muted/30 px-3">
                      <span className="text-sm">{doctor.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={doctor.phone}
                      onChange={(e) =>
                        setDoctor({ ...doctor, phone: e.target.value })
                      }
                      className="h-11"
                    />
                  ) : (
                    <div className="flex h-11 items-center rounded-lg border bg-muted/30 px-3">
                      <span className="text-sm">{doctor.phone || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Dirección del consultorio</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={doctor.address}
                      onChange={(e) =>
                        setDoctor({ ...doctor, address: e.target.value })
                      }
                      className="h-11"
                    />
                  ) : (
                    <div className="flex h-11 items-center rounded-lg border bg-muted/30 px-3">
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{doctor.address || '—'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {doctor.education.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    Formación profesional
                  </CardTitle>
                  <CardDescription>
                    Tu trayectoria académica y profesional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctor.education.map((edu, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{edu.degree}</p>
                        <p className="text-sm text-muted-foreground">
                          {edu.institution}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {edu.year}
                      </Badge>
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" className="w-full">
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Agregar formación
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Biografía
                </CardTitle>
                <CardDescription>
                  Una breve descripción sobre tu experiencia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={doctor.bio}
                    onChange={(e) =>
                      setDoctor({ ...doctor, bio: e.target.value })
                    }
                    rows={4}
                    className="resize-none"
                    placeholder="Escribe una breve descripción sobre tu experiencia profesional..."
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {doctor.bio || '—'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Horario de atención
                </CardTitle>
                <CardDescription>
                  Configura tus días y horarios de atención
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={doctor.workingHours.start}
                        onChange={(e) =>
                          setDoctor({
                            ...doctor,
                            workingHours: {
                              ...doctor.workingHours,
                              start: e.target.value,
                            },
                          })
                        }
                        className="h-11"
                      />
                    ) : (
                      <div className="flex h-11 items-center rounded-lg border bg-muted/30 px-3">
                        <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {doctor.workingHours.start}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    {isEditing ? (
                      <Input
                        type="time"
                        value={doctor.workingHours.end}
                        onChange={(e) =>
                          setDoctor({
                            ...doctor,
                            workingHours: {
                              ...doctor.workingHours,
                              end: e.target.value,
                            },
                          })
                        }
                        className="h-11"
                      />
                    ) : (
                      <div className="flex h-11 items-center rounded-lg border bg-muted/30 px-3">
                        <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {doctor.workingHours.end}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Días de atención</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = doctor.workingHours.days.includes(day);
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          disabled={!isEditing}
                          onClick={() => {
                            if (isEditing) {
                              const newDays = isSelected
                                ? doctor.workingHours.days.filter(
                                    (d) => d !== day
                                  )
                                : [...doctor.workingHours.days, day];
                              setDoctor({
                                ...doctor,
                                workingHours: {
                                  ...doctor.workingHours,
                                  days: newDays,
                                },
                              });
                            }
                          }}
                          className="rounded-full"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Duración de turnos por defecto</Label>
                  {isEditing ? (
                    <Select
                      value={doctor.appointmentDuration.toString()}
                      onValueChange={(value) =>
                        setDoctor({
                          ...doctor,
                          appointmentDuration: Number(value),
                        })
                      }
                    >
                      <SelectTrigger className="h-11 w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1 hora 30 min</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-11 w-full items-center rounded-lg border bg-muted/30 px-3 sm:w-48">
                      <span className="text-sm font-medium">
                        {doctor.appointmentDuration} minutos
                      </span>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        'Guardando...'
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar horario
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100">
                      <Calendar className="h-6 w-6 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {appointmentsThisMonth.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Turnos este mes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <User className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{patients.length}</p>
                      <p className="text-sm text-muted-foreground">
                        Pacientes activos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {hoursAttended % 1 === 0
                          ? hoursAttended
                          : hoursAttended.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Horas atendidas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Syringe className="h-5 w-5 text-muted-foreground" />
                      Catálogo de tratamientos
                    </CardTitle>
                    <CardDescription>
                      Define tratamientos y precios para asignar a los turnos
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTreatment(null);
                      setTreatmentDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {treatmentsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Cargando tratamientos...
                  </p>
                ) : treatments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay tratamientos. Crea uno para usarlo en los turnos.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {treatments.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(t.price_cents / 100).toFixed(2)} por sesión
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingTreatment({
                                id: t.id,
                                name: t.name,
                                price_cents: t.price_cents,
                              });
                              setTreatmentDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeTreatment(t.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <TreatmentFormDialog
              open={treatmentDialogOpen}
              onOpenChange={(open) => {
                setTreatmentDialogOpen(open);
                if (!open) setEditingTreatment(null);
              }}
              treatment={
                editingTreatment
                  ? {
                      id: editingTreatment.id,
                      tenant_id: '',
                      name: editingTreatment.name,
                      price_cents: editingTreatment.price_cents,
                      created_at: null,
                      updated_at: null,
                    }
                  : null
              }
              onSubmit={async (data) => {
                if (editingTreatment) {
                  await updateTreatment(editingTreatment.id, data);
                } else {
                  await createTreatment(data);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <GoogleCalendarSettings />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  Notificaciones
                </CardTitle>
                <CardDescription>
                  Configura cómo quieres recibir las notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="font-medium">
                      Notificaciones por email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe un email cuando un paciente agenda un turno
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="font-medium">
                      Notificaciones por SMS
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe un SMS para turnos urgentes o cancelaciones
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, sms: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Recordatorios diarios</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe un resumen de tus turnos cada mañana
                    </p>
                  </div>
                  <Switch
                    checked={notifications.reminder}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, reminder: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  Apariencia
                </CardTitle>
                <CardDescription>
                  Personaliza la interfaz de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select
                    value={theme ?? 'system'}
                    onValueChange={(v) => setTheme(v)}
                  >
                    <SelectTrigger className="h-11 w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Cuenta y seguridad
                </CardTitle>
                <CardDescription>
                  Administra tu cuenta y opciones de seguridad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start sm:w-auto"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  Cambiar contraseña
                </Button>
                <Dialog
                  open={changePasswordOpen}
                  onOpenChange={(open) => {
                    setChangePasswordOpen(open);
                    if (!open) {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cambiar contraseña</DialogTitle>
                      <DialogDescription>
                        Ingresa tu contraseña actual y la nueva contraseña.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Contraseña actual
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nueva contraseña</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirmar nueva contraseña
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        {newPassword &&
                          confirmPassword &&
                          newPassword !== confirmPassword && (
                            <p className="text-sm text-destructive">
                              Las contraseñas no coinciden
                            </p>
                          )}
                      </div>
                    </div>
                    <DialogFooter showCloseButton>
                      <Button
                        onClick={handleChangePassword}
                        disabled={
                          saving ||
                          !currentPassword ||
                          !newPassword ||
                          newPassword.length < 8 ||
                          newPassword !== confirmPassword
                        }
                      >
                        {saving ? 'Guardando...' : 'Cambiar contraseña'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Zona de peligro
                  </p>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    Eliminar cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
