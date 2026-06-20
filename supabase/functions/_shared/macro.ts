export type MacroFrequency = 'daily' | 'weekly' | 'monthly' | string;

export function macroFreshness(
  releasedAt: string | null | undefined,
  frequency: MacroFrequency,
  now = new Date(),
) {
  if (!releasedAt) return { status: 'missing' as const, ageDays: null };
  const released = new Date(releasedAt);
  if (Number.isNaN(released.getTime())) {
    return { status: 'missing' as const, ageDays: null };
  }
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - released.getTime()) / 86_400_000),
  );
  const warningAfter =
    frequency === 'monthly' ? 45 : frequency === 'weekly' ? 12 : 4;
  const staleAfter =
    frequency === 'monthly' ? 75 : frequency === 'weekly' ? 21 : 8;
  return {
    status:
      ageDays > staleAfter
        ? ('stale' as const)
        : ageDays > warningAfter
          ? ('warning' as const)
          : ('fresh' as const),
    ageDays,
  };
}

export function macroImpact(
  state: 'positive' | 'neutral' | 'negative',
) {
  return state === 'positive'
    ? '支撐市場風險承擔'
    : state === 'negative'
      ? '壓抑市場風險承擔'
      : '對市場影響中性';
}

export function normalizeMacroHistory(
  rows: Array<{
    observation_date: string;
    value: number | string;
    display_value?: string | null;
  }>,
) {
  return rows
    .map((row) => ({
      date: row.observation_date,
      value: Number(row.value),
      displayValue: row.display_value ?? String(row.value),
    }))
    .filter((row) => Number.isFinite(row.value))
    .reverse();
}
