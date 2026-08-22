"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CartPanel } from "@/components/pos/cart-panel"
import { CustomizeDialog } from "@/components/pos/customize-dialog"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import { CATEGORY_ORDER, categoryLabel, type ProductCategory } from "@/lib/categories"
import { createSale } from "@/lib/actions"
import { formatMoney } from "@/lib/format"
import { hasCustomization } from "@/lib/customizations"
import type { CartItem, PaymentMethod, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CupSoda, ShoppingBag, UtensilsCrossed } from "lucide-react"

type Props = {
  products: Product[]
}

const CATEGORY_META = {
  comida: { icon: UtensilsCrossed, shortLabel: "Comida" },
  bebidas: { icon: CupSoda, shortLabel: "Bebidas" },
  para_llevar: { icon: ShoppingBag, shortLabel: "Para llevar" },
} satisfies Record<ProductCategory, { icon: typeof UtensilsCrossed; shortLabel: string }>

function itemKey(product: Product, customization: string | null) {
  return `${product.id}:${customization ?? "base"}`
}

export function SaleWorkspace({ products }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("comida")

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.complimentary ? 0 : item.unit_price * item.quantity), 0),
    [items],
  )
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const quantitiesByProduct = useMemo(() => {
    const quantities = new Map<string, number>()
    for (const item of items) {
      quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity)
    }
    return quantities
  }, [items])

  const productsByCategory = useMemo(() => {
    const map = new Map<ProductCategory, Product[]>()
    for (const category of CATEGORY_ORDER) map.set(category, [])
    for (const product of products) {
      const category = product.category as ProductCategory
      if (map.has(category)) map.get(category)!.push(product)
    }
    return map
  }, [products])

  const visibleProducts = productsByCategory.get(activeCategory) ?? []

  function addToCart(product: Product, customization: string | null, unitPrice: number) {
    const key = itemKey(product, customization)
    setItems((current) => {
      const existing = current.find((item) => item.key === key)
      if (!existing) {
        return [
          ...current,
          {
            key,
            product_id: product.id,
            product: product.name,
            unit_price: unitPrice,
            quantity: 1,
            customization,
            tracks_inventory: product.tracks_inventory,
            complimentary: false,
          },
        ]
      }
      return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item))
    })
  }

  function handleProductClick(product: Product) {
    if (hasCustomization(product.customization)) {
      setSelectedProduct(product)
      setCustomizeOpen(true)
      return
    }
    addToCart(product, null, product.price)
  }

  function changeQty(key: string, delta: number) {
    setItems((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  async function handlePayment(method: PaymentMethod, cashReceived: number | null, change: number | null) {
    setSubmitting(true)
    const result = await createSale({
      items,
      payment_method: method,
      total,
      cash_received: cashReceived,
      change_given: change,
    })
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo guardar la venta")
      return
    }

    toast.success("Venta registrada")
    setItems([])
    setPaymentOpen(false)
    setCartOpen(false)
    router.refresh()
  }

  const cartPanel = (
    <CartPanel
      items={items}
      total={total}
      onChangeQty={changeQty}
      onToggleComplimentary={(key) =>
        setItems((current) =>
          current.map((item) => (item.key === key ? { ...item, complimentary: !item.complimentary } : item)),
        )
      }
      onClear={() => setItems([])}
      onCharge={() => {
        setCartOpen(false)
        setPaymentOpen(true)
      }}
      hideHeader
      compact
    />
  )

  return (
    <>
      <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3 px-4 py-3 md:h-dvh md:gap-4 md:py-4 lg:px-6">
        <header className="flex shrink-0 items-center justify-between gap-4 rounded-3xl border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Punto de venta</p>
            <h1 className="truncate font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Nueva venta</h1>
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
              Elige una categoría y toca los productos.
            </p>
          </div>
          <div className="shrink-0 text-right lg:hidden">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="font-serif text-2xl font-semibold tabular-nums sm:text-3xl">{formatMoney(total)}</p>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-1 flex-col rounded-3xl border bg-card p-2 shadow-sm sm:p-3">
          <div
            className="grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
            role="tablist"
            aria-label="Categorías de productos"
          >
            {CATEGORY_ORDER.map((category) => {
              const count = productsByCategory.get(category)?.length ?? 0
              const isActive = activeCategory === category
              const Icon = CATEGORY_META[category].icon
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="productos-categoria"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition-colors sm:gap-2",
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold leading-tight sm:text-sm">
                    {CATEGORY_META[category].shortLabel}
                  </span>
                  <span
                    className={cn(
                      "hidden min-w-5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums min-[390px]:inline",
                      isActive ? "bg-primary/10 text-primary" : "bg-background/70",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            id="productos-categoria"
            role="tabpanel"
            className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1"
          >
            {visibleProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin productos en {categoryLabel(activeCategory)}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => {
                  const quantity = quantitiesByProduct.get(product.id) ?? 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product)}
                      aria-label={`Agregar ${product.name}, ${formatMoney(product.price)}`}
                      className={cn(
                        "relative flex min-h-20 flex-col justify-between rounded-2xl border bg-card px-3 py-2.5 text-left shadow-sm transition active:scale-[0.98] active:bg-secondary sm:min-h-24 sm:px-4 sm:py-3",
                        quantity > 0 && "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20",
                      )}
                    >
                      {quantity > 0 && (
                        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {quantity}
                        </span>
                      )}
                      <span className={cn("line-clamp-2 pr-4 text-sm font-semibold leading-tight sm:text-base", quantity > 0 && "pr-8")}>
                        {product.name}
                      </span>
                      <div className="mt-2 flex items-end justify-between gap-1">
                        {hasCustomization(product.customization) ? (
                          <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">Elegir opción</span>
                        ) : (
                          <span aria-hidden="true" />
                        )}
                        <span className="ml-auto font-serif text-lg font-semibold tabular-nums sm:text-xl">
                          {formatMoney(product.price)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-2 shrink-0 border-t bg-card px-1 pt-2 lg:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                disabled={items.length === 0}
                className="flex min-w-0 flex-1 flex-col rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-60"
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {totalItems ? `Ticket y cortesías · ${totalItems}` : "Ticket vacío"}
                </span>
                <span className="truncate font-serif text-xl font-semibold tabular-nums">{formatMoney(total)}</span>
              </button>
              <Button
                onClick={() => setPaymentOpen(true)}
                disabled={items.length === 0}
                className="h-14 shrink-0 px-5 text-base"
              >
                Cobrar
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col rounded-3xl border bg-card shadow-sm lg:flex">
          <div className="border-b px-4 py-3">
            <p className="font-serif text-lg font-semibold">Ticket</p>
            <p className="text-xs text-muted-foreground">{totalItems} artículos</p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">{cartPanel}</div>
        </aside>
        </div>
      </div>

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-3 p-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Ticket</DialogTitle>
            <DialogDescription>
              {totalItems} artículos · {formatMoney(total)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">{cartPanel}</div>
        </DialogContent>
      </Dialog>

      <CustomizeDialog
        product={selectedProduct}
        open={customizeOpen}
        onOpenChange={(open) => {
          setCustomizeOpen(open)
          if (!open) setSelectedProduct(null)
        }}
        onConfirm={(customization, unitPrice) => {
          if (selectedProduct) addToCart(selectedProduct, customization, unitPrice)
          setSelectedProduct(null)
        }}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        submitting={submitting}
        onConfirm={handlePayment}
      />
    </>
  )
}
