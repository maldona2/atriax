import { and, eq, gte, lte, sql, isNotNull, inArray } from 'drizzle-orm';
import {
  db,
  appointments,
  patients,
  paymentRecords,
  paymentPlans,
  appointmentTreatments,
  treatments,
} from '../db/client.js';

export interface CreatePaymentPlanInput {
  patientId: string;
  totalAmountCents: number;
  installmentAmountCents: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
}

export interface UpdatePaymentPlanInput {
  installmentAmountCents?: number;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  nextPaymentDate?: string | null;
}

export interface RecordPaymentInput {
  paymentDate: string;
  paymentStatus: 'on_time' | 'late';
}

export interface PaymentStatistics {
  totalPaidCents: number;
  totalUnpaidCents: number;
  collectionRate: number;
  patientsWithBalance: number;
  averageDebtCents: number;
  totalTreatmentCostsCents: number;
  realIncomeCents: number;
  profitMarginPercentage: number;
  lastUpdated: string;
}

export interface AgingBucket {
  range: string;
  minDays: number;
  maxDays: number | null;
  totalAmountCents: number;
  patientCount: number;
  percentage: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  lastUpdated: string;
}

export interface PaymentPlanWithPatient {
  id: string;
  patientId: string;
  patientName: string;
  totalAmountCents: number;
  installmentAmountCents: number;
  frequency: string;
  startDate: string;
  nextPaymentDate: string | null;
  status: string;
  onTimePayments: number;
  latePayments: number;
  completionPercentage: number;
}

export interface PatientPaymentRecord {
  patientId: string;
  patientName: string;
  totalDebtCents: number;
  paidCents: number;
  unpaidCents: number;
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  lastPaymentDate: string | null;
}

export interface PaymentHistoryFilters {
  patientId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  minAmountCents?: number;
  maxAmountCents?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaymentHistoryResult {
  records: PatientPaymentRecord[];
  totalCount: number;
}

export interface PaymentMethodAnalytics {
  paymentMethod: string;
  totalAmountCents: number;
  transactionCount: number;
  averageAmountCents: number;
  percentage: number;
}

export class DebtDashboardService {
  async calculateTreatmentCosts(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const baseConditions = [
      eq(appointments.tenantId, tenantId),
      eq(appointments.paymentStatus, 'paid'),
    ];
    if (startDate) {
      baseConditions.push(gte(appointments.scheduledAt, new Date(startDate)));
    }
    if (endDate) {
      baseConditions.push(lte(appointments.scheduledAt, new Date(endDate)));
    }

    // Query paid appointments and join with appointment_treatments and treatments
    // to calculate total treatment costs
    const [result] = await db
      .select({
        totalCostCents: sql<number>`coalesce(sum(${appointmentTreatments.quantity} * ${treatments.costCents}), 0)`,
      })
      .from(appointments)
      .innerJoin(
        appointmentTreatments,
        eq(appointments.id, appointmentTreatments.appointmentId)
      )
      .innerJoin(
        treatments,
        eq(appointmentTreatments.treatmentId, treatments.id)
      )
      .where(and(...baseConditions, isNotNull(treatments.costCents)));

    return Number(result?.totalCostCents ?? 0);
  }

  async calculateStatistics(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaymentStatistics> {
    const baseConditions = [
      eq(appointments.tenantId, tenantId),
      isNotNull(appointments.totalAmountCents),
    ];
    if (startDate) {
      baseConditions.push(gte(appointments.scheduledAt, new Date(startDate)));
    }
    if (endDate) {
      baseConditions.push(lte(appointments.scheduledAt, new Date(endDate)));
    }

    // Sum paid appointments
    const [paidResult] = await db
      .select({
        totalPaidCents: sql<number>`coalesce(sum(${appointments.totalAmountCents}), 0)`,
      })
      .from(appointments)
      .where(and(...baseConditions, eq(appointments.paymentStatus, 'paid')));

    // Sum unpaid + partial appointments
    const [unpaidResult] = await db
      .select({
        totalUnpaidCents: sql<number>`coalesce(sum(${appointments.totalAmountCents}), 0)`,
      })
      .from(appointments)
      .where(
        and(
          ...baseConditions,
          inArray(appointments.paymentStatus, ['unpaid', 'partial'])
        )
      );

    // Count distinct patients with outstanding balance
    const [patientsWithBalanceResult] = await db
      .select({
        count: sql<number>`count(distinct ${appointments.patientId})`,
      })
      .from(appointments)
      .where(
        and(
          ...baseConditions,
          inArray(appointments.paymentStatus, ['unpaid', 'partial'])
        )
      );

    const totalPaidCents = Number(paidResult?.totalPaidCents ?? 0);
    const totalUnpaidCents = Number(unpaidResult?.totalUnpaidCents ?? 0);
    const patientsWithBalance = Number(patientsWithBalanceResult?.count ?? 0);
    const totalDebtCents = totalPaidCents + totalUnpaidCents;
    const collectionRate =
      totalDebtCents > 0 ? (totalPaidCents / totalDebtCents) * 100 : 0;
    const averageDebtCents =
      patientsWithBalance > 0
        ? Math.round(totalUnpaidCents / patientsWithBalance)
        : 0;

    // Calculate treatment costs
    const totalTreatmentCostsCents = await this.calculateTreatmentCosts(
      tenantId,
      startDate,
      endDate
    );

    // Calculate real income and profit margin
    const realIncomeCents = totalPaidCents - totalTreatmentCostsCents;
    const profitMarginPercentage =
      totalPaidCents > 0
        ? Math.round((realIncomeCents / totalPaidCents) * 10000) / 100
        : 0;

    return {
      totalPaidCents,
      totalUnpaidCents,
      collectionRate: Math.round(collectionRate * 100) / 100,
      patientsWithBalance,
      averageDebtCents,
      totalTreatmentCostsCents,
      realIncomeCents,
      profitMarginPercentage,
      lastUpdated: new Date().toISOString(),
    };
  }

  async generateAgingReport(tenantId: string): Promise<AgingReport> {
    const now = new Date();

    // Get unpaid/partial appointments per patient with their oldest date
    const unpaidAppointments = await db
      .select({
        patientId: appointments.patientId,
        scheduledAt: appointments.scheduledAt,
        totalAmountCents: appointments.totalAmountCents,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          isNotNull(appointments.totalAmountCents),
          inArray(appointments.paymentStatus, ['unpaid', 'partial'])
        )
      );

    // Aggregate per patient: sum amounts and find oldest date
    const patientDebtMap = new Map<
      string,
      { totalAmountCents: number; oldestDate: Date }
    >();

    for (const appt of unpaidAppointments) {
      const amount = appt.totalAmountCents ?? 0;
      const date = appt.scheduledAt;
      const existing = patientDebtMap.get(appt.patientId);
      if (!existing) {
        patientDebtMap.set(appt.patientId, {
          totalAmountCents: amount,
          oldestDate: date,
        });
      } else {
        patientDebtMap.set(appt.patientId, {
          totalAmountCents: existing.totalAmountCents + amount,
          oldestDate: date < existing.oldestDate ? date : existing.oldestDate,
        });
      }
    }

    const bucketDefs = [
      { range: '0-30 días', minDays: 0, maxDays: 30 },
      { range: '31-60 días', minDays: 31, maxDays: 60 },
      { range: '61-90 días', minDays: 61, maxDays: 90 },
      { range: '90+ días', minDays: 91, maxDays: null },
    ];

    const buckets = bucketDefs.map((b) => ({
      ...b,
      totalAmountCents: 0,
      patientCount: 0,
    }));

    let totalUnpaid = 0;

    for (const debt of patientDebtMap.values()) {
      const daysOutstanding = Math.floor(
        (now.getTime() - debt.oldestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalUnpaid += debt.totalAmountCents;

      for (const bucket of buckets) {
        const inBucket =
          daysOutstanding >= bucket.minDays &&
          (bucket.maxDays === null || daysOutstanding <= bucket.maxDays);
        if (inBucket) {
          bucket.totalAmountCents += debt.totalAmountCents;
          bucket.patientCount += 1;
          break;
        }
      }
    }

    const result: AgingBucket[] = buckets.map((b) => ({
      range: b.range,
      minDays: b.minDays,
      maxDays: b.maxDays,
      totalAmountCents: b.totalAmountCents,
      patientCount: b.patientCount,
      percentage:
        totalUnpaid > 0
          ? Math.round((b.totalAmountCents / totalUnpaid) * 10000) / 100
          : 0,
    }));

    return {
      buckets: result,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getPaymentPlans(
    tenantId: string,
    status?: string
  ): Promise<PaymentPlanWithPatient[]> {
    const conditions = [eq(paymentPlans.tenantId, tenantId)];
    if (status) {
      conditions.push(
        eq(
          paymentPlans.status,
          status as 'active' | 'completed' | 'delinquent' | 'cancelled'
        )
      );
    }

    const plans = await db
      .select({
        id: paymentPlans.id,
        patientId: paymentPlans.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        totalAmountCents: paymentPlans.totalAmountCents,
        installmentAmountCents: paymentPlans.installmentAmountCents,
        frequency: paymentPlans.frequency,
        startDate: paymentPlans.startDate,
        nextPaymentDate: paymentPlans.nextPaymentDate,
        status: paymentPlans.status,
        onTimePayments: paymentPlans.onTimePayments,
        latePayments: paymentPlans.latePayments,
      })
      .from(paymentPlans)
      .innerJoin(patients, eq(paymentPlans.patientId, patients.id))
      .where(and(...conditions));

    return plans.map((plan) => {
      const totalPayments = plan.onTimePayments + plan.latePayments;
      const expectedInstallments =
        plan.installmentAmountCents > 0
          ? Math.ceil(plan.totalAmountCents / plan.installmentAmountCents)
          : 1;
      const completionPercentage =
        plan.status === 'completed'
          ? 100
          : Math.min(
              100,
              Math.round((totalPayments / expectedInstallments) * 100)
            );

      return {
        id: plan.id,
        patientId: plan.patientId,
        patientName: `${plan.patientFirstName} ${plan.patientLastName}`,
        totalAmountCents: plan.totalAmountCents,
        installmentAmountCents: plan.installmentAmountCents,
        frequency: plan.frequency,
        startDate: plan.startDate.toISOString(),
        nextPaymentDate: plan.nextPaymentDate?.toISOString() ?? null,
        status: plan.status,
        onTimePayments: plan.onTimePayments,
        latePayments: plan.latePayments,
        completionPercentage,
      };
    });
  }

  async getPaymentHistory(
    tenantId: string,
    filters: PaymentHistoryFilters = {}
  ): Promise<PaymentHistoryResult> {
    const { page = 1, pageSize = 20 } = filters;

    const conditions = [
      eq(appointments.tenantId, tenantId),
      isNotNull(appointments.totalAmountCents),
    ];
    if (filters.startDate) {
      conditions.push(
        gte(appointments.scheduledAt, new Date(filters.startDate))
      );
    }
    if (filters.endDate) {
      conditions.push(lte(appointments.scheduledAt, new Date(filters.endDate)));
    }

    // Get all relevant appointments
    const apptData = await db
      .select({
        patientId: appointments.patientId,
        totalAmountCents: appointments.totalAmountCents,
        paymentStatus: appointments.paymentStatus,
        scheduledAt: appointments.scheduledAt,
      })
      .from(appointments)
      .where(and(...conditions));

    // Get patient info
    const patientData = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(patients)
      .where(eq(patients.tenantId, tenantId));

    const patientMap = new Map(
      patientData.map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    );

    // Aggregate per patient
    type PatientAgg = {
      paidCents: number;
      unpaidCents: number;
      lastPaidDate: Date | null;
    };
    const patientAgg = new Map<string, PatientAgg>();

    for (const appt of apptData) {
      const amount = appt.totalAmountCents ?? 0;
      const existing = patientAgg.get(appt.patientId) ?? {
        paidCents: 0,
        unpaidCents: 0,
        lastPaidDate: null,
      };

      if (appt.paymentStatus === 'paid') {
        existing.paidCents += amount;
        if (
          !existing.lastPaidDate ||
          appt.scheduledAt > existing.lastPaidDate
        ) {
          existing.lastPaidDate = appt.scheduledAt;
        }
      } else if (
        appt.paymentStatus === 'unpaid' ||
        appt.paymentStatus === 'partial'
      ) {
        existing.unpaidCents += amount;
      }
      // 'refunded' — skip

      patientAgg.set(appt.patientId, existing);
    }

    // Build records
    let records: PatientPaymentRecord[] = [];

    for (const [patientId, agg] of patientAgg.entries()) {
      const { paidCents, unpaidCents, lastPaidDate } = agg;
      const totalDebtCents = paidCents + unpaidCents;
      const patientName = patientMap.get(patientId) ?? 'Desconocido';

      let paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
      if (unpaidCents === 0) {
        paymentStatus = 'paid';
      } else if (paidCents === 0) {
        paymentStatus = 'unpaid';
      } else {
        paymentStatus = 'partially_paid';
      }

      records.push({
        patientId,
        patientName,
        totalDebtCents,
        paidCents,
        unpaidCents,
        paymentStatus,
        lastPaymentDate: lastPaidDate?.toISOString() ?? null,
      });
    }

    // Apply filters
    if (filters.patientId) {
      records = records.filter((r) => r.patientId === filters.patientId);
    }
    if (filters.paymentStatus) {
      records = records.filter(
        (r) => r.paymentStatus === filters.paymentStatus
      );
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      records = records.filter((r) =>
        r.patientName.toLowerCase().includes(search)
      );
    }
    if (filters.minAmountCents !== undefined) {
      records = records.filter(
        (r) => r.totalDebtCents >= filters.minAmountCents!
      );
    }
    if (filters.maxAmountCents !== undefined) {
      records = records.filter(
        (r) => r.totalDebtCents <= filters.maxAmountCents!
      );
    }

    const totalCount = records.length;
    const offset = (page - 1) * pageSize;
    const paginated = records.slice(offset, offset + pageSize);

    return { records: paginated, totalCount };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  calculateNextPaymentDate(
    from: Date,
    frequency: 'weekly' | 'biweekly' | 'monthly'
  ): Date {
    const next = new Date(from);
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (frequency === 'biweekly') {
      next.setDate(next.getDate() + 14);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  calculateRemainingBalance(
    totalAmountCents: number,
    installmentAmountCents: number,
    totalPayments: number
  ): number {
    return Math.max(
      0,
      totalAmountCents - installmentAmountCents * totalPayments
    );
  }

  shouldMarkCompleted(
    totalAmountCents: number,
    installmentAmountCents: number,
    totalPayments: number
  ): boolean {
    const paidAmount = installmentAmountCents * totalPayments;
    return paidAmount >= totalAmountCents;
  }

  private throwNotFound(message = 'Not found'): never {
    const err = new Error(message);
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  private throwConflict(message: string): never {
    const err = new Error(message);
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  private throwBadRequest(message: string): never {
    const err = new Error(message);
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  private async getPlanForTenant(id: string, tenantId: string) {
    const [plan] = await db
      .select()
      .from(paymentPlans)
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)));
    if (!plan) this.throwNotFound('Payment plan not found');
    return plan;
  }

  private async buildPlanWithPatient(plan: {
    id: string;
    patientId: string;
    totalAmountCents: number;
    installmentAmountCents: number;
    frequency: string;
    startDate: Date;
    nextPaymentDate: Date | null;
    status: string;
    onTimePayments: number;
    latePayments: number;
  }): Promise<PaymentPlanWithPatient> {
    const [patient] = await db
      .select({ firstName: patients.firstName, lastName: patients.lastName })
      .from(patients)
      .where(eq(patients.id, plan.patientId));

    const totalPayments = plan.onTimePayments + plan.latePayments;
    const expectedInstallments =
      plan.installmentAmountCents > 0
        ? Math.ceil(plan.totalAmountCents / plan.installmentAmountCents)
        : 1;
    const completionPercentage =
      plan.status === 'completed'
        ? 100
        : Math.min(
            100,
            Math.round((totalPayments / expectedInstallments) * 100)
          );

    return {
      id: plan.id,
      patientId: plan.patientId,
      patientName: patient
        ? `${patient.firstName} ${patient.lastName}`
        : 'Desconocido',
      totalAmountCents: plan.totalAmountCents,
      installmentAmountCents: plan.installmentAmountCents,
      frequency: plan.frequency,
      startDate: plan.startDate.toISOString(),
      nextPaymentDate: plan.nextPaymentDate?.toISOString() ?? null,
      status: plan.status,
      onTimePayments: plan.onTimePayments,
      latePayments: plan.latePayments,
      completionPercentage,
    };
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  async createPaymentPlan(
    tenantId: string,
    input: CreatePaymentPlanInput
  ): Promise<PaymentPlanWithPatient> {
    const {
      patientId,
      totalAmountCents,
      installmentAmountCents,
      frequency,
      startDate,
    } = input;

    if (totalAmountCents <= 0) {
      this.throwBadRequest('Total amount must be greater than 0');
    }
    if (installmentAmountCents <= 0) {
      this.throwBadRequest('Installment amount must be greater than 0');
    }
    if (installmentAmountCents > totalAmountCents) {
      this.throwBadRequest('Installment amount cannot exceed total amount');
    }

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)));
    if (!patient) this.throwNotFound('Patient not found');

    const start = new Date(startDate);
    const nextPaymentDate = this.calculateNextPaymentDate(start, frequency);

    const [created] = await db
      .insert(paymentPlans)
      .values({
        tenantId,
        patientId,
        totalAmountCents,
        installmentAmountCents,
        frequency,
        startDate: start,
        nextPaymentDate,
        status: 'active',
        onTimePayments: 0,
        latePayments: 0,
      })
      .returning();

    return this.buildPlanWithPatient(created);
  }

  async updatePaymentPlan(
    tenantId: string,
    id: string,
    input: UpdatePaymentPlanInput
  ): Promise<PaymentPlanWithPatient> {
    const plan = await this.getPlanForTenant(id, tenantId);

    if (plan.status !== 'active' && plan.status !== 'delinquent') {
      this.throwConflict('Only active or delinquent plans can be updated');
    }

    if (input.installmentAmountCents !== undefined) {
      if (input.installmentAmountCents <= 0) {
        this.throwBadRequest('Installment amount must be greater than 0');
      }
      const totalPayments = plan.onTimePayments + plan.latePayments;
      const remaining = this.calculateRemainingBalance(
        plan.totalAmountCents,
        plan.installmentAmountCents,
        totalPayments
      );
      if (input.installmentAmountCents > remaining) {
        this.throwBadRequest(
          'Installment amount cannot exceed remaining balance'
        );
      }
    }

    const updates: Partial<typeof paymentPlans.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.installmentAmountCents !== undefined) {
      updates.installmentAmountCents = input.installmentAmountCents;
    }
    if (input.frequency !== undefined) {
      updates.frequency = input.frequency;
    }
    if (input.nextPaymentDate !== undefined) {
      updates.nextPaymentDate = input.nextPaymentDate
        ? new Date(input.nextPaymentDate)
        : null;
    }

    const [updated] = await db
      .update(paymentPlans)
      .set(updates)
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)))
      .returning();

    return this.buildPlanWithPatient(updated);
  }

  async cancelPaymentPlan(tenantId: string, id: string): Promise<void> {
    const plan = await this.getPlanForTenant(id, tenantId);

    if (plan.status === 'completed') {
      this.throwConflict('Completed plans cannot be cancelled');
    }
    if (plan.status === 'cancelled') {
      this.throwConflict('Plan is already cancelled');
    }

    await db
      .update(paymentPlans)
      .set({
        status: 'cancelled',
        nextPaymentDate: null,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)));
  }

  async recordPayment(
    tenantId: string,
    id: string,
    input: RecordPaymentInput
  ): Promise<PaymentPlanWithPatient> {
    const plan = await this.getPlanForTenant(id, tenantId);

    if (plan.status !== 'active' && plan.status !== 'delinquent') {
      this.throwConflict(
        'Payments can only be recorded for active or delinquent plans'
      );
    }

    const newOnTime =
      plan.onTimePayments + (input.paymentStatus === 'on_time' ? 1 : 0);
    const newLate =
      plan.latePayments + (input.paymentStatus === 'late' ? 1 : 0);
    const totalPayments = newOnTime + newLate;

    const isCompleted = this.shouldMarkCompleted(
      plan.totalAmountCents,
      plan.installmentAmountCents,
      totalPayments
    );

    const nextPaymentDate = isCompleted
      ? null
      : this.calculateNextPaymentDate(
          new Date(input.paymentDate),
          plan.frequency as 'weekly' | 'biweekly' | 'monthly'
        );

    const [updated] = await db
      .update(paymentPlans)
      .set({
        onTimePayments: newOnTime,
        latePayments: newLate,
        nextPaymentDate,
        status: isCompleted ? 'completed' : plan.status,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)))
      .returning();

    return this.buildPlanWithPatient(updated);
  }

  async markPlanDelinquent(
    tenantId: string,
    id: string
  ): Promise<PaymentPlanWithPatient> {
    const plan = await this.getPlanForTenant(id, tenantId);

    if (plan.status !== 'active') {
      this.throwConflict('Only active plans can be marked as delinquent');
    }

    const [updated] = await db
      .update(paymentPlans)
      .set({ status: 'delinquent', updatedAt: new Date() })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)))
      .returning();

    return this.buildPlanWithPatient(updated);
  }

  async reactivatePlan(
    tenantId: string,
    id: string
  ): Promise<PaymentPlanWithPatient> {
    const plan = await this.getPlanForTenant(id, tenantId);

    if (plan.status !== 'delinquent') {
      this.throwConflict('Only delinquent plans can be reactivated');
    }

    const [updated] = await db
      .update(paymentPlans)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId)))
      .returning();

    return this.buildPlanWithPatient(updated);
  }

  async getPaymentMethodAnalytics(
    tenantId: string
  ): Promise<PaymentMethodAnalytics[]> {
    const results = await db
      .select({
        paymentMethod: paymentRecords.paymentMethod,
        totalAmountCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)`,
        transactionCount: sql<number>`count(*)`,
      })
      .from(paymentRecords)
      .where(eq(paymentRecords.tenantId, tenantId))
      .groupBy(paymentRecords.paymentMethod);

    const grandTotal = results.reduce(
      (sum, r) => sum + Number(r.totalAmountCents),
      0
    );

    return results.map((r) => {
      const total = Number(r.totalAmountCents);
      const count = Number(r.transactionCount);
      return {
        paymentMethod: r.paymentMethod,
        totalAmountCents: total,
        transactionCount: count,
        averageAmountCents: count > 0 ? Math.round(total / count) : 0,
        percentage:
          grandTotal > 0 ? Math.round((total / grandTotal) * 10000) / 100 : 0,
      };
    });
  }
}

export const debtDashboardService = new DebtDashboardService();
