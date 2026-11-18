import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PawPrint, UserRound } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../store/auth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})
type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { push } = useToast()
  const navigate = useNavigate()
  const { loginAsGuest } = useAuth()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError('')
    try {
      await dataProvider.login(data.email, data.password)
      push('success', 'Welcome back!')
      navigate('/dashboard')
    } catch (e) {
      setServerError((e as Error).message)
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"><PawPrint className="h-7 w-7" /></span>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to report pets, receive alerts and chat with finders.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card-surface space-y-4 p-6" noValidate>
          {serverError && <div role="alert" className="rounded-lg bg-destructive-50 px-3 py-2 text-sm text-destructive-700">{serverError}</div>}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground dark:bg-dark-card">or</span>
            <span className="absolute left-0 right-0 top-1/2 h-px bg-border dark:bg-dark-border" aria-hidden />
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={() => { loginAsGuest(); push('info', 'Guest Mode', 'You can browse reports and the map. Create an account to report pets.'); navigate('/dashboard') }}
          >
            <UserRound className="h-4 w-4" /> Continue as Guest
          </Button>
          <div className="flex justify-between text-sm">
            <Link to="/reset-request" className="text-secondary hover:underline">Forgot password?</Link>
            <Link to="/register" className="font-medium text-secondary hover:underline">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
