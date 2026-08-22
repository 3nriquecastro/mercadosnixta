"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { addProductToInventory, removeProductFromInventory, saveInventoryOpening } from "@/lib/actions"
import { categoryLabel } from "@/lib/categories"
import { formatMoney } from "@/lib/format"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import type { InventoryRow, Product } from "@/lib/types"

type Props = {
  products: Product[]
  inventory: InventoryRow[]
}

export function InventoryManager({ products, inventory }: Props) {
  const router = useRouter()
  const demoMode = !hasSupabaseConfig()
  const [demoInventoryIds, setDemoInventoryIds] = useState(() => new Set(inventory.map((row) => row.product_id)))
  const inventoryById = useMemo(() => new Map(inventory.map((row) => [row.product_id, row])), [inventory])
  const inventoryIds = useMemo(
    () => (demoMode ? demoInventoryIds : new Set(inventory.map((row) => row.product_id))),
    [demoMode, demoInventoryIds, inventory],
  )
  const eligibleProducts = useMemo(() => products.filter((product) => product.tracks_inventory), [products])
  const inventoriedProducts = useMemo(
    () => eligibleProducts.filter((product) => inventoryIds.has(product.id)),
    [eligibleProducts, inventoryIds],
  )
  const availableProducts = useMemo(
    () => eligibleProducts.filter((product) => !inventoryIds.has(product.id)),
    [eligibleProducts, inventoryIds],
  )
  const [selectedProductId, setSelectedProductId] = useState("")
  const [stocks, setStocks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [trackingBusy, setTrackingBusy] = useState<string | null>(null)

  useEffect(() => {
    setStocks((current) => {
      const next = { ...current }
      for (const product of inventoriedProducts) {
        if (!(product.id in next)) {
          next[product.id] = String(inventoryById.get(product.id)?.opening_stock ?? 0)
        }
      }
      return next
    })
  }, [inventoriedProducts, inventoryById])

  useEffect(() => {
    if (!availableProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(availableProducts[0]?.id ?? "")
    }
  }, [availableProducts, selectedProductId])

  async function changeDailyInventory(productId: string, add: boolean) {
    setTrackingBusy(productId)
    const result = add
      ? await addProductToInventory(productId)
      : await removeProductFromInventory(productId)
    setTrackingBusy(null)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar el inventario")
      return
    }

    toast.success(add ? "Producto agregado al inventario de hoy" : "Producto retirado del inventario de hoy")
    if (demoMode) {
      setDemoInventoryIds((current) => {
        const next = new Set(current)
        if (add) next.add(productId)
        else next.delete(productId)
        return next
      })
    } else {
      router.refresh()
    }
  }

  async function handleSave() {
    setBusy(true)
    const result = await saveInventoryOpening(
      inventoriedProducts.map((product) => ({
        product_id: product.id,
        opening_stock: Number(stocks[product.id] ?? 0) || 0,
      })),
    )
    setBusy(false)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo guardar el inventario")
      return
    }

    toast.success("Apertura guardada")
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Inventario</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Existencias de hoy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {inventoriedProducts.length} productos en el inventario de hoy.
          </p>
        </div>
        {availableProducts.length > 0 && (
          <div className="flex w-full gap-2 sm:w-auto">
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm sm:w-56"
              aria-label="Producto para agregar al inventario"
            >
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <Button
              className="h-12 shrink-0"
              disabled={!selectedProductId || trackingBusy !== null}
              onClick={() => changeDailyInventory(selectedProductId, true)}
            >
              Agregar
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="font-serif text-2xl">Apertura de inventario</CardTitle>
          <CardDescription>
            Ajusta el stock inicial. Las ventas descuentan existencias automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {inventoriedProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Agrega uno de los productos marcados como inventariables en Productos.
            </p>
          ) : (
            inventoriedProducts.map((product) => {
              const row = inventoryById.get(product.id)
              return (
                <div
                  key={product.id}
                  className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_140px_140px_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {categoryLabel(product.category)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row ? `Inicial: ${row.opening_stock} · Disponible: ${row.current_stock}` : "Sin apertura registrada"}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium text-muted-foreground">Stock inicial</label>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={stocks[product.id] ?? "0"}
                      onChange={(event) => setStocks((current) => ({ ...current, [product.id]: event.target.value }))}
                      className="h-12 text-right text-lg font-semibold"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatMoney(product.price)}</p>
                    <p>{product.active ? "Visible en Vender" : "Producto inactivo"}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={trackingBusy !== null}
                    onClick={() => changeDailyInventory(product.id, false)}
                  >
                    {trackingBusy === product.id ? "Retirando..." : "Retirar"}
                  </Button>
                </div>
              )
            })
          )}

          {inventoriedProducts.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={busy || trackingBusy !== null} className="h-12 w-full px-6 text-base sm:w-auto">
                {busy ? "Guardando..." : "Guardar apertura"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}