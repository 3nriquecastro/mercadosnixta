import { TZ } from "@/lib/dates"

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return currency.format(value ?? 0)
}

const timeOnly = new Intl.DateTimeFormat("es-MX", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
})

const shortDate = new Intl.DateTimeFormat("es-MX", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export function formatTime(iso: string) {
  return timeOnly.format(new Date(iso))
}

export function formatDate(iso: string) {
  return shortDate.format(new Date(iso))
}

export const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
  cortesia: "Cortesía",
}
