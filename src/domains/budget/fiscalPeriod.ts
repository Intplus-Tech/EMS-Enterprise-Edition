/**
 * Fiscal-period definition shared by the admin screens and the admin hook.
 *
 * A budget period is keyed server-side by (department, periodName), so the name
 * and the window it covers have to be derived the same way everywhere — the Set
 * Budget modal, the Edit Department modal and `useAdminAdministration` all
 * allocate against the same period when the admin picks the same year.
 * Pure data: safe to import from a client component.
 */

/** The window a fiscal year covers, in the shape the budget API accepts. */
export interface FiscalPeriod {
  periodName: string;
  startDate: string;
  endDate: string;
}

/**
 * The calendar year `year`, named `FY-<year>` to match the `periodName` shown
 * in the designs. UTC so the boundaries do not shift with the viewer's zone.
 */
export function fiscalPeriodFor(year: number): FiscalPeriod {
  return {
    periodName: `FY-${year}`,
    startDate: new Date(Date.UTC(year, 0, 1)).toISOString(),
    endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString(),
  };
}

/** Default window when a screen does not ask for a specific one. */
export function currentFiscalPeriod(): FiscalPeriod {
  return fiscalPeriodFor(new Date().getFullYear());
}

/** True when `date` falls inside the period — used to pick the active one. */
export function periodCovers(
  period: { startDate: string; endDate: string },
  date: Date = new Date()
): boolean {
  const at = date.getTime();
  return Date.parse(period.startDate) <= at && at <= Date.parse(period.endDate);
}
