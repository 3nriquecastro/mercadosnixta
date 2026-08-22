"use client"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Gift, Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import type { CartItem } from "@/lib/types"

type Props = {
  items: CartItem[]
  total: number
  onChangeQty: (key: string, delta: number) => void
  onToggleComplimentary: (key: string) => void
  onClear: () => void
  onCharge: () => void
  hideHeader?: boolean
  compact?: boolean
}

export function CartPanel({ items, total, onChangeQty, onToggleComplimentary, onClear, onCharge, hideHeader = false, compact = false }: Props) {
  return (
    <div className="flex h-full flex-col">
      {(!hideHeader || items.length > 0) && (
        <div className={cn("flex items-center justify-between px-1", compact ? "pb-2" : "pb-3")}>
          {!hideHeader ? (
            <h2 className={cn("font-serif font-semibold", compact ? "text-lg" : "text-xl")}>Ticket</h2>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              Cortesía por artículo
            </div>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive sm:text-sm"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className={cn("flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground", compact ? "min-h-24" : "min-h-40")}>
            <ShoppingCart className={cn(compact ? "h-6 w-6" : "h-8 w-8")} aria-hidden="true" />
            <p className="text-xs sm:text-sm">Toca un producto para empezar</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "rounded-lg border bg-card",
                  compact ? "p-2" : "p-3",
                  item.complimentary && "border-accent bg-accent/10",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("font-medium leading-tight", compact ? "text-sm" : "")}>{item.product}</p>
                    {item.customization && (
                      <p className="text-xs text-muted-foreground">{item.customization}</p>
                    )}
                    {!compact && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{formatMoney(item.unit_price)} c/u</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("block font-semibold tabular-nums", compact ? "text-sm" : "")}>
                      {item.complimentary ? formatMoney(0) : formatMoney(item.unit_price * item.quantity)}
                    </span>
                    {item.complimentary && (
                      <span className="block text-xs text-muted-foreground line-through">
                        {formatMoney(item.unit_price * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleComplimentary(item.key)}
                    className={cn(
                      "flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors",
                      item.complimentary
                        ? "border-accent bg-accent/20 text-accent-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.complimentary ? "Cortesía aplicada" : "Ofrecer gratis"}
                  </button>
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Quitar uno"
                    onClick={() => onChangeQty(item.key, -1)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border bg-background text-foreground hover:bg-secondary",
                      compact ? "h-8 w-8" : "h-9 w-9",
                    )}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-base font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Agregar uno"
                    onClick={() => onChangeQty(item.key, 1)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border bg-background text-foreground hover:bg-secondary",
                      compact ? "h-8 w-8" : "h-9 w-9",
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn("border-t pt-2", compact ? "mt-2" : "mt-3 pt-3")}>
        <div className={cn("mb-2 flex items-center justify-between", !compact && "mb-3")}>
          <span className={cn("font-medium", compact ? "text-sm" : "text-lg")}>Total</span>
          <span className={cn("font-serif font-semibold tabular-nums", compact ? "text-2xl" : "text-3xl")}>
            {formatMoney(total)}
          </span>
        </div>
        <Button onClick={onCharge} disabled={items.length === 0} className={cn("w-full", compact ? "h-11 text-base" : "h-14 text-lg")}>
          Cobrar
        </Button>
      </div>
    </div>
  )
}
