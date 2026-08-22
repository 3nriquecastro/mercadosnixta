import { SaleWorkspace } from "@/components/pos/sale-workspace"
import { getActiveProducts } from "@/lib/queries"

export default async function VenderPage() {
  const products = await getActiveProducts()

  return <SaleWorkspace products={products} />
}