import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CreditCard,
  Search,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useDebtStatistics } from '@/hooks/useDebtStatistics';
import { useAgingReport } from '@/hooks/useAgingReport';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { usePaymentMethodAnalytics } from '@/hooks/usePaymentMethodAnalytics';
import { usePatientAppointments } from '@/hooks/usePatientAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type {
  PaymentHistoryFilters,
  PatientPaymentRecord,
} from '@/types/debtDashboard';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

function formatCurrency(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-AR')}`;
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {change && (
          <div className="mt-4 flex items-center gap-2">
            {changeType === 'positive' && (
              <ArrowUpRight className="h-4 w-4 text-primary" />
            )}
            <span
              className={`text-sm font-medium ${
                changeType === 'positive'
                  ? 'text-primary'
                  : changeType === 'negative'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }`}
            >
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const statistics = useDebtStatistics();
  const paymentMethods = usePaymentMethodAnalytics();

  // Build a simple 2-point area chart from paid vs unpaid
  const trendData = statistics.data
    ? [
        {
          label: 'Cobrado',
          collected: statistics.data.totalPaidCents / 100,
          pending: 0,
        },
        {
          label: 'Pendiente',
          collected: 0,
          pending: statistics.data.totalUnpaidCents / 100,
        },
      ]
    : [];

  const methodsData = paymentMethods.data.map((m, i) => ({
    name: m.paymentMethod,
    value: m.percentage,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Trends chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Resumen Financiero
              </CardTitle>
              <CardDescription>Pagos cobrados vs pendientes</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">Cobrado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 shrink-0 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Pendiente</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statistics.loading ? (
            <Skeleton className="h-[200px] w-full sm:h-[300px]" />
          ) : (
            <ChartContainer
              config={{
                collected: {
                  label: 'Cobrado',
                  color: 'hsl(var(--chart-1))',
                },
                pending: {
                  label: 'Pendiente',
                  color: 'hsl(var(--chart-3))',
                },
              }}
              className="h-[200px] sm:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorCollected"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorPending"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{
                      stroke: 'hsl(var(--muted-foreground))',
                      strokeDasharray: '5 5',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                    name="Cobrado"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPending)"
                    name="Pendiente"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment methods chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Métodos de Pago
          </CardTitle>
          <CardDescription>Distribución por tipo de pago</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.loading ? (
            <Skeleton className="h-[200px] w-full sm:h-[300px]" />
          ) : methodsData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center sm:h-[300px]">
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            </div>
          ) : (
            <>
              <ChartContainer
                config={{ value: { label: 'Porcentaje' } }}
                className="h-[180px] sm:h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodsData}
                      cx="50%"
                      cy="50%"
                      innerRadius="40%"
                      outerRadius="70%"
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {methodsData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-lg">
                              <p className="font-medium text-card-foreground">
                                {payload[0].name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].value}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-2">
                {methodsData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-sm text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="ml-auto shrink-0 text-sm font-medium">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgingTab() {
  const { data, loading } = useAgingReport();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const buckets = data?.buckets ?? [];
  const barData = buckets.map((b) => ({
    range: b.range,
    amount: b.totalAmountCents / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Distribución por Antigüedad
            </CardTitle>
            <CardDescription>Deudas agrupadas por días de mora</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: { label: 'Monto', color: 'hsl(var(--chart-1))' },
              }}
              className="h-[180px] sm:h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="range"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="amount"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    name="Monto"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Resumen de Antigüedad
            </CardTitle>
            <CardDescription>Total por rango de días</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {buckets.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.range}</span>
                  <span className="font-medium">
                    {formatCurrency(item.totalAmountCents)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={item.percentage} className="h-2 flex-1" />
                  <span className="w-10 text-xs text-muted-foreground">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.patientCount} pacientes
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Detalle por Antigüedad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[400px]">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Rango</TableHead>
                <TableHead className="text-muted-foreground">
                  Pacientes
                </TableHead>
                <TableHead className="text-muted-foreground">Monto</TableHead>
                <TableHead className="text-muted-foreground">
                  Porcentaje
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((item, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="font-medium whitespace-nowrap">
                    {item.range}
                  </TableCell>
                  <TableCell>{item.patientCount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(item.totalAmountCents)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PlansTab() {
  const { data: plans, loading } = usePaymentPlans();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
            Activo
          </Badge>
        );
      case 'delinquent':
        return (
          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
            Moroso
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-chart-2/20 text-chart-2 hover:bg-chart-2/30">
            Completado
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No hay planes de pago registrados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{plan.patientName}</h3>
                  {getStatusBadge(plan.status)}
                </div>
                {plan.nextPaymentDate && (
                  <p className="text-sm text-muted-foreground">
                    Próximo pago:{' '}
                    {new Date(plan.nextPaymentDate).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatCurrency(
                      plan.installmentAmountCents *
                        (plan.onTimePayments + plan.latePayments)
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatCurrency(plan.totalAmountCents)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.onTimePayments + plan.latePayments > 0 &&
                    `${plan.latePayments} cuotas tardías`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">
                  {plan.completionPercentage}%
                </span>
              </div>
              <Progress value={plan.completionPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const apptStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const apptPaymentLabels: Record<string, string> = {
  unpaid: 'Sin pagar',
  paid: 'Pagado',
  partial: 'Parcial',
  refunded: 'Reembolsado',
};

function getPaymentBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
          Pagado
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-chart-3/20 text-chart-3 hover:bg-chart-3/30">
          Parcial
        </Badge>
      );
    case 'unpaid':
      return (
        <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
          Sin pagar
        </Badge>
      );
    case 'refunded':
      return <Badge variant="outline">Reembolsado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function PatientAppointmentsSheet({
  patient,
  onClose,
}: {
  patient: PatientPaymentRecord | null;
  onClose: () => void;
}) {
  const { data: appts, loading } = usePatientAppointments(
    patient?.patientId ?? null
  );

  return (
    <Sheet open={patient !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <SheetTitle>{patient?.patientName}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Cobrado: </span>
                <span className="font-medium text-primary">
                  {patient ? formatCurrency(patient.paidCents) : '—'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Pendiente: </span>
                <span
                  className={`font-medium ${patient && patient.unpaidCents > 0 ? 'text-destructive' : ''}`}
                >
                  {patient ? formatCurrency(patient.unpaidCents) : '—'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">
                  {patient ? formatCurrency(patient.totalDebtCents) : '—'}
                </span>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : appts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay turnos registrados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Turno</TableHead>
                <TableHead className="text-muted-foreground">Pago</TableHead>
                <TableHead className="text-right text-muted-foreground">
                  Monto
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appts.map((appt) => (
                <TableRow
                  key={appt.id}
                  className={`border-border ${
                    appt.paymentStatus === 'unpaid' ||
                    appt.paymentStatus === 'partial'
                      ? 'bg-destructive/5'
                      : ''
                  }`}
                >
                  <TableCell className="text-sm">
                    {new Date(appt.scheduledAt).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apptStatusLabels[appt.status] ?? appt.status}
                  </TableCell>
                  <TableCell>{getPaymentBadge(appt.paymentStatus)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {appt.totalAmountCents != null
                      ? formatCurrency(appt.totalAmountCents)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HistoryTab() {
  const [filters, setFilters] = useState<PaymentHistoryFilters>({
    page: 1,
    pageSize: 20,
  });
  const [selectedPatient, setSelectedPatient] =
    useState<PatientPaymentRecord | null>(null);

  const { records, totalCount, loading } = usePaymentHistory(filters);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
            Pagado
          </Badge>
        );
      case 'partially_paid':
        return (
          <Badge className="bg-chart-3/20 text-chart-3 hover:bg-chart-3/30">
            Parcial
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Desktop filters */}
        <div className="hidden flex-col gap-4 md:flex md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
              }
              className="pl-9"
            />
          </div>
          <Select
            value={filters.paymentStatus ?? 'all'}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                paymentStatus:
                  v === 'all'
                    ? undefined
                    : (v as PaymentHistoryFilters['paymentStatus']),
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="unpaid">Pendiente</SelectItem>
              <SelectItem value="partially_paid">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {totalCount} registros
          </span>
        </div>

        {/* Mobile search + filter panel */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
              }
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filters.paymentStatus ?? 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  paymentStatus:
                    v === 'all'
                      ? undefined
                      : (v as PaymentHistoryFilters['paymentStatus']),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="unpaid">Pendiente</SelectItem>
                <SelectItem value="partially_paid">Parcial</SelectItem>
              </SelectContent>
            </Select>
            {filters.paymentStatus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    paymentStatus: undefined,
                    page: 1,
                  }))
                }
              >
                Limpiar
              </Button>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {totalCount} registros
          </span>
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-2 md:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
            ))
          ) : records.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay registros.
            </p>
          ) : (
            records.map((r) => (
              <Card
                key={r.patientId}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSelectedPatient(r)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        Pendiente:{' '}
                        <span
                          className={
                            r.unpaidCents > 0 ? 'text-destructive' : ''
                          }
                        >
                          {formatCurrency(r.unpaidCents)}
                        </span>
                      </p>
                    </div>
                    {getStatusBadge(r.paymentStatus)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop table */}
        <Card className="hidden md:block">
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">
                      Paciente
                    </TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">
                      Deuda total
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Cobrado
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Pendiente
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Estado
                    </TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">
                      Último pago
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No hay registros.
                      </TableCell>
                    </TableRow>
                  )}
                  {records.map((r) => (
                    <TableRow
                      key={r.patientId}
                      className="cursor-pointer border-border hover:bg-accent/50"
                      onClick={() => setSelectedPatient(r)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.patientName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrency(r.totalDebtCents)}
                      </TableCell>
                      <TableCell className="text-primary whitespace-nowrap">
                        {formatCurrency(r.paidCents)}
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap ${r.unpaidCents > 0 ? 'text-destructive' : ''}`}
                      >
                        {formatCurrency(r.unpaidCents)}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.paymentStatus)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {r.lastPaymentDate
                          ? new Date(r.lastPaymentDate).toLocaleDateString(
                              'es-AR'
                            )
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PatientAppointmentsSheet
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </>
  );
}

export function DebtDashboardPage() {
  const statistics = useDebtStatistics();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    statistics.refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const stats = statistics.data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Deudas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento de pagos de pacientes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cobrado"
          value={stats ? formatCurrency(stats.totalPaidCents) : '—'}
          icon={DollarSign}
          subtitle="Turnos pagados"
          loading={statistics.loading}
        />
        <StatCard
          title="Pendiente de Cobro"
          value={stats ? formatCurrency(stats.totalUnpaidCents) : '—'}
          icon={Clock}
          subtitle={
            stats ? `${stats.patientsWithBalance} pacientes` : undefined
          }
          loading={statistics.loading}
        />
        <StatCard
          title="Deuda Promedio"
          value={stats ? formatCurrency(stats.averageDebtCents) : '—'}
          icon={Users}
          subtitle="Por paciente con saldo"
          loading={statistics.loading}
        />
        <StatCard
          title="Tasa de Recuperación"
          value={stats ? `${stats.collectionRate.toFixed(1)}%` : '—'}
          icon={TrendingUp}
          changeType="positive"
          loading={statistics.loading}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max min-w-full justify-start bg-secondary p-1">
            <TabsTrigger value="overview" className="whitespace-nowrap">
              Vista General
            </TabsTrigger>
            <TabsTrigger value="aging" className="whitespace-nowrap">
              Antigüedad
            </TabsTrigger>
            <TabsTrigger value="plans" className="whitespace-nowrap">
              Planes de Pago
            </TabsTrigger>
            <TabsTrigger value="history" className="whitespace-nowrap">
              Historial
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        <TabsContent value="overview" className="min-w-0 space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="aging" className="min-w-0">
          <AgingTab />
        </TabsContent>

        <TabsContent value="plans" className="min-w-0">
          <PlansTab />
        </TabsContent>

        <TabsContent value="history" className="min-w-0">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
