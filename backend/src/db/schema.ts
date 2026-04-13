import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── tenants ────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name'),
    role: text('role', { enum: ['super_admin', 'professional'] })
      .notNull()
      .default('professional'),
    phone: text('phone'),
    specialty: text('specialty'),
    licenseNumber: text('license_number'),
    address: text('address'),
    bio: text('bio'),
    education:
      jsonb('education').$type<
        Array<{ degree: string; institution: string; year: number }>
      >(),
    workingHours: jsonb('working_hours').$type<{
      start: string;
      end: string;
      days: string[];
    }>(),
    appointmentDuration: integer('appointment_duration').default(30),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').notNull().default(true),
    isVerified: boolean('is_verified').notNull().default(false),

    // Subscription information
    subscriptionPlan: text('subscription_plan', {
      enum: ['free', 'pro', 'gold'],
    })
      .notNull()
      .default('free'),
    subscriptionStatus: text('subscription_status', {
      enum: ['active', 'paused', 'cancelled'],
    })
      .notNull()
      .default('active'),

    // Tracking timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_users_tenant').on(table.tenantId),
    index('idx_users_email').on(sql`lower(${table.email})`),
    index('idx_users_subscription_plan').on(table.subscriptionPlan),
    index('idx_users_is_verified').on(table.isVerified),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── patients ────────────────────────────────────────────────────────────────

export const patients = pgTable(
  'patients',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    dateOfBirth: text('date_of_birth'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_patients_tenant').on(table.tenantId)]
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

// ─── appointments ─────────────────────────────────────────────────────────────

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at', {
      withTimezone: true,
    }).notNull(),
    durationMinutes: integer('duration_minutes').default(60),
    status: text('status', {
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    })
      .notNull()
      .default('pending'),
    paymentStatus: text('payment_status', {
      enum: ['unpaid', 'paid', 'partial', 'refunded'],
    }).default('unpaid'),
    totalAmountCents: integer('total_amount_cents'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_appointments_tenant').on(table.tenantId),
    index('idx_appointments_patient').on(table.patientId),
    index('idx_appointments_date').on(table.scheduledAt),
  ]
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// ─── treatments ──────────────────────────────────────────────────────────────

export const treatments = pgTable(
  'treatments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceCents: integer('price_cents').notNull(),
    costCents: integer('cost_cents'),
    initialFrequencyWeeks: integer('initial_frequency_weeks'),
    initialSessionsCount: integer('initial_sessions_count'),
    maintenanceFrequencyWeeks: integer('maintenance_frequency_weeks'),
    protocolNotes: text('protocol_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_treatments_tenant').on(table.tenantId)]
);

export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;

// ─── patient_treatments ──────────────────────────────────────────────────────

export const patientTreatments = pgTable(
  'patient_treatments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    treatmentId: uuid('treatment_id')
      .notNull()
      .references(() => treatments.id, { onDelete: 'cascade' }),
    currentSession: integer('current_session').notNull().default(1),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    lastAppointmentId: uuid('last_appointment_id').references(
      () => appointments.id,
      { onDelete: 'set null' }
    ),
    isActive: boolean('is_active').notNull().default(true),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_patient_treatments_tenant').on(table.tenantId),
    index('idx_patient_treatments_patient').on(table.patientId),
    index('idx_patient_treatments_treatment').on(table.treatmentId),
  ]
);

export type PatientTreatment = typeof patientTreatments.$inferSelect;
export type NewPatientTreatment = typeof patientTreatments.$inferInsert;

// ─── appointment_treatments ───────────────────────────────────────────────────

export const appointmentTreatments = pgTable(
  'appointment_treatments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    treatmentId: uuid('treatment_id')
      .notNull()
      .references(() => treatments.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
  },
  (table) => [
    index('idx_appointment_treatments_appointment').on(table.appointmentId),
    index('idx_appointment_treatments_treatment').on(table.treatmentId),
  ]
);

export type AppointmentTreatment = typeof appointmentTreatments.$inferSelect;
export type NewAppointmentTreatment = typeof appointmentTreatments.$inferInsert;

// ─── sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    proceduresPerformed: text('procedures_performed').notNull(),
    recommendations: text('recommendations'),
    nextVisitNotes: text('next_visit_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sessions_tenant').on(table.tenantId),
    index('idx_sessions_patient').on(table.patientId),
    index('idx_sessions_appointment').on(table.appointmentId),
  ]
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ─── medical_conditions ──────────────────────────────────────────────────────

export const medicalConditions = pgTable(
  'medical_conditions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    conditionName: text('condition_name').notNull(),
    diagnosedDate: text('diagnosed_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_medical_conditions_tenant').on(table.tenantId),
    index('idx_medical_conditions_patient').on(table.patientId),
  ]
);

export type MedicalCondition = typeof medicalConditions.$inferSelect;
export type NewMedicalCondition = typeof medicalConditions.$inferInsert;

// ─── medications ─────────────────────────────────────────────────────────────

export const medications = pgTable(
  'medications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    medicationName: text('medication_name').notNull(),
    dosage: text('dosage'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_medications_tenant').on(table.tenantId),
    index('idx_medications_patient').on(table.patientId),
  ]
);

export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;

// ─── allergies ───────────────────────────────────────────────────────────────

export const allergies = pgTable(
  'allergies',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    allergenName: text('allergen_name').notNull(),
    allergyType: text('allergy_type', {
      enum: ['medication', 'food', 'other'],
    })
      .notNull()
      .default('other'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_allergies_tenant').on(table.tenantId),
    index('idx_allergies_patient').on(table.patientId),
  ]
);

export type Allergy = typeof allergies.$inferSelect;
export type NewAllergy = typeof allergies.$inferInsert;

// ─── google_calendar_tokens ───────────────────────────────────────────────────

export const googleCalendarTokens = pgTable(
  'google_calendar_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    encryptedAccessToken: text('encrypted_access_token').notNull(),
    encryptedRefreshToken: text('encrypted_refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_google_calendar_tokens_user').on(table.userId),
    index('idx_google_calendar_tokens_tenant').on(table.tenantId),
  ]
);

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type NewGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;

// ─── calendar_sync_status ─────────────────────────────────────────────────────

export const calendarSyncStatus = pgTable(
  'calendar_sync_status',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: uuid('appointment_id')
      .notNull()
      .unique()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    googleEventId: text('google_event_id'),
    status: text('status', {
      enum: ['synced', 'pending', 'failed', 'unsynced'],
    })
      .notNull()
      .default('unsynced'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_calendar_sync_status_appointment').on(table.appointmentId),
    index('idx_calendar_sync_status_tenant').on(table.tenantId),
    index('idx_calendar_sync_status_user').on(table.userId),
    index('idx_calendar_sync_status_status').on(table.status),
  ]
);

export type CalendarSyncStatus = typeof calendarSyncStatus.$inferSelect;
export type NewCalendarSyncStatus = typeof calendarSyncStatus.$inferInsert;

// ─── calendar_sync_queue ──────────────────────────────────────────────────────

export const calendarSyncQueue = pgTable(
  'calendar_sync_queue',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'cascade',
    }),
    operation: text('operation', {
      enum: ['create', 'update', 'delete', 'batch_sync'],
    }).notNull(),
    priority: integer('priority').notNull().default(5),
    status: text('status', {
      enum: ['pending', 'processing', 'completed', 'failed'],
    })
      .notNull()
      .default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(5),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    payload: jsonb('payload'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_calendar_sync_queue_tenant').on(table.tenantId),
    index('idx_calendar_sync_queue_user').on(table.userId),
    index('idx_calendar_sync_queue_status').on(table.status),
    index('idx_calendar_sync_queue_priority').on(table.priority),
    index('idx_calendar_sync_queue_next_retry').on(table.nextRetryAt),
  ]
);

export type CalendarSyncQueue = typeof calendarSyncQueue.$inferSelect;
export type NewCalendarSyncQueue = typeof calendarSyncQueue.$inferInsert;

// ─── payment_records ─────────────────────────────────────────────────────────

export const paymentRecords = pgTable(
  'payment_records',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    amountCents: integer('amount_cents').notNull(),
    paymentMethod: text('payment_method', {
      enum: ['cash', 'card', 'transfer', 'insurance', 'other'],
    })
      .notNull()
      .default('cash'),
    paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_payment_records_tenant').on(table.tenantId),
    index('idx_payment_records_patient').on(table.patientId),
    index('idx_payment_records_payment_date').on(table.paymentDate),
  ]
);

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type NewPaymentRecord = typeof paymentRecords.$inferInsert;

// ─── payment_plans ────────────────────────────────────────────────────────────

export const paymentPlans = pgTable(
  'payment_plans',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    totalAmountCents: integer('total_amount_cents').notNull(),
    installmentAmountCents: integer('installment_amount_cents').notNull(),
    frequency: text('frequency', {
      enum: ['weekly', 'biweekly', 'monthly'],
    })
      .notNull()
      .default('monthly'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    nextPaymentDate: timestamp('next_payment_date', { withTimezone: true }),
    status: text('status', {
      enum: ['active', 'completed', 'delinquent', 'cancelled'],
    })
      .notNull()
      .default('active'),
    onTimePayments: integer('on_time_payments').notNull().default(0),
    latePayments: integer('late_payments').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_payment_plans_tenant').on(table.tenantId),
    index('idx_payment_plans_patient').on(table.patientId),
    index('idx_payment_plans_status').on(table.status),
  ]
);

export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type NewPaymentPlan = typeof paymentPlans.$inferInsert;

// ─── whatsapp_messages ────────────────────────────────────────────────────────

export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Patient phone number in E.164 format */
    phoneNumber: text('phone_number').notNull(),
    direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    /** Meta's message ID for deduplication */
    metaMessageId: text('meta_message_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_whatsapp_messages_tenant').on(table.tenantId),
    index('idx_whatsapp_messages_phone').on(table.phoneNumber),
    index('idx_whatsapp_messages_meta_id').on(table.metaMessageId),
  ]
);

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type NewWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ─── relations ───────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  appointments: many(appointments),
  treatments: many(treatments),
  sessions: many(sessions),
  medicalConditions: many(medicalConditions),
  medications: many(medications),
  allergies: many(allergies),
  googleCalendarTokens: many(googleCalendarTokens),
  calendarSyncStatus: many(calendarSyncStatus),
  calendarSyncQueue: many(calendarSyncQueue),
  sessionPhotos: many(sessionPhotos),
  paymentRecords: many(paymentRecords),
  paymentPlans: many(paymentPlans),
  whatsappMessages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(
  whatsappMessages,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [whatsappMessages.tenantId],
      references: [tenants.id],
    }),
  })
);

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [patients.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
  sessions: many(sessions),
  medicalConditions: many(medicalConditions),
  medications: many(medications),
  allergies: many(allergies),
  sessionPhotos: many(sessionPhotos),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [appointments.tenantId],
      references: [tenants.id],
    }),
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.id],
    }),
    appointmentTreatments: many(appointmentTreatments),
    session: many(sessions),
  })
);

export const treatmentsRelations = relations(treatments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [treatments.tenantId],
    references: [tenants.id],
  }),
  patientTreatments: many(patientTreatments),
}));

export const patientTreatmentsRelations = relations(
  patientTreatments,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [patientTreatments.tenantId],
      references: [tenants.id],
    }),
    patient: one(patients, {
      fields: [patientTreatments.patientId],
      references: [patients.id],
    }),
    treatment: one(treatments, {
      fields: [patientTreatments.treatmentId],
      references: [treatments.id],
    }),
    lastAppointment: one(appointments, {
      fields: [patientTreatments.lastAppointmentId],
      references: [appointments.id],
    }),
  })
);

export const appointmentTreatmentsRelations = relations(
  appointmentTreatments,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [appointmentTreatments.appointmentId],
      references: [appointments.id],
    }),
    treatment: one(treatments, {
      fields: [appointmentTreatments.treatmentId],
      references: [treatments.id],
    }),
  })
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  appointment: one(appointments, {
    fields: [sessions.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id],
  }),
  sessionPhotos: many(sessionPhotos),
}));

export const medicalConditionsRelations = relations(
  medicalConditions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [medicalConditions.tenantId],
      references: [tenants.id],
    }),
    patient: one(patients, {
      fields: [medicalConditions.patientId],
      references: [patients.id],
    }),
  })
);

export const medicationsRelations = relations(medications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [medications.tenantId],
    references: [tenants.id],
  }),
  patient: one(patients, {
    fields: [medications.patientId],
    references: [patients.id],
  }),
}));

export const allergiesRelations = relations(allergies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [allergies.tenantId],
    references: [tenants.id],
  }),
  patient: one(patients, {
    fields: [allergies.patientId],
    references: [patients.id],
  }),
}));

export const googleCalendarTokensRelations = relations(
  googleCalendarTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [googleCalendarTokens.userId],
      references: [users.id],
    }),
    tenant: one(tenants, {
      fields: [googleCalendarTokens.tenantId],
      references: [tenants.id],
    }),
  })
);

export const calendarSyncStatusRelations = relations(
  calendarSyncStatus,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [calendarSyncStatus.appointmentId],
      references: [appointments.id],
    }),
    tenant: one(tenants, {
      fields: [calendarSyncStatus.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [calendarSyncStatus.userId],
      references: [users.id],
    }),
  })
);

export const calendarSyncQueueRelations = relations(
  calendarSyncQueue,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [calendarSyncQueue.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [calendarSyncQueue.userId],
      references: [users.id],
    }),
    appointment: one(appointments, {
      fields: [calendarSyncQueue.appointmentId],
      references: [appointments.id],
    }),
  })
);

// ─── subscriptions ───────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    preapprovalId: text('preapproval_id').unique().notNull(),
    plan: text('plan', { enum: ['pro', 'gold'] }).notNull(),
    status: text('status', {
      enum: ['authorized', 'cancelled', 'paused', 'failed'],
    }).notNull(),
    billingPeriodStart: timestamp('billing_period_start', {
      withTimezone: true,
    }).notNull(),
    billingPeriodEnd: timestamp('billing_period_end', {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_subscriptions_user_id').on(table.userId),
    index('idx_subscriptions_preapproval_id').on(table.preapprovalId),
    index('idx_subscriptions_status').on(table.status),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// ─── webhook_events ──────────────────────────────────────────────────────────

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    webhookId: text('webhook_id').unique().notNull(),
    webhookType: text('webhook_type', {
      enum: ['payment', 'preapproval'],
    }).notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', {
      withTimezone: true,
    }).defaultNow(),
    userId: uuid('user_id').references(() => users.id),
    action: text('action'),
    signatureValid: boolean('signature_valid').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_webhook_events_webhook_id').on(table.webhookId),
    index('idx_webhook_events_user_id').on(table.userId),
    index('idx_webhook_events_created_at').on(table.createdAt),
  ]
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

// ─── model_pricing ───────────────────────────────────────────────────────────

export const modelPricing = pgTable(
  'model_pricing',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    modelName: text('model_name').unique().notNull(),
    inputTokenPriceUsd: text('input_token_price_usd').notNull(), // Stored as string for precision
    outputTokenPriceUsd: text('output_token_price_usd').notNull(), // Stored as string for precision
    effectiveDate: timestamp('effective_date', {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_model_pricing_model_name').on(table.modelName)]
);

export type ModelPricing = typeof modelPricing.$inferSelect;
export type NewModelPricing = typeof modelPricing.$inferInsert;

// ─── verification_tokens ─────────────────────────────────────────────────────

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_verification_tokens_user_id').on(table.userId),
    index('idx_verification_tokens_token').on(table.token),
    index('idx_verification_tokens_expires_at').on(table.expiresAt),
  ]
);

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// ─── patient_counts ──────────────────────────────────────────────────────────

export const patientCounts = pgTable(
  'patient_counts',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    count: integer('count').notNull().default(0),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_patient_counts_user_id').on(table.userId)]
);

export type PatientCount = typeof patientCounts.$inferSelect;
export type NewPatientCount = typeof patientCounts.$inferInsert;

// ─── subscription relations ──────────────────────────────────────────────────

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  user: one(users, {
    fields: [webhookEvents.userId],
    references: [users.id],
  }),
}));

export const verificationTokensRelations = relations(
  verificationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [verificationTokens.userId],
      references: [users.id],
    }),
  })
);

export const patientCountsRelations = relations(patientCounts, ({ one }) => ({
  user: one(users, {
    fields: [patientCounts.userId],
    references: [users.id],
  }),
}));

// ─── password_reset_tokens ───────────────────────────────────────────────────

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').unique().notNull(), // SHA-256 of raw token
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_prt_user_id').on(table.userId),
    index('idx_prt_token_hash').on(table.tokenHash),
    index('idx_prt_expires_at').on(table.expiresAt),
  ]
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);

// ─── session_photos ──────────────────────────────────────────────────────────

export const sessionPhotos = pgTable(
  'session_photos',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    s3Key: text('s3_key').notNull(),
    fileName: text('file_name').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    mimeType: text('mime_type', {
      enum: ['image/jpeg', 'image/png', 'image/webp'],
    }).notNull(),
    status: text('status', { enum: ['pending', 'confirmed'] })
      .notNull()
      .default('pending'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_session_photos_tenant').on(table.tenantId),
    index('idx_session_photos_session').on(table.sessionId),
    index('idx_session_photos_status').on(table.status),
    index('idx_session_photos_created_at').on(table.createdAt),
  ]
);

export type SessionPhoto = typeof sessionPhotos.$inferSelect;
export type NewSessionPhoto = typeof sessionPhotos.$inferInsert;

export const sessionPhotosRelations = relations(sessionPhotos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sessionPhotos.tenantId],
    references: [tenants.id],
  }),
  session: one(sessions, {
    fields: [sessionPhotos.sessionId],
    references: [sessions.id],
  }),
  patient: one(patients, {
    fields: [sessionPhotos.patientId],
    references: [patients.id],
  }),
}));

// ─── daily_appointment_usage ──────────────────────────────────────────────────

export const dailyAppointmentUsage = pgTable(
  'daily_appointment_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usageDate: date('usage_date').notNull(),
    count: integer('count').notNull().default(0),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.usageDate] }),
    index('idx_daily_appointment_usage_date').on(table.usageDate),
  ]
);

export type DailyAppointmentUsage = typeof dailyAppointmentUsage.$inferSelect;
export type NewDailyAppointmentUsage =
  typeof dailyAppointmentUsage.$inferInsert;

export const dailyAppointmentUsageRelations = relations(
  dailyAppointmentUsage,
  ({ one }) => ({
    user: one(users, {
      fields: [dailyAppointmentUsage.userId],
      references: [users.id],
    }),
  })
);

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentRecords.tenantId],
    references: [tenants.id],
  }),
  patient: one(patients, {
    fields: [paymentRecords.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [paymentRecords.appointmentId],
    references: [appointments.id],
  }),
}));

// ─── reminder_deliveries ──────────────────────────────────────────────────────

export const reminderDeliveries = pgTable(
  'reminder_deliveries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    patientEmail: text('patient_email').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
    status: text('status', { enum: ['sent', 'failed', 'skipped'] })
      .notNull()
      .default('sent'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
  },
  (table) => [
    index('idx_reminder_deliveries_appointment').on(table.appointmentId),
    index('idx_reminder_deliveries_tenant').on(table.tenantId),
    index('idx_reminder_deliveries_sent_at').on(table.sentAt),
    index('idx_reminder_deliveries_status').on(table.status),
  ]
);

export type ReminderDelivery = typeof reminderDeliveries.$inferSelect;
export type NewReminderDelivery = typeof reminderDeliveries.$inferInsert;

// ─── reminder_opt_outs ────────────────────────────────────────────────────────

export const reminderOptOuts = pgTable(
  'reminder_opt_outs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    optedOutAt: timestamp('opted_out_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_reminder_opt_outs_patient').on(table.patientId),
    index('idx_reminder_opt_outs_tenant').on(table.tenantId),
  ]
);

export type ReminderOptOut = typeof reminderOptOuts.$inferSelect;
export type NewReminderOptOut = typeof reminderOptOuts.$inferInsert;

export const reminderDeliveriesRelations = relations(
  reminderDeliveries,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [reminderDeliveries.tenantId],
      references: [tenants.id],
    }),
    appointment: one(appointments, {
      fields: [reminderDeliveries.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [reminderDeliveries.patientId],
      references: [patients.id],
    }),
  })
);

export const reminderOptOutsRelations = relations(
  reminderOptOuts,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [reminderOptOuts.tenantId],
      references: [tenants.id],
    }),
    patient: one(patients, {
      fields: [reminderOptOuts.patientId],
      references: [patients.id],
    }),
  })
);

export const paymentPlansRelations = relations(paymentPlans, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentPlans.tenantId],
    references: [tenants.id],
  }),
  patient: one(patients, {
    fields: [paymentPlans.patientId],
    references: [patients.id],
  }),
}));
