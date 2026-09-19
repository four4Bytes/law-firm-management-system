/**
 * Appends a fetched page of rows onto an accumulated list, skipping rows that
 * are already present. Infinite-scroll accumulators can otherwise render the
 * same row twice when the underlying data shifts between page fetches (e.g. a
 * row is deleted), producing duplicate React keys.
 *
 * @param prev - Rows accumulated so far, in display order.
 * @param rows - Newly fetched page of rows.
 * @returns The merged list, or `prev` unchanged when the page adds nothing new.
 */
export function appendPage<T extends { id: string }>(prev: T[], rows: T[]): T[] {
  if (rows.length === 0) return prev;
  const seen = new Set(prev.map((row) => row.id));
  const fresh: T[] = [];
  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      fresh.push(row);
    }
  }
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh];
}
