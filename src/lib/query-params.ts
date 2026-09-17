export type QueryParamValue = string | string[] | undefined;

export function readQueryParam(value: QueryParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function readNumberQueryParam(value: QueryParamValue, fallback: number) {
  const raw = readQueryParam(value);
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readEnumQueryParam<const TValues extends readonly string[]>(
  value: QueryParamValue,
  allowedValues: TValues,
): TValues[number] | undefined {
  const raw = readQueryParam(value);
  return raw && allowedValues.includes(raw as TValues[number]) ? raw as TValues[number] : undefined;
}

export function readDateQueryParam(value: QueryParamValue) {
  const raw = readQueryParam(value);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}
