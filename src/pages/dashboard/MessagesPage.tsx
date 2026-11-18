import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Send, ArrowLeft, Flag, Search, MessagesSquare } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import { useToast } from '../../components/ui/Toast'
import type { Conversation, Message, PetReport, Profile } from '../../types'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui'
import { PhotoGrid } from '../../components/pets/Photo'
import { initials, timeAgo } from '../../lib/utils'
import { cn } from '../../lib/cn'

export function MessagesPage() {
  const { session } = useAuth()
  const { push } = useToast()
  const [params, setParams] = useSearchParams()
  const activeId = params.get('c')
  const [conversations, setConversations] = useState<(Conversation & { other: Profile | null; report: PetReport | null })[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadConversations = async () => {
    if (!session) return
    setConversations(await dataProvider.listConversations(session.user.id))
    setLoading(false)
  }

  useEffect(() => { loadConversations() }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeId || !session) return
    let active = true
    const load = async () => {
      const msgs = await dataProvider.listMessages(activeId)
      if (!active) return
      setMessages(msgs)
      await dataProvider.markConversationRead(activeId, session.user.id)
    }
    load()
    const unsub = dataProvider.subscribe('messages', () => { load(); loadConversations() })
    const t = setInterval(load, 10000) // safety net for local mode
    return () => { active = false; unsub(); clearInterval(t) }
  }, [activeId, session])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !activeId || !draft.trim()) return
    try {
      await dataProvider.sendMessage(activeId, session.user.id, draft)
      setDraft('')
      setMessages(await dataProvider.listMessages(activeId))
    } catch (err) { push('error', 'Could not send', (err as Error).message) }
  }

  const reportAbuse = async (conv: Conversation & { report?: PetReport | null }) => {
    if (!conv.report) return
    try {
      await dataProvider.createFlag({ report_id: conv.report.id, reporter_id: session!.user.id, reason: 'Abusive conversation', details: `Conversation ${conv.id}` })
      push('success', 'Reported', 'Our moderators will review this conversation.')
    } catch (e) { push('error', 'Could not report', (e as Error).message) }
  }

  const filtered = conversations.filter(c =>
    (c.other?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.report?.report_code ?? '').toLowerCase().includes(search.toLowerCase()))
  const active = conversations.find(c => c.id === activeId)

  return (
    <div className="space-y-4">
      <h1>Messages</h1>
      <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
        {/* Conversation list */}
        <div className={cn('card-surface flex flex-col overflow-hidden', activeId && 'hidden lg:flex')}>
          <div className="border-b border-border p-3 dark:border-dark-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9" aria-label="Search conversations" />
            </div>
          </div>
          <div className="max-h-[60vh] flex-1 overflow-y-auto">
            {loading ? <div className="space-y-2 p-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
              : filtered.length === 0
                ? <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet. Start one from a pet report page.</p>
                : (
                  <ul>
                    {filtered.map(c => (
                      <li key={c.id}>
                        <button onClick={() => setParams({ c: c.id })}
                          className={cn('flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted dark:border-dark-border dark:hover:bg-dark-border',
                            activeId === c.id && 'bg-muted dark:bg-dark-border')}>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{initials(c.other?.full_name ?? '?')}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{c.other?.full_name ?? 'Unknown'}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.report ? `Re: ${c.report.pet_name ?? c.report.report_code} · ` : ''}{c.last_message_preview ?? 'No messages yet'}</p>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{c.last_message_at ? timeAgo(c.last_message_at) : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="card-surface flex min-h-[60vh] flex-col overflow-hidden">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState icon={<MessagesSquare className="h-10 w-10" />} title="Select a conversation"
                description="Conversations start automatically when you message a reporter or a finder messages you." />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-3 dark:border-dark-border">
                <button className="lg:hidden" onClick={() => setParams({})} aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{initials(active.other?.full_name ?? '?')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{active.other?.full_name ?? 'Unknown'}</p>
                  {active.report && <Link to={`/pet/${active.report.id}`} className="text-xs text-secondary hover:underline">About: {active.report.pet_name ?? active.report.report_code}</Link>}
                </div>
                <Button variant="ghost" size="icon" aria-label="Report conversation" onClick={() => reportAbuse(active)}><Flag className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet — say hello 👋</p>}
                {messages.map(m => {
                  const mine = m.sender_id === session?.user.id
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                        mine ? 'bg-secondary text-white rounded-br-sm' : 'bg-muted dark:bg-dark-border rounded-bl-sm')}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={cn('mt-1 text-[10px]', mine ? 'text-secondary-100' : 'text-muted-foreground')}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border p-3 dark:border-dark-border">
                <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a message…" aria-label="Message" maxLength={2000} />
                <Button type="submit" disabled={!draft.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function SavedReportsPage() {
  const [reports, setReports] = useState<PetReport[] | null>(null)
  const { push } = useToast()

  useEffect(() => {
    if (!sessionUserId()) return
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sessionUserId = () => undefined as string | undefined
  async function load() {
    const s = await dataProvider.getSession()
    if (!s) return
    setReports(await dataProvider.listSaved(s.user.id))
  }

  const unsave = async (id: string) => {
    const s = await dataProvider.getSession()
    if (!s) return
    await dataProvider.toggleSaved(s.user.id, id)
    push('info', 'Removed from saved')
    load()
  }

  if (!reports) return <div className="skeleton h-64 w-full" />
  return (
    <div className="space-y-6">
      <h1>Saved Reports</h1>
      {reports.length === 0 ? (
        <EmptyState title="Nothing saved yet" description="Save reports from any pet card to keep track of them here." />
      ) : (
        <ul className="space-y-3">
          {reports.map(r => (
            <li key={r.id} className="card-surface flex items-center gap-4 p-4">
              <div className="w-20 shrink-0"><PhotoGrid photos={r.photos} alt={r.pet_name ?? 'pet'} className="h-16 rounded-lg" /></div>
              <div className="min-w-0 flex-1">
                <Link to={`/pet/${r.id}`} className="font-semibold hover:text-secondary">{r.pet_name ?? r.report_code}</Link>
                <p className="text-sm text-muted-foreground">{r.kind} · {r.status} · {r.breed ?? r.animal_type}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => unsave(r.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
