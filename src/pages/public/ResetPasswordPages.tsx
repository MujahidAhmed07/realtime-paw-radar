import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { localProvider } from '../../services/providers/localProvider'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { usingLocalBackend } from '../../services/providers'

const reqSchema = z.object({ email: z.string().email('Enter a valid email address') })
type ReqForm = z.infer<typeof reqSchema>

const confirmSchema = z.object({
  token: z.string().min(6, 'Paste the reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string()
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type ConfirmForm = z.infer<typeof confirmSchema>

export function ResetRequestPage() {
  const { push } = useToast()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReqForm>({ resolver: zodResolver(reqSchema) })

  const onSubmit = async (data: ReqForm) => {
    try {
      await dataProvider.requestPasswordReset(data.email)
      setSent(true)
      push('success', 'Reset instructions sent', 'Check your email for the reset link.')
    } catch (e) { push('error', 'Could not send reset', (e as Error).message) }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card-surface p-6">
          <div className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-secondary" />
            <h1 className="mt-3 text-xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your account email and we'll send reset instructions.</p>
          </div>
          {sent ? (
            <div className="mt-5 rounded-lg bg-success-50 px-3 py-3 text-sm text-success-700">
              If an account exists for that email, reset instructions are on the way.
              {usingLocalBackend && ' (Dev mode: a token prompt appears — copy it and open /reset-confirm.)'}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" loading={isSubmitting}>Send reset instructions</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm"><Link to="/login" className="text-secondary hover:underline">Back to sign in</Link></p>
        </div>
      </div>
    </div>
  )
}

export function ResetConfirmPage() {
  const { push } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConfirmForm>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { token: params.get('token') ?? '' }
  })

  const onSubmit = async (data: ConfirmForm) => {
    try {
      if (usingLocalBackend) {
        await localProvider.confirmReset(data.token, data.password)
      } else {
        // Supabase: user arrives from reset email with a recovery session
        await dataProvider.updatePassword(data.password)
      }
      push('success', 'Password updated', 'You can now sign in with your new password.')
      navigate('/login')
    } catch (e) { push('error', 'Reset failed', (e as Error).message) }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="card-surface w-full max-w-md p-6">
        <h1 className="text-xl font-bold">Set a new password</h1>
        {usingLocalBackend && (
          <p className="mt-1 text-sm text-muted-foreground">Paste the reset token you received in dev mode.</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          {usingLocalBackend && (
            <div>
              <Label htmlFor="token">Reset token</Label>
              <Input id="token" {...register('token')} placeholder="Paste token" />
              {errors.token && <p className="mt-1 text-xs text-destructive">{errors.token.message}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" {...register('confirm')} />
            {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>Update password</Button>
        </form>
      </div>
    </div>
  )
}
