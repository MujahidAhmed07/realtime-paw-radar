import { useNavigate } from 'react-router-dom'
import { X, UserPlus, ArrowRight, Lock } from 'lucide-react'

/**
 * Registration prompt shown to guests when they reach a restricted feature.
 * Non-destructive: closing returns the guest to the page they were on —
 * no redirects, no lost filters.
 */
export function RegistrationPrompt({ onClose, feature }: { onClose: () => void; feature?: string }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Registration prompt"
        className="card-surface relative z-10 w-full max-w-md animate-fade-in p-6 text-center">
        <button onClick={onClose} aria-label="Close prompt"
          className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-muted dark:hover:bg-dark-card">
          <X className="h-4 w-4" />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary">
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-bold">Create a free account</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a free account to report a missing pet, submit sightings, and receive real-time alerts from your community.
        </p>
        {feature && <p className="mt-1 text-xs text-muted-foreground/70">You tried to: {feature}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={() => navigate('/register')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary-700">
            <UserPlus className="h-4 w-4" /> Create Free Account
          </button>
          <button onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            Continue Browsing <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
