import "server-only"

import { redirect } from "next/navigation"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

const DEMO_PROFILE: Profile = {
  id: "demo-owner",
  role: "owner",
  display_name: "Modo demo",
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabaseConfig()) return DEMO_PROFILE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle()

  return data as Profile | null
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/auth/login")
  return profile
}

export async function requireOwner(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== "owner") redirect("/")
  return profile
}
