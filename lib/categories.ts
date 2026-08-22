export type ProductCategory = "comida" | "bebidas" | "para_llevar"

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  comida: "Comida",
  bebidas: "Bebidas",
  para_llevar: "Para llevar",
}

export const CATEGORY_ORDER: ProductCategory[] = ["comida", "bebidas", "para_llevar"]

export function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat as ProductCategory] ?? cat
}

export function normalizeCategory(cat: string): ProductCategory {
  if (cat === "bebidas") return "bebidas"
  if (cat === "para_llevar" || cat === "tortillas") return "para_llevar"
  return "comida"
}
