"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/format"
import type { Product } from "@/lib/types"
import { defaultCustomization, getCustomizationExtraPrice } from "@/lib/customizations"

type Props = {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (customization: string, unitPrice: number) => void
}

export function CustomizeDialog({ product, open, onOpenChange, onConfirm }: Props) {
  const config = product?.customization ?? null
  const [choice, setChoice] = useState(() => (config ? defaultCustomization(config) : ""))

  if (!product || !config) return null

  const unitPrice = product.price + getCustomizationExtraPrice(config, choice)

  const handleConfirm = () => {
    onConfirm(choice, unitPrice)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{product.name}</DialogTitle>
          <DialogDescription>{config.label}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {config.options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setChoice(opt.label)}
              className={cn(
                "rounded-xl border-2 px-4 py-4 text-base font-medium transition-colors",
                choice === opt.label
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <span>{opt.label}</span>
              {getCustomizationExtraPrice(config, opt.label) > 0 && (
                <span className="block text-xs text-muted-foreground">+{formatMoney(getCustomizationExtraPrice(config, opt.label))}</span>
              )}
            </button>
          ))}
        </div>

        <DialogFooter className="mt-2">
          <Button onClick={handleConfirm} className="h-14 w-full text-lg">
            Agregar · {formatMoney(unitPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
