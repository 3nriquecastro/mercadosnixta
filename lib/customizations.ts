import type { ProductCustomization } from "@/lib/types"

export function hasCustomization(customization: ProductCustomization | null | undefined) {
  return Boolean(customization && customization.options.length)
}

export function getCustomizationExtraPrice(
  customization: ProductCustomization | null | undefined,
  optionLabel: string,
) {
  return customization?.options.find((option) => option.label === optionLabel)?.price_delta ?? 0
}

export function defaultCustomization(customization: ProductCustomization | null | undefined) {
  return customization?.options[0]?.label ?? ""
}
