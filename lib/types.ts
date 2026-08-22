export type CustomizationOption = {
  label: string
  price_delta: number
}

export type ProductCustomization = {
  label: string
  options: CustomizationOption[]
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  tracks_inventory: boolean
  sort_order: number
  active: boolean
  customization: ProductCustomization | null
}

export type InventoryRow = {
  product_id: string
  date: string
  opening_stock: number
  current_stock: number
}

export type CartItem = {
  key: string
  product_id: string
  product: string
  unit_price: number
  quantity: number
  customization: string | null
  tracks_inventory: boolean
  complimentary: boolean
}

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "mixto" | "cortesia"

export type Sale = {
  id: string
  created_at: string
  payment_method: PaymentMethod
  total: number
  cash_received: number | null
  change_given: number | null
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string | null
  product: string
  quantity: number
  unit_price: number
  customization: string | null
  subtotal: number
  complimentary: boolean
}

export type SaleWithItems = Sale & { sale_items: SaleItem[] }
