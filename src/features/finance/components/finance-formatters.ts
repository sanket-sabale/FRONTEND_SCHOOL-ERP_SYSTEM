import type { Money } from "@/lib/platform/money";
import { formatMoney } from "@/lib/platform/money";

export function formatFinanceMoney(value: Money) {
  return formatMoney(value);
}

export function formatFinanceLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
