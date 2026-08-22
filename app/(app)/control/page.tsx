import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryManager } from "@/components/inventory/inventory-manager"
import { ProductManager } from "@/components/control/product-manager"
import { SaleHistoryManager } from "@/components/control/sale-history-manager"
import { todayYMD, presetRange, type RangeKey } from "@/lib/dates"
import { formatMoney, PAYMENT_LABELS } from "@/lib/format"
import { getAllProducts, getInventoryForDate, getSalesForRange } from "@/lib/queries"
import { requireProfile } from "@/lib/auth"

type SearchParams = Record<string, string | string[] | undefined>

const OWNER_TABS = [
  { key: "inventory", label: "Inventario" },
  { key: "sales", label: "Ventas" },
  { key: "products", label: "Productos" },
] as const

const SELLER_TABS = OWNER_TABS.filter((tab) => tab.key !== "products")

function getString(searchParams: SearchParams, key: string) {
  const value = searchParams[key]
  return typeof value === "string" ? value : ""
}

function buildHref(tab: string, searchParams: SearchParams) {
  const params = new URLSearchParams()
  params.set("tab", tab)

  const range = getString(searchParams, "range")
  const from = getString(searchParams, "from")
  const to = getString(searchParams, "to")
  if (range) params.set("range", range)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  return `/control?${params.toString()}`
}

function pickRange(searchParams: SearchParams) {
  const range = getString(searchParams, "range")
  if (range === "hoy" || range === "ayer" || range === "semana" || range === "mes") {
    return presetRange(range as RangeKey)
  }

  const from = getString(searchParams, "from") || presetRange("hoy").start
  const to = getString(searchParams, "to") || presetRange("hoy").end
  return { start: from, end: to }
}

export default async function ControlPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const profile = await requireProfile()
  const isOwner = profile.role === "owner"
  const resolvedSearchParams = (await searchParams) ?? {}

  const rawTab = getString(resolvedSearchParams, "tab") || "inventory"
  const requestedTab = rawTab === "history" || rawTab === "calendar" ? "sales" : rawTab
  const activeTab = !isOwner && requestedTab === "products" ? "inventory" : requestedTab
  const historyRange = isOwner ? pickRange(resolvedSearchParams) : presetRange("hoy")
  const tabs = isOwner ? OWNER_TABS : SELLER_TABS

  const [products, inventoryToday, sales] = await Promise.all([
    getAllProducts(),
    getInventoryForDate(todayYMD()),
    getSalesForRange(historyRange.start, historyRange.end),
  ])

  const salesCount = sales.length
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const avgTicket = salesCount ? revenue / salesCount : 0
  const unitsSold = sales.reduce(
    (total, sale) => total + (sale.sale_items ?? []).reduce((saleTotal, item) => saleTotal + item.quantity, 0),
    0,
  )

  const paymentTotals = new Map<string, number>()
  for (const sale of sales) {
    paymentTotals.set(sale.payment_method, (paymentTotals.get(sale.payment_method) ?? 0) + Number(sale.total))
  }

  const productTotals = new Map<string, number>()
  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      productTotals.set(item.product, (productTotals.get(item.product) ?? 0) + item.quantity)
    }
  }
  const topProducts = [...productTotals.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6)
  const maxTopQty = topProducts[0]?.qty ?? 1

  const byDay = new Map<string, number>()
  const byHour = new Map<string, number>()
  for (const sale of sales) {
    const dateKey = sale.created_at.slice(0, 10)
    byDay.set(dateKey, (byDay.get(dateKey) ?? 0) + Number(sale.total))

    const date = new Date(sale.created_at)
    const hour = `${String(date.getHours()).padStart(2, "0")}:00`
    byHour.set(hour, (byHour.get(hour) ?? 0) + Number(sale.total))
  }

  const dailySeries = [...byDay.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const hourlySeries = [...byHour.entries()]
    .map(([hour, total]) => ({ hour, total }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  const maxDaily = dailySeries.length ? Math.max(...dailySeries.map((item) => item.total)) : 1
  const maxHourly = hourlySeries.length ? Math.max(...hourlySeries.map((item) => item.total)) : 1

  return (
    <div className="space-y-6 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Control</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            {isOwner ? "Todo en una sola pantalla" : "Operación de hoy"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOwner ? "Inventario, ventas y productos en un flujo claro y rápido." : "Tu inventario y tus ventas del día."}
          </p>
        </div>
        <Button asChild className="h-12 px-5 text-base">
          <Link href="/vender">Ir a vender</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab.key} asChild variant={activeTab === tab.key ? "default" : "outline"}>
            <Link href={buildHref(tab.key, resolvedSearchParams)}>{tab.label}</Link>
          </Button>
        ))}
      </div>

      {activeTab === "inventory" && <InventoryManager products={products} inventory={inventoryToday} />}

      {activeTab === "sales" && (
        <div className="space-y-4">
          {isOwner ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-serif text-2xl">Periodo de ventas</CardTitle>
                <CardDescription>Consulta un periodo rápido o selecciona fechas específicas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.entries({ hoy: "Hoy", ayer: "Ayer", semana: "Esta semana", mes: "Este mes" }) as Array<[RangeKey, string]>).map(([key, label]) => (
                    <Button key={key} asChild variant={getString(resolvedSearchParams, "range") === key ? "default" : "outline"}>
                      <Link href={buildHref("sales", { ...resolvedSearchParams, range: key, from: undefined, to: undefined })}>{label}</Link>
                    </Button>
                  ))}
                </div>

                <form className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] md:items-end" action="/control" method="get">
                  <input type="hidden" name="tab" value="sales" />
                  <div className="grid gap-2">
                    <label htmlFor="from" className="text-sm font-medium text-muted-foreground">Desde</label>
                    <input id="from" name="from" type="date" defaultValue={historyRange.start} className="h-10 rounded-lg border border-input bg-background px-3" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="to" className="text-sm font-medium text-muted-foreground">Hasta</label>
                    <input id="to" name="to" type="date" defaultValue={historyRange.end} className="h-10 rounded-lg border border-input bg-background px-3" />
                  </div>
                  <Button type="submit" className="h-12 px-5 sm:col-span-2 md:col-span-1">Aplicar fechas</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Tus ventas de hoy</CardTitle>
                <CardDescription>Solo se muestran las ventas registradas con tu cuenta durante el día actual.</CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardDescription>Ingresos</CardDescription>
                <CardTitle className="font-serif text-3xl sm:text-4xl">{formatMoney(revenue)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Ventas registradas</CardDescription>
                <CardTitle className="font-serif text-3xl sm:text-4xl">{salesCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Ticket promedio</CardDescription>
                <CardTitle className="font-serif text-3xl sm:text-4xl">{formatMoney(avgTicket)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Unidades vendidas</CardDescription>
                <CardTitle className="font-serif text-3xl sm:text-4xl">{unitsSold}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-serif text-2xl">Ventas por temporalidad</CardTitle>
                <CardDescription>{historyRange.start} → {historyRange.end}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 pt-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Por día</p>
                  {dailySeries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos para este rango.</p>
                  ) : (
                    dailySeries.map((item) => (
                      <div key={item.date} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.date}</span>
                          <span className="font-medium">{formatMoney(item.total)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.total / maxDaily) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Por hora</p>
                  {hourlySeries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos para este rango.</p>
                  ) : (
                    hourlySeries.map((item) => (
                      <div key={item.hour} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.hour}</span>
                          <span className="font-medium">{formatMoney(item.total)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary">
                          <div className="h-2 rounded-full bg-accent" style={{ width: `${(item.total / maxHourly) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="font-serif text-2xl">Productos más vendidos</CardTitle>
                  <CardDescription>Unidades vendidas en el periodo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin ventas en el periodo seleccionado.</p>
                  ) : (
                    topProducts.map((item, index) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">
                            <span className="mr-2 text-xs font-semibold text-muted-foreground">{index + 1}</span>
                            {item.name}
                          </span>
                          <span className="font-semibold tabular-nums">{item.qty}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.qty / maxTopQty) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="font-serif text-xl">Métodos de pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {paymentTotals.size === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin pagos en este periodo.</p>
                  ) : (
                    [...paymentTotals.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([method, total]) => (
                        <div key={method} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span>{PAYMENT_LABELS[method] ?? method}</span>
                            <span className="font-semibold">{formatMoney(total)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary">
                            <div
                              className="h-1.5 rounded-full bg-accent"
                              style={{ width: `${revenue ? (total / revenue) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <SaleHistoryManager
            sales={sales}
            products={products}
            title="Detalle de ventas"
            description={`${salesCount} ventas · ${formatMoney(revenue)} · ticket promedio ${formatMoney(avgTicket)}`}
          />
        </div>
      )}

      {isOwner && activeTab === "products" && <ProductManager products={products} />}
    </div>
  )
}