import { useState, useEffect } from 'react';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { Link, useSearchParams } from 'react-router-dom';
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
  CreditCard,
  Check,
  Sparkles,
  Building2,
  Zap,
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
import { useSubscription } from '@/hooks/useSubscription';
import { TreatmentFormDialog } from '@/components/treatments';
import { TreatmentCard } from '@/components/treatments/TreatmentCard';
import type { Treatment } from '@/types';
import { FeatureStatus } from '@/components/subscriptions/FeatureStatus';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';

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
  const [searchParams] = useSearchParams();
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
  const {
    loading: subscriptionLoading,
    plans,
    status: subscriptionStatus,
    createSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
  } = useSubscription();
  const [doctor, setDoctor] = useState<ProfileDoctor>(() =>
    user ? userToDoctor(user) : userToDoctor({ email: '', fullName: null })
  );
  const [isEditing, setIsEditing] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(
    null
  );
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
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-4 sm:py-0 md:px-6 lg:px-8">
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
            <ContextualHelpButton section="profile" />
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-9 px-2.5 sm:px-3"
                >
                  <span className="hidden sm:inline">Cancelar</span>
                  <span className="sm:hidden">Cancelar</span>
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

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <Tabs
          defaultValue={searchParams.get('tab') ?? 'profile'}
          className="flex flex-col gap-4 sm:gap-6 md:gap-8"
        >
          <TabsList className="grid h-auto w-full max-w-2xl grid-cols-5 gap-0.5 rounded-lg bg-muted/0 p-0.5 sm:gap-1 sm:rounded-xl sm:p-1 [&>*]:h-auto">
            <TabsTrigger
              value="profile"
              className="h-auto gap-1 rounded-md px-1.5 py-2 text-xs sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <User className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="h-auto gap-1 rounded-md px-1.5 py-2 text-xs sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger
              value="treatments"
              className="h-auto gap-1 rounded-md px-1.5 py-2 text-xs sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Syringe className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Tratamientos</span>
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="h-auto gap-1 rounded-md px-1.5 py-2 text-xs sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Suscripción</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="h-auto gap-1 rounded-md px-1.5 py-2 text-xs sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Shield className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6">
            <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm sm:rounded-2xl">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent sm:h-24" />
              <div className="relative px-4 pb-4 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-xl ring-4 ring-primary/5 sm:h-28 sm:w-28">
                      <AvatarImage
                        src={doctor.avatarUrl}
                        alt={`${doctor.firstName} ${doctor.lastName}`}
                      />
                      <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground sm:text-2xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-lg ring-2 ring-background"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 text-center sm:space-y-3 sm:text-left">
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
                            className="h-10 text-base font-bold sm:h-11 sm:text-lg"
                          />
                        </div>
                      ) : (
                        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                          {doctor.firstName} {doctor.lastName}
                        </h2>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 sm:mt-2 sm:justify-start sm:gap-2">
                        {doctor.specialty && (
                          <Badge
                            variant="secondary"
                            className="gap-1 px-2 py-0.5 text-xs sm:gap-1.5 sm:px-3 sm:py-1 sm:text-sm"
                          >
                            <Briefcase className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {doctor.specialty}
                          </Badge>
                        )}
                        {doctor.licenseNumber && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-2 py-0.5 text-xs sm:gap-1.5 sm:px-3 sm:py-1 sm:text-sm"
                          >
                            <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
              </div>
            </div>

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

          <TabsContent value="schedule" className="space-y-4 sm:space-y-6">
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

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-sky-500/10 transition-transform group-hover:scale-110 sm:h-20 sm:w-20 sm:translate-x-6 sm:-translate-y-6" />
                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 sm:h-12 sm:w-12 sm:rounded-xl">
                    <Calendar className="h-5 w-5 text-sky-600 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {appointmentsThisMonth.length}
                    </p>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      Turnos este mes
                    </p>
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 transition-transform group-hover:scale-110 sm:h-20 sm:w-20 sm:translate-x-6 sm:-translate-y-6" />
                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 sm:h-12 sm:w-12 sm:rounded-xl">
                    <User className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {patients.length}
                    </p>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      Pacientes activos
                    </p>
                  </div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 transition-transform group-hover:scale-110 sm:h-20 sm:w-20 sm:translate-x-6 sm:-translate-y-6" />
                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 sm:h-12 sm:w-12 sm:rounded-xl">
                    <Clock className="h-5 w-5 text-amber-600 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {hoursAttended % 1 === 0
                        ? hoursAttended
                        : hoursAttended.toFixed(1)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      Horas atendidas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditingTreatment(null);
                      setTreatmentDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo tratamiento
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
                      <TreatmentCard
                        key={t.id}
                        treatment={t}
                        onEdit={(treatment) => {
                          setEditingTreatment(treatment);
                          setTreatmentDialogOpen(true);
                        }}
                        onDelete={(id) => removeTreatment(id)}
                      />
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
              treatment={editingTreatment}
              onSubmit={async (data) => {
                if (editingTreatment) {
                  await updateTreatment(editingTreatment.id, data);
                } else {
                  await createTreatment(data);
                }
              }}
            />
          </TabsContent>

          <TabsContent
            value="subscription"
            className="space-y-5 sm:space-y-6 md:space-y-8"
          >
            {/* Current Subscription Status */}
            {subscriptionStatus && (
              <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-primary/5 sm:h-32 sm:w-32 sm:translate-x-8 sm:-translate-y-8" />
                <div className="absolute right-8 top-8 h-12 w-12 rounded-full bg-primary/10 sm:right-12 sm:top-12 sm:h-16 sm:w-16" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-14 sm:w-14 sm:rounded-2xl">
                      <CreditCard className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                        Plan actual
                      </p>
                      <p className="text-xl font-bold capitalize tracking-tight sm:text-2xl">
                        {subscriptionStatus.plan}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={
                        subscriptionStatus.status === 'active'
                          ? 'default'
                          : subscriptionStatus.status === 'paused'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="px-3 py-1 text-sm"
                    >
                      {subscriptionStatus.status === 'active' && 'Activo'}
                      {subscriptionStatus.status === 'paused' && 'Pausado'}
                      {subscriptionStatus.status === 'cancelled' && 'Cancelado'}
                      {subscriptionStatus.status === 'failed' && 'Fallido'}
                    </Badge>
                    {subscriptionStatus.plan !== 'free' && (
                      <>
                        {subscriptionStatus.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseSubscription()}
                              disabled={subscriptionLoading}
                            >
                              Pausar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (
                                  confirm(
                                    '¿Estás seguro de que quieres cancelar tu suscripción?'
                                  )
                                ) {
                                  void cancelSubscription();
                                }
                              }}
                              disabled={subscriptionLoading}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {subscriptionStatus.status === 'paused' && (
                          <Button
                            size="sm"
                            onClick={() => resumeSubscription()}
                            disabled={subscriptionLoading}
                          >
                            Reanudar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Feature Status */}
            {subscriptionStatus && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Estado de funciones
                  </CardTitle>
                  <CardDescription>
                    Funciones disponibles en tu plan actual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeatureStatus status={subscriptionStatus} />
                </CardContent>
              </Card>
            )}

            {/* Subscription Plans */}
            <div className="space-y-4 sm:space-y-6">
              <div className="pb-1 text-center sm:pb-2">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Elige tu plan
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
                  Selecciona el plan que mejor se adapte a tus necesidades
                </p>
              </div>

              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Free Plan */}
                <div className="relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:rounded-2xl sm:p-6">
                  <div className="mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">Gratis</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ideal para comenzar
                    </p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold tracking-tight">
                      $0
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {[
                      'Hasta 5 pacientes',
                      'Sin acceso a calendario',
                      'Recordatorios por email básicos',
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={
                      subscriptionStatus?.plan === 'free' || subscriptionLoading
                    }
                    onClick={() => createSubscription('free')}
                  >
                    {subscriptionStatus?.plan === 'free'
                      ? 'Plan actual'
                      : 'Seleccionar'}
                  </Button>
                </div>

                {/* Pro Plan - Highlighted */}
                <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-4 shadow-lg transition-all hover:shadow-xl sm:rounded-2xl sm:p-6 md:scale-[1.02] lg:scale-105">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-3 py-1 text-primary-foreground shadow-md">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Recomendado
                    </Badge>
                  </div>
                  <div className="mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">Pro</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Para profesionales activos
                    </p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold tracking-tight">
                      $30.000
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {[
                      'Pacientes ilimitados',
                      'Sincronización con Google Calendar',
                      'Recordatorios SMS + Email',
                      'Reportes avanzados',
                      'Soporte prioritario',
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    disabled={
                      subscriptionStatus?.plan === 'pro' || subscriptionLoading
                    }
                    onClick={() => createSubscription('pro')}
                  >
                    {subscriptionStatus?.plan === 'pro'
                      ? 'Plan actual'
                      : 'Comenzar ahora'}
                  </Button>
                </div>

                {/* Gold Plan */}
                <div className="relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:rounded-2xl sm:p-6">
                  <div className="mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">Gold</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Para profesionales que quieren potenciar su práctica
                    </p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold tracking-tight">
                      $50.000
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {[
                      'Todo en Pro',
                      'Asistente de IA integrado',
                      'Conexión WhatsApp Bot',
                      'Turnos ilimitados',
                      'Soporte prioritario',
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={
                      subscriptionStatus?.plan === 'gold' || subscriptionLoading
                    }
                    onClick={() => createSubscription('gold')}
                  >
                    {subscriptionStatus?.plan === 'gold'
                      ? 'Plan actual'
                      : 'Contactar ventas'}
                  </Button>
                </div>
              </div>

              {/* Gold CTA */}
              <div className="rounded-xl bg-primary p-4 text-primary-foreground sm:rounded-2xl sm:p-6 md:p-8">
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 sm:h-14 sm:w-14 sm:rounded-2xl">
                    <Building2 className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold sm:text-lg">
                      ¿Querés llevar tu práctica al siguiente nivel?
                    </h3>
                    <p className="mt-1 text-xs text-primary-foreground/80 sm:text-sm">
                      Contactá con nuestro equipo para activar el plan Gold y
                      acceder al asistente de IA y WhatsApp Bot.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="mt-1 w-full shrink-0 sm:mt-0 sm:w-auto"
                  >
                    Hablar con ventas
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <GoogleCalendarSettings />

            <WhatsAppSettings
              isGoldPlan={
                subscriptionStatus?.plan === 'gold' &&
                subscriptionStatus?.status === 'active'
              }
            />

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
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4">
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-sm font-medium sm:text-base">
                      Notificaciones por email
                    </Label>
                    <p className="text-xs text-muted-foreground sm:text-sm">
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
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4">
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-sm font-medium sm:text-base">
                      Notificaciones por SMS
                    </Label>
                    <p className="text-xs text-muted-foreground sm:text-sm">
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
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4">
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-sm font-medium sm:text-base">
                      Recordatorios diarios
                    </Label>
                    <p className="text-xs text-muted-foreground sm:text-sm">
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
