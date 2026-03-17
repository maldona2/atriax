/**
 * Patient count tracking model
 */
export interface PatientCount {
  userId: string;
  count: number;
  lastUpdated: Date;
}