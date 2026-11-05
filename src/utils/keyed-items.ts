/**
 * Identify immutable display values by content, disambiguating equal values.
 * Distinct values retain their keys when reordered or when siblings are removed.
 * Editable rows must instead carry an ID assigned when the row is created.
 */
export function keyedItems<T>(items: readonly T[], identity: (item: T) => string) {
  const occurrences = new Map<string, number>();
  return items.map((item) => {
    const value = identity(item);
    const occurrence = occurrences.get(value) ?? 0;
    occurrences.set(value, occurrence + 1);
    return { item, key: JSON.stringify([value, occurrence]) };
  });
}
