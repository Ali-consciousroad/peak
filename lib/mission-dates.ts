/**
 * Mission schedule helpers (dd/mm/yyyy) — aligned with POST /api/missions validation.
 */

export function parseDdMmYyyy(dateString: string): Date {
  if (!dateString || typeof dateString !== "string") {
    throw new Error("Invalid date");
  }
  const [day, month, year] = dateString.split("/");
  if (!day || !month || !year) throw new Error("Invalid date");
  const parsedDay = parseInt(day, 10);
  const parsedMonth = parseInt(month, 10);
  const parsedYear = parseInt(year, 10);
  const parsed = new Date(parsedYear, parsedMonth - 1, parsedDay);
  if (
    parsed.getFullYear() !== parsedYear ||
    parsed.getMonth() !== parsedMonth - 1 ||
    parsed.getDate() !== parsedDay
  ) {
    throw new Error("Invalid date");
  }
  return parsed;
}

export function formatDateToDdMmYyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Format API/DB ISO date string for dd/mm/yyyy inputs. */
export function formatMissionDateInputFromApi(iso: string | Date | null | undefined): string {
  if (iso == null || iso === "") return "";
  const d = typeof iso === "string" || typeof iso === "number" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return formatDateToDdMmYyyy(d);
}

/** Calendar day difference (end − start); must be > 0. */
export function timeframeDaysFromDdMmYyyyRange(startStr: string, endStr: string): number {
  const start = parseDdMmYyyy(startStr);
  const end = parseDdMmYyyy(endStr);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  if (daysDiff <= 0) throw new Error("End date must be after start date");
  return daysDiff;
}

/** Same as create-mission form: end = start + timeframe days. */
export function endDateDdMmYyyyFromStartAndTimeframe(
  startStr: string,
  timeframeDays: number,
): string {
  const start = parseDdMmYyyy(startStr);
  const end = new Date(start);
  end.setDate(start.getDate() + timeframeDays);
  return formatDateToDdMmYyyy(end);
}

/** Timeframe in days from dd/mm range; empty string if invalid or incomplete. */
export function calculateTimeframeDdMmYyyy(
  startDate: string,
  endDate: string,
): string {
  if (!startDate || !endDate) return "";
  try {
    return String(timeframeDaysFromDdMmYyyyRange(startDate, endDate));
  } catch {
    return "";
  }
}
