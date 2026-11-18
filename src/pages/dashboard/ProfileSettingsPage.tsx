import { useEffect, useState } from 'react'
import { Save, MapPin, BellRing, Camera } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import { useToast } from '../../components/ui/Toast'
import { getPosition } from '../../services/location'
import type { NotificationPreferences } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input, Label, Textarea, Select } from '../../components/ui'
import { cn } from '../../lib/cn'

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4 dark:border-dark-border">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-secondary' : 'bg-muted-foreground/30')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function ProfileSettingsPage() {
  const { session, profile, refreshProfile } = useAuth()
  const { push } = useToast()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [addressHint, setAddressHint] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name); setPhone(profile.phone); setBio(profile.bio ?? ''); setAddressHint(profile.address_hint ?? '')
    if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
    if (session) dataProvider.getNotificationPrefs(session.user.id).then(setPrefs)
  }, [profile, session])

  const saveProfile = async () => {
    if (!session) return
    setSaving(true)
    try {
      const patch: Record<string, unknown> = { full_name: fullName, phone, bio: bio || null, address_hint: addressHint || null }
      if (avatar) {
        const urls = await dataProvider.uploadPhotos(session.user.id, [avatar])
        patch.avatar_url = urls[0]
      }
      await dataProvider.updateProfile(session.user.id, patch)
      await refreshProfile()
      push('success', 'Profile saved')
    } catch (e) { push('error', 'Could not save profile', (e as Error).message) } finally { setSaving(false) }
  }

  const updatePrefs = (patch: Partial<NotificationPreferences>) => {
    setPrefs(p => p ? { ...p, ...patch } : p)
  }

  const savePrefs = async () => {
    if (!session || !prefs) return
    setSavingPrefs(true)
    try {
      await dataProvider.updateNotificationPrefs(session.user.id, prefs)
      push('success', 'Notification preferences saved')
    } catch (e) { push('error', 'Could not save preferences', (e as Error).message) } finally { setSavingPrefs(false) }
  }

  const enableBrowserPush = async (enabled: boolean) => {
    if (!enabled) { updatePrefs({ browser_push_enabled: false }); return }
    if (!('Notification' in window)) { push('error', 'Not supported', 'This browser does not support notifications'); return }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      updatePrefs({ browser_push_enabled: true })
      new Notification('PetAlert', { body: 'Browser notifications are enabled! 🐾' })
    } else {
      push('info', 'Permission not granted', 'Browser notifications remain off.')
    }
  }

  const setLocation = async () => {
    if (!session) return
    try {
      const pos = await getPosition()
      await dataProvider.updateLocation(session.user.id, pos.latitude, pos.longitude)
      await refreshProfile()
      push('success', 'Location saved', 'Nearby alerts will use this location.')
    } catch (e) { push('error', 'Location failed', (e as Error).message) }
  }

  const changePassword = async () => {
    if (newPassword.length < 8) { push('error', 'Password too short', 'Use at least 8 characters'); return }
    try {
      await dataProvider.updatePassword(newPassword)
      setNewPassword('')
      push('success', 'Password changed')
    } catch (e) { push('error', 'Could not change password', (e as Error).message) }
  }

  if (!profile || !prefs) return <div className="skeleton h-96 w-full" />

  return (
    <div className="space-y-6">
      <h1>Profile Settings</h1>

      <section className="card-surface p-5">
        <h2 className="text-lg font-semibold">Personal information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional, never public)</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short intro (shown on your reports)" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="addressHint">Address hint (optional)</Label>
            <Input id="addressHint" value={addressHint} onChange={e => setAddressHint(e.target.value)} placeholder="e.g. Kadıköy area — approximate, never shown publicly" />
          </div>
          <div>
            <Label>Profile picture</Label>
            <div className="flex items-center gap-3">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white">{fullName[0] ?? '?'}</span>}
              <label className="cursor-pointer rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
                <Camera className="mr-2 inline h-4 w-4" /> Choose image
                <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatar(f); setAvatarPreview(URL.createObjectURL(f)) } }} />
              </label>
            </div>
          </div>
        </div>
        <div className="mt-4"><Button onClick={saveProfile} loading={saving}><Save className="h-4 w-4" /> Save profile</Button></div>
      </section>

      <section className="card-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5 text-secondary" /> Location for nearby alerts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          PetAlert stores your location once, only when you press the button below — it never tracks you in the background.
          Your coordinates are used solely to compute distances for alerts. You can clear them by disabling alerts.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" onClick={setLocation}><MapPin className="h-4 w-4" /> Update my location</Button>
          {profile.location_lat != null && <span className="text-sm text-muted-foreground">Saved: {profile.location_lat.toFixed(3)}, {profile.location_lng?.toFixed(3)}</span>}
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="h-5 w-5 text-warning-600" /> Notification preferences</h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Default alert radius</Label>
            <Select value={prefs.default_radius_km} onChange={e => updatePrefs({ default_radius_km: Number(e.target.value) as 1 | 3 | 5 | 10 })} className="w-44">
              <option value={1}>1 km</option><option value={3}>3 km</option><option value={5}>5 km</option><option value={10}>10 km</option>
            </Select>
          </div>
          <Toggle label="Nearby missing pet alerts" description="Notify me when a pet goes missing within my radius" checked={prefs.nearby_missing_enabled} onChange={v => updatePrefs({ nearby_missing_enabled: v })} />
          <Toggle label="Nearby found pet alerts" description="Notify me when a pet is found within my radius" checked={prefs.nearby_found_enabled} onChange={v => updatePrefs({ nearby_found_enabled: v })} />
          <Toggle label="Sighting alerts" description="Notify me when someone reports a sighting on my reports" checked={prefs.sighting_alerts_enabled} onChange={v => updatePrefs({ sighting_alerts_enabled: v })} />
          <Toggle label="Message alerts" description="Notify me about new messages" checked={prefs.message_alerts_enabled} onChange={v => updatePrefs({ message_alerts_enabled: v })} />
          <Toggle label="AI match suggestions" description="Notify me about possible matches (suggestions only)" checked={prefs.match_alerts_enabled} onChange={v => updatePrefs({ match_alerts_enabled: v })} />
          <Toggle label="Status change alerts" description="Notify me when my reports change status" checked={prefs.status_change_alerts_enabled} onChange={v => updatePrefs({ status_change_alerts_enabled: v })} />
          <Toggle label="Browser push notifications" description="Show desktop notifications (requires browser permission)" checked={prefs.browser_push_enabled} onChange={enableBrowserPush} />
        </div>
        <div className="mt-4"><Button onClick={savePrefs} loading={savingPrefs}><Save className="h-4 w-4" /> Save preferences</Button></div>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="mt-3 flex max-w-md gap-2">
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" aria-label="New password" autoComplete="new-password" />
          <Button onClick={changePassword}>Update</Button>
        </div>
      </section>
    </div>
  )
}
