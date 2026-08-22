"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { deleteProduct, saveProduct, toggleProduct } from "@/lib/actions"
import { CATEGORY_ORDER, categoryLabel } from "@/lib/categories"
import type { Product, ProductCustomization } from "@/lib/types"
import { cn } from "@/lib/utils"

type DraftOption = { label: string; price_delta: string }

type Draft = {
  id: string | null
  name: string
  category: string
  price: string
  tracks_inventory: boolean
  sort_order: string
  active: boolean
  customizationLabel: string
  customizationOptions: DraftOption[]
}

type Props = {
  products: Product[]
}

function emptyDraft(nextSortOrder: number): Draft {
  return {
    id: null,
    name: "",
    category: CATEGORY_ORDER[0] ?? "comida",
    price: "0",
    tracks_inventory: false,
    sort_order: String(nextSortOrder),
    active: true,
    customizationLabel: "",
    customizationOptions: [{ label: "", price_delta: "0" }],
  }
}

function draftFromProduct(product: Product): Draft {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: String(product.price),
    tracks_inventory: product.tracks_inventory,
    sort_order: String(product.sort_order),
    active: product.active,
    customizationLabel: product.customization?.label ?? "",
    customizationOptions: product.customization?.options.length
      ? product.customization.options.map((option) => ({ label: option.label, price_delta: String(option.price_delta) }))
      : [{ label: "", price_delta: "0" }],
  }
}

function toCustomization(draft: Draft): ProductCustomization | null {
  const label = draft.customizationLabel.trim()
  const options = draft.customizationOptions
    .map((option) => ({
      label: option.label.trim(),
      price_delta: Number(option.price_delta) || 0,
    }))
    .filter((option) => option.label.length > 0)

  if (!label || !options.length) return null
  return { label, options }
}

function summarizeCustomization(customization: ProductCustomization | null) {
  if (!customization?.options.length) return "Sin suplementos"
  return `${customization.label} · ${customization.options.length} opciones`
}

export function ProductManager({ products }: Props) {
  const router = useRouter()
  const nextSortOrder = useMemo(() => (products.length ? Math.max(...products.map((product) => product.sort_order)) + 1 : 1), [products])
  const [draft, setDraft] = useState<Draft>(emptyDraft(nextSortOrder))
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function startCreate() {
    setDraft(emptyDraft(nextSortOrder))
    setOpen(true)
  }

  function startEdit(product: Product) {
    setDraft(draftFromProduct(product))
    setOpen(true)
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    setBusy(true)
    const result = await saveProduct({
      id: draft.id,
      name: draft.name.trim(),
      category: draft.category,
      price: Number(draft.price) || 0,
      tracks_inventory: draft.tracks_inventory,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active,
      customization: toCustomization(draft),
    })
    setBusy(false)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo guardar el producto")
      return
    }

    toast.success(draft.id ? "Producto actualizado" : "Producto creado")
    setOpen(false)
    router.refresh()
  }

  async function handleToggle(product: Product) {
    const result = await toggleProduct(product.id, !product.active)
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo cambiar el estado")
      return
    }

    toast.success(product.active ? "Producto desactivado" : "Producto activado")
    router.refresh()
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Eliminar ${product.name}?`)) return
    const result = await deleteProduct(product.id)
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo eliminar el producto")
      return
    }

    toast.success("Producto eliminado")
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Productos</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Catálogo y suplementos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cambia categoría, precio, visibilidad e inventario desde cada producto.
          </p>
        </div>
        <Button onClick={startCreate} className="h-12 w-full px-5 text-base sm:w-auto">
          Nuevo producto
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-2xl">{product.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {categoryLabel(product.category)}
                    </span>
                  </CardDescription>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", product.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {product.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{product.tracks_inventory ? "Inventariable" : "No inventariable"}</span>
                <span>{product.active ? "Visible en Vender" : "Oculto en Vender"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Precio</span>
                <span className="font-serif text-2xl font-semibold">${product.price}</span>
              </div>
              <p className="text-sm text-muted-foreground">{summarizeCustomization(product.customization)}</p>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
                <Button variant="outline" className="h-11 w-full" onClick={() => startEdit(product)}>
                  Editar
                </Button>
                <Button variant="secondary" className="h-11 w-full" onClick={() => handleToggle(product)}>
                  {product.active ? "Desactivar" : "Activar"}
                </Button>
                <Button variant="destructive" className="h-11 w-full" onClick={() => handleDelete(product)}>
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{draft.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>Controla precio, inventario, suplementos y estado desde una sola pantalla.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Nombre</label>
              <Input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Categoría</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Define en qué sección aparece dentro de Vender.</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Precio</label>
              <Input type="number" min="0" step="0.5" value={draft.price} onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
              <input type="checkbox" checked={draft.tracks_inventory} onChange={(e) => setDraft((current) => ({ ...current, tracks_inventory: e.target.checked }))} />
              <span>
                <span className="block text-sm font-medium">Producto inventariable</span>
                <span className="block text-xs text-muted-foreground">Permite agregarlo al inventario cuando se vaya a vender.</span>
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} />
              <span className="text-sm font-medium">Activo</span>
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Suplementos</label>
              <Input
                placeholder="Ej. Carne"
                value={draft.customizationLabel}
                onChange={(e) => setDraft((current) => ({ ...current, customizationLabel: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              {draft.customizationOptions.map((option, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_auto] md:items-center">
                  <Input
                    placeholder="Opción"
                    value={option.label}
                    onChange={(e) =>
                      setDraft((current) => {
                        const customizationOptions = [...current.customizationOptions]
                        customizationOptions[index] = { ...customizationOptions[index], label: e.target.value }
                        return { ...current, customizationOptions }
                      })
                    }
                  />
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Costo"
                    value={option.price_delta}
                    onChange={(e) =>
                      setDraft((current) => {
                        const customizationOptions = [...current.customizationOptions]
                        customizationOptions[index] = { ...customizationOptions[index], price_delta: e.target.value }
                        return { ...current, customizationOptions }
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full md:w-auto"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        customizationOptions: current.customizationOptions.filter((_, optionIndex) => optionIndex !== index),
                      }))
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => setDraft((current) => ({ ...current, customizationOptions: [...current.customizationOptions, { label: "", price_delta: "0" }] }))}
              >
                Agregar opción
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Guardando..." : "Guardar producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}