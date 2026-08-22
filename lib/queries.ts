import "server-only"
import { createClient } from "@/lib/supabase/server"
import { todayYMD, ymdRangeToISO } from "@/lib/dates"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { normalizeCategory } from "@/lib/categories"
import type { Product, InventoryRow, SaleWithItems } from "@/lib/types"
import { getCurrentProfile } from "@/lib/auth"

const DEMO_PRODUCTS: Product[] = [
  { id: "demo-tacos", name: "Tacos", category: "comida", price: 20, tracks_inventory: false, sort_order: 1, active: true, customization: { label: "Carne", options: [{ label: "Carne", price_delta: 0 }, { label: "Cambio de carne", price_delta: 0 }, { label: "Extra de carne", price_delta: 12 }] } },
  { id: "demo-quesadillas", name: "Quesadillas", category: "comida", price: 35, tracks_inventory: false, sort_order: 2, active: true, customization: null },
  { id: "demo-chilaquiles", name: "Chilaquiles rojos", category: "comida", price: 75, tracks_inventory: false, sort_order: 3, active: true, customization: { label: "Carne", options: [{ label: "Carne", price_delta: 0 }, { label: "Cambio de carne", price_delta: 0 }, { label: "Extra de carne", price_delta: 12 }] } },
  { id: "demo-micheladas", name: "Micheladas", category: "bebidas", price: 60, tracks_inventory: true, sort_order: 4, active: true, customization: { label: "Preparación", options: [{ label: "Normal", price_delta: 0 }, { label: "Cruda", price_delta: 0 }] } },
  { id: "demo-agua", name: "Agua fresca", category: "bebidas", price: 25, tracks_inventory: false, sort_order: 5, active: true, customization: null },
  { id: "demo-guacamole", name: "Guacamole", category: "comida", price: 50, tracks_inventory: true, sort_order: 6, active: true, customization: null },
  { id: "demo-totopos", name: "Totopos", category: "comida", price: 30, tracks_inventory: false, sort_order: 7, active: true, customization: null },
  { id: "demo-tortillas-500", name: "Tortillas 500 g", category: "para_llevar", price: 15, tracks_inventory: true, sort_order: 8, active: true, customization: null },
  { id: "demo-tortillas-1kg", name: "Tortillas 1 kg", category: "para_llevar", price: 28, tracks_inventory: true, sort_order: 9, active: true, customization: null },
  { id: "demo-vasos", name: "Vasos de agua", category: "bebidas", price: 0, tracks_inventory: false, sort_order: 10, active: false, customization: null },
]

const DEMO_DATE = todayYMD()
const DEMO_INVENTORY: InventoryRow[] = [
  { product_id: "demo-micheladas", date: DEMO_DATE, opening_stock: 24, current_stock: 17 },
  { product_id: "demo-guacamole", date: DEMO_DATE, opening_stock: 12, current_stock: 8 },
  { product_id: "demo-tortillas-500", date: DEMO_DATE, opening_stock: 30, current_stock: 26 },
  { product_id: "demo-tortillas-1kg", date: DEMO_DATE, opening_stock: 15, current_stock: 9 },
]

const DEMO_SALES: SaleWithItems[] = [
  {
    id: "demo-sale-1",
    created_at: "2026-07-06T14:15:00.000Z",
    created_by: "demo-owner",
    payment_method: "efectivo",
    total: 195,
    cash_received: 200,
    change_given: 5,
    sale_items: [
      { id: "demo-item-1", sale_id: "demo-sale-1", product_id: "demo-tacos", product: "Tacos", quantity: 3, unit_price: 20, customization: "Carne", subtotal: 60, complimentary: false },
      { id: "demo-item-2", sale_id: "demo-sale-1", product_id: "demo-micheladas", product: "Micheladas", quantity: 2, unit_price: 60, customization: "Cruda", subtotal: 120, complimentary: false },
      { id: "demo-item-3", sale_id: "demo-sale-1", product_id: "demo-guacamole", product: "Guacamole", quantity: 1, unit_price: 50, customization: null, subtotal: 50, complimentary: false },
    ],
  },
  {
    id: "demo-sale-2",
    created_at: "2026-07-06T17:40:00.000Z",
    created_by: "demo-owner",
    payment_method: "tarjeta",
    total: 110,
    cash_received: null,
    change_given: null,
    sale_items: [
      { id: "demo-item-4", sale_id: "demo-sale-2", product_id: "demo-quesadillas", product: "Quesadillas", quantity: 2, unit_price: 35, customization: null, subtotal: 70, complimentary: false },
      { id: "demo-item-5", sale_id: "demo-sale-2", product_id: "demo-tortillas-500", product: "Tortillas 500 g", quantity: 1, unit_price: 15, customization: null, subtotal: 15, complimentary: false },
      { id: "demo-item-6", sale_id: "demo-sale-2", product_id: "demo-totopos", product: "Totopos", quantity: 1, unit_price: 30, customization: null, subtotal: 30, complimentary: false },
    ],
  },
]

export async function getActiveProducts(): Promise<Product[]> {
  if (!hasSupabaseConfig()) return DEMO_PRODUCTS.filter((product) => product.active)
  const supabase = await createClient()
  const { data } = await supabase.from("products").select("*").eq("active", true).order("sort_order")
  return (data ?? []).map((product) => ({ ...product, category: normalizeCategory(product.category) })) as Product[]
}

export async function getAllProducts(): Promise<Product[]> {
  if (!hasSupabaseConfig()) return DEMO_PRODUCTS
  const supabase = await createClient()
  const { data } = await supabase.from("products").select("*").order("sort_order")
  return (data ?? []).map((product) => ({ ...product, category: normalizeCategory(product.category) })) as Product[]
}

export async function getInventoryForDate(date: string): Promise<InventoryRow[]> {
  if (!hasSupabaseConfig()) return DEMO_INVENTORY.filter((row) => row.date === date)
  const profile = await getCurrentProfile()
  if (!profile || (profile.role === "seller" && date !== todayYMD())) return []
  const supabase = await createClient()
  const { data } = await supabase.from("inventory").select("*").eq("date", date)
  return (data ?? []) as InventoryRow[]
}

export async function getSalesForRange(startYMD: string, endYMD: string): Promise<SaleWithItems[]> {
  if (!hasSupabaseConfig()) {
    return DEMO_SALES.filter((sale) => sale.created_at.slice(0, 10) >= startYMD && sale.created_at.slice(0, 10) <= endYMD)
  }

  const profile = await getCurrentProfile()
  if (!profile) return []
  if (profile.role === "seller") {
    startYMD = todayYMD()
    endYMD = startYMD
  }

  const supabase = await createClient()
  const { startISO, endISO } = ymdRangeToISO(startYMD, endYMD)
  const { data } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .gte("created_at", startISO)
    .lt("created_at", endISO)
    .order("created_at", { ascending: false })
  return (data ?? []) as SaleWithItems[]
}

export type DashboardData = {
  salesCount: number
  revenue: number
  avgTicket: number
  topProduct: { name: string; qty: number } | null
  inventory: { name: string; current: number; opening: number }[]
  soldOut: string[]
}

export async function getDashboardData(date: string): Promise<DashboardData> {
  const [sales, inventory, products] = await Promise.all([
    getSalesForRange(date, date),
    getInventoryForDate(date),
    getActiveProducts(),
  ])

  const salesCount = sales.length
  const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0)
  const avgTicket = salesCount ? revenue / salesCount : 0

  const qtyByProduct = new Map<string, number>()
  for (const s of sales) {
    for (const it of s.sale_items ?? []) {
      qtyByProduct.set(it.product, (qtyByProduct.get(it.product) ?? 0) + it.quantity)
    }
  }
  let topProduct: { name: string; qty: number } | null = null
  for (const [name, qty] of qtyByProduct) {
    if (!topProduct || qty > topProduct.qty) topProduct = { name, qty }
  }

  const productById = new Map(products.map((p) => [p.id, p]))
  const inventoryView = inventory
    .map((row) => {
      const p = productById.get(row.product_id)
      return p ? { name: p.name, current: row.current_stock, opening: row.opening_stock } : null
    })
    .filter((x): x is { name: string; current: number; opening: number } => x !== null)
    .sort((a, b) => a.current - b.current)

  const soldOut = inventoryView.filter((i) => i.current <= 0).map((i) => i.name)

  return { salesCount, revenue, avgTicket, topProduct, inventory: inventoryView, soldOut }
}
