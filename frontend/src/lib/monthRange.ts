export interface MonthDateRange {
  startDate: string;
  endDate: string;
}

export function getCurrentMonthValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthDateRange(monthValue: string): MonthDateRange {
  const [yearValue, monthValuePart] = monthValue.split('-');
  const year = Number(yearValue);
  const monthIndex = Number(monthValuePart) - 1;

  if (
    !/^\d{4}-\d{2}$/.test(monthValue) ||
    !Number.isInteger(year) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error('Invalid month value');
  }

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export function formatMonthValue(monthValue: string): string {
  const [yearValue, monthValuePart] = monthValue.split('-');
  const date = new Date(Number(yearValue), Number(monthValuePart) - 1, 1);

  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
