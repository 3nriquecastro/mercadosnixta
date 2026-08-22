"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/format"
import { Banknote, CreditCard, Gift, Layers } from "lucide-react"
import type { PaymentMethod } from "@/lib/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  submitting: boolean
  onConfirm: (method: PaymentMethod, cashReceived: number | null, change: number | null) => void
}

const METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: "efectivo", label: "Efectivo", icon: Banknote },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "mixto", label: "Mixto", icon: Layers },
  { key: "cortesia", label: "Cortesía total", icon: Gift },
]

export function PaymentDialog({ open, onOpenChange, total, submitting, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [cash, setCash] = useState("")

  useEffect(() => {
    if (open) {
      setMethod(null)
      setCash("")
    }
  }, [open])

  const cashNum = Number.parseFloat(cash) || 0
  const showCash = method === "efectivo" || method === "mixto"

  // Change is only relevant for pure cash payment
  const change = useMemo(() => (method === "efectivo" && cashNum > total ? cashNum - total : 0), [method, cashNum, total])

  // Card amount for mixed payment
  const cardAmount = useMemo(() => (method === "mixto" ? Math.max(0, total - cashNum) : 0), [method, total, cashNum])

  // Quick amounts for cash payment (round up options)
  const quickAmounts = useMemo(() => {
    const opts = new Set<number>()
    opts.add(Math.ceil(total / 50) * 50)
    opts.add(Math.ceil(total / 100) * 100)
    opts.add(Math.ceil(total / 100) * 100 + 100)
    return [...opts].filter((n) => n >= total).sort((a, b) => a - b).slice(0, 3)
  }, [total])

  // Quick amounts for mixed payment (common bills less than total, or exactly 50%)
  const quickMixedAmounts = useMemo(() => {
    const opts = new Set<number>()
    const bills = [20, 50, 100, 200, 500]
    for (const bill of bills) {
      if (bill < total) {
        opts.add(bill)
      }
    }
    const half = Math.round(total / 2)
    if (half > 0 && half < total) {
      opts.add(half)
    }
    return [...opts].sort((a, b) => a - b)
  }, [total])

  const canConfirm =
    method !== null &&
    !submitting &&
    (method === "cortesia" ||
      (total > 0 &&
        (method === "tarjeta" ||
          (method === "efectivo" && (cashNum === 0 || cashNum >= total)) ||
          (method === "mixto" && cashNum > 0 && cashNum < total))))

  const handleConfirm = () => {
    if (!method) return
    const received = showCash && cashNum > 0 ? cashNum : null
    // Mixed payment has no change given (change is 0 / null)
    const changeGiven = method === "efectivo" && received && change > 0 ? change : null
    onConfirm(method, received, changeGiven)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Cobrar</DialogTitle>
          <DialogDescription>Selecciona el método de pago</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-secondary px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            {method === "cortesia" ? "Total en cortesía" : "Total a cobrar"}
          </p>
          <p className="font-serif text-4xl font-semibold text-foreground">
            {formatMoney(method === "cortesia" ? 0 : total)}
          </p>
          {method === "cortesia" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Valor original: <span className="line-through">{formatMoney(total)}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {METHODS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMethod(key)
                setCash("")
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors",
                method === key
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {showCash && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cash">
                {method === "mixto" ? "Monto en efectivo" : "Efectivo recibido"}
              </Label>
              <Input
                id="cash"
                inputMode="decimal"
                placeholder="0"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="h-14 text-center text-2xl font-semibold"
              />
            </div>

            {/* Render appropriate quick amount buttons */}
            {method === "efectivo" && quickAmounts.length > 0 && (
              <div className="flex gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCash(String(amt))}
                    className="flex-1 rounded-xl border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>
            )}

            {method === "mixto" && quickMixedAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {quickMixedAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCash(String(amt))}
                    className="rounded-xl border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>
            )}

            {/* Validation warning for mixed payment */}
            {method === "mixto" && cashNum >= total && (
              <p className="text-xs text-destructive text-center font-medium">
                El monto en efectivo debe ser menor que el total de {formatMoney(total)}
              </p>
            )}

            {/* Change display for Cash */}
            {method === "efectivo" && change > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-accent/20 px-4 py-3">
                <span className="font-medium">Cambio</span>
                <span className="font-serif text-2xl font-semibold">{formatMoney(change)}</span>
              </div>
            )}

            {/* Split display for Mixed */}
            {method === "mixto" && cashNum > 0 && cashNum < total && (
              <div className="space-y-2 rounded-xl bg-accent/10 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pago en Efectivo:</span>
                  <span className="font-semibold">{formatMoney(cashNum)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-medium text-foreground">Restante a Tarjeta:</span>
                  <span className="font-serif text-2xl font-semibold text-primary">{formatMoney(cardAmount)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {method === "cortesia" && (
          <p className="rounded-xl bg-accent/15 px-4 py-3 text-center text-sm text-accent-foreground">
            No se recibirá pago. Los productos inventariables sí descontarán existencias.
          </p>
        )}

        <Button onClick={handleConfirm} disabled={!canConfirm} className="h-14 w-full text-lg">
          {submitting ? "Guardando..." : method === "cortesia" ? "Confirmar cortesía" : "Confirmar cobro"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
