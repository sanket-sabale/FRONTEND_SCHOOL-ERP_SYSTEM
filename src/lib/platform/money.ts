export type CurrencyCode = "INR";

export type Money = {
  amount: string;
  currency: CurrencyCode;
};

const scale = 100;

export function money(amount: string | number, currency: CurrencyCode = "INR"): Money {
  const decimal = typeof amount === "number" ? amount.toFixed(2) : amount;
  return { amount: toDecimalString(toMinorUnits(decimal)), currency };
}

export function zeroMoney(currency: CurrencyCode = "INR"): Money {
  return { amount: "0.00", currency };
}

export function addMoney(first: Money, second: Money): Money {
  assertSameCurrency(first, second);
  return { amount: toDecimalString(toMinorUnits(first.amount) + toMinorUnits(second.amount)), currency: first.currency };
}

export function subtractMoney(first: Money, second: Money): Money {
  assertSameCurrency(first, second);
  return { amount: toDecimalString(toMinorUnits(first.amount) - toMinorUnits(second.amount)), currency: first.currency };
}

export function multiplyMoney(value: Money, multiplier: string | number): Money {
  const factor = Number(multiplier);
  if (!Number.isFinite(factor)) throw new Error("Invalid money multiplier.");
  const result = toMinorUnits(value.amount) * factor;
  return { amount: toDecimalString(Math.round(result)), currency: value.currency };
}

export function compareMoney(first: Money, second: Money) {
  assertSameCurrency(first, second);
  const firstMinor = toMinorUnits(first.amount);
  const secondMinor = toMinorUnits(second.amount);
  return firstMinor === secondMinor ? 0 : firstMinor > secondMinor ? 1 : -1;
}

export function isPositiveMoney(value: Money) {
  return toMinorUnits(value.amount) > 0;
}

export function minMoney(first: Money, second: Money) {
  return compareMoney(first, second) <= 0 ? first : second;
}

export function formatMoney(value: Money) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value.amount));
}

export function toNumber(value: Money) {
  return Number(value.amount);
}

function assertSameCurrency(first: Money, second: Money) {
  if (first.currency !== second.currency) throw new Error("Cannot combine money values with different currencies.");
}

function toMinorUnits(amount: string) {
  const trimmed = amount.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error("Money amount must be a decimal string with up to two fraction digits.");
  const negative = trimmed.startsWith("-");
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole) * scale + Number(fraction.padEnd(2, "0"));
  return negative ? -minor : minor;
}

function toDecimalString(minorUnits: number) {
  const negative = minorUnits < 0;
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = Math.trunc(absolute / scale);
  const fraction = String(absolute % scale).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}
