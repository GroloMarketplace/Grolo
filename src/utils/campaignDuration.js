export const CAMPAIGN_MIN_DAYS = 1;
export const CAMPAIGN_MAX_DAYS = 14;
export const CAMPAIGN_DURATION_ERROR = "Each promotion may run for up to 14 days.";

export function addCalendarDays(dateKey, days) {
  const [year, month, day] = String(dateKey).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function calendarDateKey(value = Date.now()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDayNumber(dateKey) {
  const [year, month, day] = String(dateKey).slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

export function calendarDaysUntil(dateKey, now = Date.now()) {
  return calendarDayNumber(dateKey) - calendarDayNumber(calendarDateKey(now));
}

function dateDifferenceInDays(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 86400000) : null;
}

export function campaignDurationDays(startsAt, endsAt) {
  const difference = dateDifferenceInDays(startsAt, endsAt);
  return difference === null ? null : difference + 1;
}

export function validateCampaignDates({ startsAt, endsAt }, { existingAd } = {}) {
  if (!startsAt) return "Choose a campaign start date.";
  if (!endsAt) return "Choose a campaign end date.";
  const duration = campaignDurationDays(startsAt, endsAt);
  const existingDuration = existingAd ? campaignDurationDays(existingAd.startsAt, existingAd.endsAt) : null;
  const datesUnchanged = existingAd?.startsAt === startsAt && existingAd?.endsAt === endsAt;
  if (datesUnchanged && existingDuration > CAMPAIGN_MAX_DAYS) return "";
  if (duration === null || duration < CAMPAIGN_MIN_DAYS) return "The campaign must run for at least 1 day.";
  if (duration > CAMPAIGN_MAX_DAYS) return CAMPAIGN_DURATION_ERROR;
  return "";
}
