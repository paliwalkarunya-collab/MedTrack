// Expiry utility functions used by expiry components.
// Status thresholds align with ExpiryStatusBadge labels:
//   expired  – expiry date has passed
//   critical – 0-7 days remaining
//   expiring – 8-90 days remaining
//   safe     – more than 90 days remaining

/**
 * Calculate the number of whole days remaining until a given expiry date.
 * Returns a negative value if the date has already passed.
 */
export const getDaysRemaining = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  // Zero out the time portion so we get whole-day differences.
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

/**
 * Determine the expiry status category for a given number of daysRemaining.
 */
export const getExpiryStatus = (daysRemaining) => {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 90) return 'expiring';
  return 'safe';
};

/**
 * Format an expiry date string into a human-readable localised date.
 */
export const formatExpiryDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format daysRemaining into a concise human-readable label.
 * Used by ExpiryTable and ExpiryDetailsModal.
 */
export const formatDaysRemaining = (days) => {
  if (days == null || Number.isNaN(days)) return '—';
  if (days < 0) {
    const absDays = Math.abs(days);
    return `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
};
