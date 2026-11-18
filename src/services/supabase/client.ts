import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DataProvider } from '../../types'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return null
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })
  return client
}

export const supabaseEnabled = (): boolean => getSupabase() !== null

export type { DataProvider }
