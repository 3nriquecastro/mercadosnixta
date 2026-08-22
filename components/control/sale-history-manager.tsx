"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSale } from "@/lib/actions"
import { formatDate, formatMoney, formatTime, PAYMENT_LABELS } from "@/lib/format"
import type { PaymentMethod, Product, SaleWithItems } from "@/lib/types"

type DraftItem = {
  product_id: string | null
  product: string
  quantity: string
  unit_price: string
  customization: string
  subtotal: string
  complimentary: boolean
}

type Draft = {
  saleId: string
  payment_method: PaymentMethod
  cash_received: string
  change_given: string
  items: DraftItem[]
}

type Props = {
  sales: SaleWithItems[]
  products: Product[]
  title: string
  description: string
}

function paymentMethodItems() {
  return ["efectivo", "tarjeta", "transferencia", "mixto", "cortesia"] as const
}

function itemFromSale(sale: SaleWithItems): Draft {
  return {
    saleId: sale.id,
    payment_method: sale.payment_method,
    cash_received: sale.cash_received === null ? "" : String(sale.cash_received),
    change_given: sale.change_given === null ? "" : String(sale.change_given),
    items: (sale.sale_items ?? []).map((item) => ({
      product_id: item.product_id,
      product: item.product,
      quantity: String(item.quantity),
      unit_price: String(Number(item.unit_price) || Number(item.subtotal) / Math.max(1, Number(item.quantity))),
      customization: item.customization ?? "",
      subtotal: String(item.subtotal),
      complimentary: Boolean(item.complimentary),
    })),
  }
}

export function SaleHistoryManager({ sales, products, title, description }: Props) {
  const router = useRouter()
  const [editingSale, setEditingSale] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  function startEdit(sale: SaleWithItems) {
    setEditingSale(itemFromSale(sale))
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setEditingSale((current) => {
      if (!current) return current
      const items = [...current.items]
      items[index] = { ...items[index], ...patch }
      return { ...current, items }
    })
  }

  function selectProduct(index: number, productId: string) {
    const product = productById.get(productId)
    if (!product) {
      updateItem(index, { product_id: null })
      return
    }

    setEditingSale((current) => {
      if (!current) return current
      const items = [...current.items]
      const quantity = Number(items[index].quantity) || 0
      items[index] = {
        ...items[index],
        product_id: product.id,
        product: product.name,
        unit_price: String(product.price),
        subtotal: items[index].complimentary ? "0" : String((Number(product.price) || 0) * quantity),
      }
      return { ...current, items }
    })
  }

  async function handleSave() {
    if (!editingSale) return
    setBusy(true)

    const result = await updateSale({
      saleId: editingSale.saleId,
      payment_method: editingSale.payment_method,
      cash_received: editingSale.cash_received.trim() ? Number(editingSale.cash_received) : null,
      change_given: editingSale.change_given.trim() ? Number(editingSale.change_given) : null,
      items: editingSale.items
        .map((item) => ({
          product_id: item.product_id,
          product: item.product.trim(),
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          subtotal: Number(item.subtotal) || 0,
          customization: item.customization.trim() || null,
          complimentary: item.complimentary,
        }))
        .filter((item) => item.product.length > 0 && item.quantity > 0),
    })

    setBusy(false)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar la venta")
      return
    }

    toast.success("Venta actualizada")
    setEditingSale(null)
    router.refresh()
  }

  return (
    <div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">{title}</CardTitle>
          <CardDescription>{description}. Toca una venta para corregirla.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {sales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay ventas en este rango.</p>
          ) : (
            <div className="space-y-4">
              {/* Mobile View: Cards */}
              <div className="grid gap-3 md:hidden">
                {sales.map((sale) => (
                  <div key={sale.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{formatDate(sale.created_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-xl font-semibold">{formatMoney(Number(sale.total))}</p>
                        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {PAYMENT_LABELS[sale.payment_method]}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {(sale.sale_items ?? []).map((item) => (
                        <p key={item.id} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{item.quantity}</span> x {item.product}
                          {item.complimentary && (
                            <span className="ml-1.5 rounded-md bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                              Cortesía
                            </span>
                          )}
                          {item.customization ? (
                            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md ml-1.5">
                              {item.customization}
                            </span>
                          ) : (
                            ""
                          )}
                        </p>
                      ))}
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button onClick={() => startEdit(sale)} variant="outline" className="h-10 w-full">
                        Ver y editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Fecha y hora</th>
                      <th className="px-3 py-2 font-medium">Pago</th>
                      <th className="px-3 py-2 font-medium">Productos</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="rounded-2xl bg-card ring-1 ring-border">
                        <td className="px-3 py-3 align-top">
                          <p className="font-medium">{formatDate(sale.created_at)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                            {PAYMENT_LABELS[sale.payment_method]}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1">
                            {(sale.sale_items ?? []).map((item) => (
                              <p key={item.id} className="text-muted-foreground">
                                {item.quantity} x {item.product}
                                {item.customization ? ` · ${item.customization}` : ""}
                                {item.complimentary ? " · Cortesía" : ""}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right align-top font-semibold">{formatMoney(Number(sale.total))}</td>
                        <td className="px-3 py-3 text-right align-top">
                          <Button onClick={() => startEdit(sale)} className="h-10 px-4">
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingSale !== null} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Editar venta</DialogTitle>
            <DialogDescription>Corrige productos, cantidades y método de pago. El inventario se recalcula.</DialogDescription>
          </DialogHeader>

          {editingSale && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-1">
                  <label className="text-sm font-medium text-muted-foreground">Método de pago</label>
                  <Select
                    value={editingSale.payment_method}
                    onValueChange={(value) =>
                      setEditingSale((current) => (current ? { ...current, payment_method: value as PaymentMethod } : current))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodItems().map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Efectivo recibido</label>
                  <Input value={editingSale.cash_received} onChange={(e) => setEditingSale((current) => (current ? { ...current, cash_received: e.target.value } : current))} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Cambio</label>
                  <Input value={editingSale.change_given} onChange={(e) => setEditingSale((current) => (current ? { ...current, change_given: e.target.value } : current))} />
                </div>
              </div>

              <div className="space-y-3">
                {editingSale.items.map((item, index) => (
                  <div key={`${index}-${item.product}`} className="grid gap-3 rounded-2xl border bg-muted/20 p-4 grid-cols-2 md:grid-cols-[1.2fr_1.2fr_90px_1fr_1fr_auto] md:items-start">
                    <div className="grid gap-2 col-span-2 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground">Producto</label>
                      <select
                        value={item.product_id ?? "custom"}
                        onChange={(e) => selectProduct(index, e.target.value)}
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="custom">Texto libre</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <Input value={item.product} onChange={(e) => updateItem(index, { product: e.target.value })} />
                    </div>
                    <div className="grid gap-2 col-span-1 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground">Suplemento</label>
                      <Input value={item.customization} onChange={(e) => updateItem(index, { customization: e.target.value })} placeholder="Carne / Cruda" />
                    </div>
                    <div className="grid gap-2 col-span-1 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          updateItem(index, { quantity: e.target.value })
                          const selected = item.product_id ? products.find((product) => product.id === item.product_id) : null
                          if (selected) {
                            updateItem(index, {
                              subtotal: item.complimentary
                                ? "0"
                                : String((Number(selected.price) || 0) * (Number(e.target.value) || 0)),
                            })
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-2 col-span-1 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground">Subtotal</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.subtotal}
                        disabled={item.complimentary}
                        onChange={(e) =>
                          updateItem(index, {
                            subtotal: e.target.value,
                            unit_price: String((Number(e.target.value) || 0) / (Number(item.quantity) || 1)),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2 col-span-1 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground">Cortesía</label>
                      <Button
                        type="button"
                        variant={item.complimentary ? "secondary" : "outline"}
                        className="h-10"
                        onClick={() =>
                          updateItem(index, {
                            complimentary: !item.complimentary,
                            subtotal: item.complimentary
                              ? String((Number(item.unit_price) || 0) * (Number(item.quantity) || 0))
                              : "0",
                          })
                        }
                      >
                        {item.complimentary ? "Gratis" : "Cobrar"}
                      </Button>
                    </div>
                    <div className="col-span-2 md:col-span-1 md:pt-6 flex justify-end">
                      <Button variant="ghost" className="w-full md:w-auto text-destructive hover:bg-destructive/10" onClick={() => setEditingSale((current) => (current ? { ...current, items: current.items.filter((_, currentIndex) => currentIndex !== index) } : current))}>
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() =>
                  setEditingSale((current) =>
                    current
                      ? {
                          ...current,
                          items: [
                            ...current.items,
                            {
                              product_id: null,
                              product: "",
                              quantity: "1",
                              unit_price: "0",
                              customization: "",
                              subtotal: "0",
                              complimentary: false,
                            },
                          ],
                        }
                      : current,
                  )
                }
              >
                Agregar producto
              </Button>

              <div className="rounded-2xl bg-secondary px-4 py-3 text-right">
                <p className="text-sm text-muted-foreground">Nuevo total</p>
                <p className="font-serif text-3xl font-semibold">
                  {formatMoney(
                    editingSale.payment_method === "cortesia"
                      ? 0
                      : editingSale.items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0),
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditingSale(null)}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={busy}>
              {busy ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}