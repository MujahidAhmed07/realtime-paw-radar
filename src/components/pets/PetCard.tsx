import { Link } from 'react-router-dom'
import { MapPin, Clock, Heart } from 'lucide-react'
import { useState } from 'react'
import type { PetReport } from '../../types'
import { KindBadge, StatusBadge } from '../ui/Badge'
import { PhotoGrid } from './Photo'
import { animalEmoji, timeAgo, formatDistance } from '../../lib/utils'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import { cn } from '../../lib/cn'

export function PetCard({ report, distanceKm, onSavedChange }: { report: PetReport; distanceKm?: number; onSavedChange?: (saved: boolean) => void }) {
  const { session } = useAuth()
  const [saved, setSaved] = useState(false)

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!session) return
    const now = await dataProvider.toggleSaved(session.user.id, report.id)
    setSaved(now)
    onSavedChange?.(now)
  }

  return (
    <Link to={`/pet/${report.id}`} className="card-surface group overflow-hidden transition hover:shadow-card-hover">
      <div className="relative h-44">
        <PhotoGrid photos={report.photos} alt={report.pet_name ?? `${report.animal_type} report`} className="h-44" />
        <div className="absolute left-3 top-3 flex gap-2">
          <KindBadge kind={report.kind} />
          {report.status !== 'active' && <StatusBadge status={report.status} />}
        </div>
        {session && (
          <button onClick={toggleSave} aria-label={saved ? 'Unsave report' : 'Save report'}
            className={cn('absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow transition hover:bg-white', saved ? 'text-destructive' : 'text-primary')}>
            <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
          </button>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-primary dark:bg-dark-card/90 dark:text-dark-fg">
          {animalEmoji[report.animal_type] ?? '🐾'} {report.pet_name ?? report.report_code}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-sm text-muted-foreground">
          {report.kind === 'missing' ? 'Missing' : report.found_status === 'spotted' ? 'Spotted' : 'Found'}
          {report.breed ? ` · ${report.breed}` : ''}{report.color ? ` · ${report.color}` : ''}
        </p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{report.location_name ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
          {distanceKm != null && <span className="shrink-0 font-semibold text-secondary">· {formatDistance(distanceKm)}</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" /> {timeAgo(report.created_at)} · {report.report_code}
        </p>
      </div>
    </Link>
  )
}
