import { supabaseEnabled } from '../supabase/client'
import { localProvider } from './localProvider'
import { supabaseProvider } from './supabaseProvider'
import type { DataProvider } from '../../types'

export const dataProvider: DataProvider = supabaseEnabled() ? supabaseProvider : localProvider
export const usingLocalBackend = dataProvider.mode === 'local'
