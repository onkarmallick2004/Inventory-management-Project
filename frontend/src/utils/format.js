// Formatting helpers used across pages.

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

// "IN_PROGRESS" -> "In progress"
export const label = (value) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '';

// Whole days from today (negative = in the past).
export const daysFromToday = (value) => {
  if (!value) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - start) / 86400000);
};

export const relativeDays = (value) => {
  const days = daysFromToday(value);
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days < 0) return `${-days} days overdue`;
  return `in ${days} days`;
};

// Today's date as YYYY-MM-DD for <input type="date">.
export const todayInput = () => new Date().toISOString().slice(0, 10);
