"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ShoppingCart, SlidersHorizontal, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand-mark"
import { signOut } from "@/lib/actions"
import type { UserRole } from "@/lib/types"

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/vender", label: "Vender", icon: ShoppingCart },
  { href: "/control", label: "Control", icon: SlidersHorizontal },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

type NavProps = {
  role: UserRole
}

function roleLabel(role: UserRole) {
  return role === "owner" ? "Dueño" : "Vendedor"
}

export function DesktopSidebar({ role }: NavProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-6 md:flex">
      <div className="flex items-center gap-3 px-2">
        <BrandMark className="h-10 w-10 rounded-xl" />
        <div>
          <p className="font-serif text-lg font-semibold leading-tight">Mercados Nixta</p>
          <p className="text-xs text-muted-foreground">{roleLabel(role)}</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </aside>
  )
}

export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-card/95 backdrop-blur md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileHeader({ role }: NavProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:hidden">
      <div className="flex items-center gap-2">
        <BrandMark className="h-8 w-8 rounded-lg" />
        <div>
          <p className="font-serif text-sm font-semibold leading-tight">Mercados Nixta</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel(role)}</p>
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </header>
  )
}

