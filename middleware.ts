import { updateSession } from "@/lib/supabase/proxy"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  if (!hasSupabaseConfig()) return
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
