import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BellOff, CheckCheck, Trash2, MessageCircle, Eye, Bot, PawPrint, RefreshCcw } from 'lucide-react'
import { useApp } from '../../store/app'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { timeAgo } from '../../lib/utils'
import { cn } from '../../lib/cn'

const iconFor = (type: string) => {
  if (type === 'nearby_missing') return <PawPrint className="h-5 w-5 text-destructive" />
  if (type === 'nearby_found') return <PawPrint className="h-5 w-5 text-success-600" />
  if (type === 'new_sighting') return <Eye className="h-5 w-5 text-warning-600" />
  if (type === 'new_message') return <MessageCircle className="h-5 w-5 text-secondary" />
  if (type === 'ai_match') return <Bot className="h-5 w-5 text-accent-600" />
  return <RefreshCcw className="h-5 w-5 text-muted-foreground" />
}

export function NotificationsPage() {
  const { notifications, unread, markRead, markAllRead, removeNotification } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const openNotification = async (id: string, data: Record<string, unknown>) => {
    await markRead(id)
    if (data.conversation_id) navigate(`/dashboard/messages?c=${data.conversation_id}`)
    else if (data.report_id) navigate(`/pet/${data.report_id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Notifications {unread > 0 && <span className="ml-1 rounded-full bg-destructive px-2.5 py-0.5 text-sm text-white">{unread}</span>}</h1>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark all read</Button>
        )}
      </div>

      {params.get('c') && (
        <div className="rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary-700">
          <Link to={`/dashboard/messages?c=${params.get('c')}`} className="font-semibold underline">You have an open conversation →</Link>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState icon={<BellOff className="h-10 w-10" />} title="No notifications yet"
          description="You'll be alerted here when pets go missing near you, when sightings arrive, and for new messages." />
      ) : (
        <ul className="space-y-2">
          {notifications.map(n => (
            <li key={n.id}
              className={cn('card-surface flex cursor-pointer items-start gap-3 p-4 transition hover:shadow-card', !n.read && 'border-l-4 border-l-secondary')}>
              <span className="mt-0.5">{iconFor(n.type)}</span>
              <div className="min-w-0 flex-1" onClick={() => openNotification(n.id, n.data)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') openNotification(n.id, n.data) }}>
                <p className={'text-sm ' + (n.read ? 'font-medium text-muted-foreground' : 'font-semibold')}>{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.read && <Button variant="ghost" size="icon" aria-label="Mark as read" onClick={e => { e.stopPropagation(); markRead(n.id) }}><CheckCheck className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={e => { e.stopPropagation(); removeNotification(n.id) }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
