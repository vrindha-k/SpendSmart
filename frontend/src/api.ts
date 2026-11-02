export type Transaction = {
  id: number;
  date: string;
  merchant: string;
  cents: number;
  category: string;
  kind: string;
  confidence: number;
  source: string;
};
export type Slice = { name: string; value: number };
export type Summary = {
  spending: number;
  income: number;
  net: number;
  daily: number;
  change: number | null;
  count: number;
  categories: Slice[];
  merchants: Slice[];
  trend: { month: string; spending: number; income: number }[];
  weekly: { week: string; value: number }[];
  recurring: { merchant: string; cents: number; months: number }[];
};
export const categories = [
  "Groceries",
  "Restaurants & Dining",
  "Shopping",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Education",
  "Travel",
  "Subscriptions",
  "Personal Care",
  "Other",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const error = await r
      .json()
      .catch(() => ({ detail: "Backend unavailable" }));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : JSON.stringify(error.detail),
    );
  }
  return r.json();
}
