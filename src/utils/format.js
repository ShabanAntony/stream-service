export function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

export function daysBetween(a, b) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / dayMs);
}

export function getAgeTier(createdAt) {
  if (!createdAt) {
    return '';
  }

  const created = new Date(createdAt);
  const now = new Date();
  const ageDays = daysBetween(created, now);

  // < 6 months
  if (ageDays < 183) {
    return 'recruit';
  }

  // < 24 months
  if (ageDays < 730) {
    return 'experienced';
  }

  return 'veteran';
}

export function ageTierLabel(tier) {
  if (tier === 'recruit') return 'Recruit';
  if (tier === 'experienced') return 'Experienced';
  if (tier === 'veteran') return 'Veteran';
  return '';
}

