export function readList<T>(data: unknown, isError: boolean): { items: T[]; failed: boolean } {
  if (isError || (data != null && !Array.isArray(data))) {
    return { items: [], failed: true };
  }

  return { items: (data as T[] | undefined) ?? [], failed: false };
}
