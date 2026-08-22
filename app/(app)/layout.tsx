import type React from "react"
import { DesktopSidebar, MobileTabBar, MobileHeader } from "@/components/app-nav"
import { requireProfile } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()

  return (
    <div className="flex min-h-svh bg-background">
      <DesktopSidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader role={profile.role} />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  )
}
