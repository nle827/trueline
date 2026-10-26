/** All money in the app is integer cents. Never store floats for currency. */
export type Cents = number;

export const dollars = (amount: number): Cents => Math.round(amount * 100);

export const sum = (values: readonly Cents[]): Cents =>
  values.reduce((total, v) => total + v, 0);

/** Multiply cents by a rate (e.g. 0.35 for 35%) and round to the nearest cent. */
export const applyRate = (amount: Cents, rate: number): Cents => Math.round(amount * rate);

/** Percent of `part` relative to `whole`, as 0–100. Returns 0 when whole is 0. */
export const percentOf = (part: Cents, whole: Cents): number =>
  whole === 0 ? 0 : (part / whole) * 100;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatUSD = (amount: Cents): string => usd.format(amount / 100);
export const formatUSDWhole = (amount: Cents): string => usdWhole.format(amount / 100);

export const formatSigned = (amount: Cents): string =>
  `${amount >= 0 ? "+" : "−"}${formatUSD(Math.abs(amount))}`;
