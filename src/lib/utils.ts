import { loadTheme } from '../services/storage'

export function applyTheme(pref: 'light' | 'dark' | 'system') {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function initThemeWatcher(): () => void {
  applyTheme(loadTheme().theme)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => applyTheme(loadTheme().theme)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export const animalEmoji: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', reptile: '🦎', other: '🐾'
}

export function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}
