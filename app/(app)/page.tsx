import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData } from "@/lib/queries"
import { formatMoney } from "@/lib/format"
import { todayYMD } from "@/lib/dates"
import { requireProfile } from "@/lib/auth"

export default async function DashboardPage() {
  const profile = await requireProfile()
  const data = await getDashboardData(todayYMD())
  const isOwner = profile.role === "owner"

  return (
    <div className="space-y-6 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Resumen de hoy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOwner ? "Todas las ventas e inventario del negocio." : "Tus ventas y el inventario de hoy."}
          </p>
        </div>
        <Button asChild className="h-12 px-5 text-base">
          <Link href="/control">Ir a control</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Ventas del día</CardDescription>
            <CardTitle className="font-serif text-4xl">{data.salesCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ingreso del día</CardDescription>
            <CardTitle className="font-serif text-4xl">{formatMoney(data.revenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ticket promedio</CardDescription>
            <CardTitle className="font-serif text-4xl">{formatMoney(data.avgTicket)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Producto más vendido</CardDescription>
            <CardTitle className="font-serif text-3xl">
              {data.topProduct ? data.topProduct.name : "Sin ventas"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">Inventario restante</CardTitle>
            <CardDescription>Productos con control de existencias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {data.inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay inventario capturado para hoy.</p>
            ) : (
              data.inventory.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Apertura: {item.opening}</p>
                  </div>
                  <p className="font-serif text-2xl font-semibold tabular-nums">{item.current}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-serif text-2xl">Agotados</CardTitle>
            <CardDescription>Solo lo que ya no se puede vender.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {data.soldOut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún producto agotado.</p>
            ) : (
              data.soldOut.map((name) => (
                <div key={name} className="rounded-2xl bg-destructive/10 px-4 py-3 font-medium text-destructive">
                  {name}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}