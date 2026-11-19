/** Normalizes a store's own "last updated" value (ms number or ISO string) to a Date, or null. */
export function toStoreUpdatedAt(value: unknown): Date | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && value !== '')) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
