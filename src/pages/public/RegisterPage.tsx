import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PawPrint, CheckCircle2 } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string()
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { push } = useToast()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterForm) => {
    setServerError('')
    try {
      const res = await dataProvider.register(data.email, data.password, data.fullName)
      if (res.needsEmailConfirmation) {
        setNeedsConfirm(true)
      } else {
        push('success', 'Account created', 'Welcome to PetAlert!')
        navigate('/dashboard')
      }
    } catch (e) { setServerError((e as Error).message) }
  }

  if (needsConfirm) {
    return (
      <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <div className="card-surface max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success-600" />
          <h1 className="mt-4 text-xl font-bold">Confirm your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to your email address. Click it, then sign in.</p>
          <Link to="/login" className="mt-5 inline-block rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white">Go to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"><PawPrint className="h-7 w-7" /></span>
          <h1 className="mt-4 text-2xl font-bold">Join PetAlert</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get alerted when pets go missing near you.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card-surface space-y-4 p-6" noValidate>
          {serverError && <div role="alert" className="rounded-lg bg-destructive-50 px-3 py-2 text-sm text-destructive-700">{serverError}</div>}
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" {...register('fullName')} />
            {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
            {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-secondary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
