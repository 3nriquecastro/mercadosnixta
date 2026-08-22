"use server"

import { createClient } from "@/lib/supabase/server"
import { todayYMD } from "@/lib/dates"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { PaymentMethod, ProductCustomization } from "@/lib/types"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { CATEGORY_ORDER, type ProductCategory } from "@/lib/categories"
import { getCurrentProfile } from "@/lib/auth"

function revalidatePos() {
  revalidatePath("/")
  revalidatePath("/control")
  revalidatePath("/vender")
}

type SaleItemInput = {
  product_id: string
  product: string
  quantity: number
  unit_price: number
  customization: string | null
  tracks_inventory: boolean
  complimentary: boolean
}

type UpdateSaleItemInput = {
  product_id: string | null
  product: string
  quantity: number
  unit_price: number
  subtotal: number
  customization: string | null
  complimentary: boolean
}

type CreateSaleInput = {
  items: SaleItemInput[]
  payment_method: PaymentMethod
  total: number
  cash_received: number | null
  change_given: number | null
}

export async function createSale(input: CreateSaleInput) {
  if (!hasSupabaseConfig()) return { ok: true, saleId: "demo" }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  if (!input.items.length) return { ok: false, error: "El carrito está vacío" }

  const fullComplimentary = input.payment_method === "cortesia"
  const saleItems = input.items.map((item) => {
    const complimentary = fullComplimentary || item.complimentary
    return {
      product_id: item.product_id,
      product: item.product,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customization: item.customization,
      complimentary,
      subtotal: complimentary ? 0 : item.unit_price * item.quantity,
    }
  })
  const chargedTotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0)

  // 1. Insert the sale
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      created_by: user.id,
      payment_method: input.payment_method,
      total: chargedTotal,
      cash_received: fullComplimentary ? null : input.cash_received,
      change_given: fullComplimentary ? null : input.change_given,
    })
    .select("id")
    .single()

  if (saleError || !sale) return { ok: false, error: saleError?.message ?? "No se pudo guardar la venta" }

  // 2. Insert the sale items
  const itemsPayload = saleItems.map((item) => ({
    sale_id: sale.id,
    ...item,
  }))

  const { error: itemsError } = await supabase.from("sale_items").insert(itemsPayload)
  if (itemsError) return { ok: false, error: itemsError.message }

  // 3. Decrement inventory for tracked products (today's row)
  const date = todayYMD()
  const tracked = input.items.filter((it) => it.tracks_inventory)

  if (tracked.length) {
    const productIds = [...new Set(tracked.map((it) => it.product_id))]
    const { data: rows } = await supabase
      .from("inventory")
      .select("product_id, opening_stock, current_stock")
      .eq("date", date)
      .in("product_id", productIds)

    const qtyByProduct = new Map<string, number>()
    for (const it of tracked) {
      qtyByProduct.set(it.product_id, (qtyByProduct.get(it.product_id) ?? 0) + it.quantity)
    }

    const upserts = (rows ?? []).map((row) => ({
        product_id: row.product_id,
        date,
        opening_stock: row.opening_stock,
        current_stock: Number(row.current_stock) - (qtyByProduct.get(row.product_id) ?? 0),
    }))

    if (upserts.length) {
      await supabase.from("inventory").upsert(upserts, { onConflict: "product_id,date" })
    }
  }

  revalidatePos()
  return { ok: true, saleId: sale.id }
}

export async function updateSale(input: {
  saleId: string
  payment_method: PaymentMethod
  cash_received: number | null
  change_given: number | null
  items: UpdateSaleItemInput[]
}) {
  if (!hasSupabaseConfig()) return { ok: true }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, created_at")
    .eq("id", input.saleId)
    .single()

  if (saleError || !sale) return { ok: false, error: saleError?.message ?? "No se encontró la venta" }

  const { data: oldItems, error: oldItemsError } = await supabase.from("sale_items").select("product_id, product, quantity").eq("sale_id", input.saleId)
  if (oldItemsError) return { ok: false, error: oldItemsError.message }

  const newItems = input.items.filter((item) => item.product.trim().length > 0 && item.quantity > 0)
  const fullComplimentary = input.payment_method === "cortesia"
  const chargedTotal = newItems.reduce(
    (sum, item) => sum + (fullComplimentary || item.complimentary ? 0 : item.subtotal),
    0,
  )

  const oldQtyByProduct = new Map<string, number>()
  for (const item of oldItems ?? []) {
    if (!item.product_id) continue
    oldQtyByProduct.set(item.product_id, (oldQtyByProduct.get(item.product_id) ?? 0) + Number(item.quantity))
  }

  const newQtyByProduct = new Map<string, number>()
  for (const item of newItems) {
    if (!item.product_id) continue
    newQtyByProduct.set(item.product_id, (newQtyByProduct.get(item.product_id) ?? 0) + item.quantity)
  }

  const affectedProductIds = [...new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()])]

  const { error: saleUpdateError } = await supabase
    .from("sales")
    .update({
      payment_method: input.payment_method,
      total: chargedTotal,
      cash_received: fullComplimentary ? null : input.cash_received,
      change_given: fullComplimentary ? null : input.change_given,
    })
    .eq("id", input.saleId)

  if (saleUpdateError) return { ok: false, error: saleUpdateError.message }

  const { error: deleteItemsError } = await supabase.from("sale_items").delete().eq("sale_id", input.saleId)
  if (deleteItemsError) return { ok: false, error: deleteItemsError.message }

  const payload = newItems.map((item) => ({
    sale_id: input.saleId,
    product_id: item.product_id,
    product: item.product,
    quantity: item.quantity,
    unit_price: item.unit_price,
    customization: item.customization,
    subtotal: fullComplimentary || item.complimentary ? 0 : item.subtotal,
    complimentary: fullComplimentary || item.complimentary,
  }))

  const { error: insertItemsError } = await supabase.from("sale_items").insert(payload)
  if (insertItemsError) return { ok: false, error: insertItemsError.message }

  const saleDate = sale.created_at.slice(0, 10)
  if (affectedProductIds.length) {
    const { data: rows } = await supabase
      .from("inventory")
      .select("product_id, opening_stock, current_stock")
      .eq("date", saleDate)
      .in("product_id", affectedProductIds)

    const upserts = (rows ?? []).map((row) => {
      const previousQty = oldQtyByProduct.get(row.product_id) ?? 0
      const nextQty = newQtyByProduct.get(row.product_id) ?? 0
      return {
        product_id: row.product_id,
        date: saleDate,
        opening_stock: row.opening_stock,
        current_stock: Number(row.current_stock) + previousQty - nextQty,
      }
    })

    if (upserts.length) {
      await supabase.from("inventory").upsert(upserts, { onConflict: "product_id,date" })
    }
  }

  revalidatePos()
  return { ok: true }
}

export async function saveInventoryOpening(entries: { product_id: string; opening_stock: number }[]) {
  if (!hasSupabaseConfig()) return { ok: true }
  if (!entries.length) return { ok: true }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const date = todayYMD()
  const productIds = entries.map((entry) => entry.product_id)
  const { data: existingRows, error: existingError } = await supabase
    .from("inventory")
    .select("product_id, opening_stock, current_stock")
    .eq("date", date)
    .in("product_id", productIds)

  if (existingError) return { ok: false, error: existingError.message }

  const existingByProduct = new Map((existingRows ?? []).map((row) => [row.product_id, row]))
  const payload = entries.map((entry) => {
    const existing = existingByProduct.get(entry.product_id)
    return {
      product_id: entry.product_id,
      date,
      opening_stock: entry.opening_stock,
      current_stock: existing
        ? Number(existing.current_stock) + entry.opening_stock - Number(existing.opening_stock)
        : entry.opening_stock,
    }
  })

  const { error } = await supabase.from("inventory").upsert(payload, { onConflict: "product_id,date" })
  if (error) return { ok: false, error: error.message }

  revalidatePos()
  return { ok: true }
}

export async function addProductToInventory(productId: string) {
  if (!hasSupabaseConfig()) return { ok: true }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("tracks_inventory")
    .eq("id", productId)
    .single()

  if (productError) return { ok: false, error: productError.message }
  if (!product?.tracks_inventory) return { ok: false, error: "Este producto no está marcado como inventariable" }

  const { error } = await supabase.from("inventory").upsert(
    {
      product_id: productId,
      date: todayYMD(),
      opening_stock: 0,
      current_stock: 0,
    },
    { onConflict: "product_id,date", ignoreDuplicates: true },
  )

  if (error) return { ok: false, error: error.message }
  revalidatePos()
  return { ok: true }
}

export async function removeProductFromInventory(productId: string) {
  if (!hasSupabaseConfig()) return { ok: true }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const date = todayYMD()
  const { data: row, error: rowError } = await supabase
    .from("inventory")
    .select("opening_stock, current_stock")
    .eq("product_id", productId)
    .eq("date", date)
    .maybeSingle()

  if (rowError) return { ok: false, error: rowError.message }
  if (!row) return { ok: true }
  if (Number(row.opening_stock) !== Number(row.current_stock)) {
    return { ok: false, error: "No se puede retirar porque ya tiene movimientos de venta hoy" }
  }

  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("product_id", productId)
    .eq("date", date)

  if (error) return { ok: false, error: error.message }
  revalidatePos()
  return { ok: true }
}

export async function toggleProduct(productId: string, active: boolean) {
  if (!hasSupabaseConfig()) return { ok: true }

  const profile = await getCurrentProfile()
  if (profile?.role !== "owner") return { ok: false, error: "Solo el dueño puede modificar productos" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.from("products").update({ active }).eq("id", productId)
  if (error) return { ok: false, error: error.message }
  revalidatePos()
  return { ok: true }
}

export async function saveProduct(input: {
  id?: string | null
  name: string
  category: string
  price: number
  tracks_inventory: boolean
  sort_order: number
  active: boolean
  customization: ProductCustomization | null
}) {
  if (!hasSupabaseConfig()) return { ok: true, productId: input.id ?? "demo" }

  const profile = await getCurrentProfile()
  if (profile?.role !== "owner") return { ok: false, error: "Solo el dueño puede modificar productos" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio" }
  if (input.price < 0) return { ok: false, error: "El precio no puede ser negativo" }
  if (!CATEGORY_ORDER.includes(input.category as ProductCategory)) {
    return { ok: false, error: "La categoría no es válida" }
  }

  if (input.id) {
    const { error } = await supabase.from("products").update({
      name: input.name,
      category: input.category,
      price: input.price,
      tracks_inventory: input.tracks_inventory,
      sort_order: input.sort_order,
      active: input.active,
      customization: input.customization,
    }).eq("id", input.id)
    if (error) return { ok: false, error: error.message }
    revalidatePos()
    return { ok: true, productId: input.id }
  }

  const { data, error } = await supabase.from("products").insert({
    name: input.name,
    category: input.category,
    price: input.price,
    tracks_inventory: input.tracks_inventory,
    sort_order: input.sort_order,
    active: input.active,
    customization: input.customization,
  }).select("id").single()

  if (error) return { ok: false, error: error.message }
  revalidatePos()
  return { ok: true, productId: data.id }
}

export async function deleteProduct(productId: string) {
  if (!hasSupabaseConfig()) return { ok: true }

  const profile = await getCurrentProfile()
  if (profile?.role !== "owner") return { ok: false, error: "Solo el dueño puede eliminar productos" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const [{ count: salesCount }, { count: inventoryCount }] = await Promise.all([
    supabase.from("sale_items").select("id", { count: "exact", head: true }).eq("product_id", productId),
    supabase.from("inventory").select("product_id", { count: "exact", head: true }).eq("product_id", productId),
  ])

  if ((salesCount ?? 0) > 0 || (inventoryCount ?? 0) > 0) {
    return { ok: false, error: "No se puede eliminar un producto con ventas o inventario. Desactívalo en su lugar." }
  }

  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) return { ok: false, error: error.message }
  revalidatePos()
  return { ok: true }
}

export async function signOut() {
  if (!hasSupabaseConfig()) {
    redirect("/auth/login")
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
