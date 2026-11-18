import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'
import type { ReportStatus, ReportKind } from '../../types'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-muted text-muted-foreground',
      primary: 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-100',
      secondary: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/50 dark:text-secondary-300',
      accent: 'bg-accent-50 text-accent-700 dark:bg-accent-700/30 dark:text-accent-100',
      success: 'bg-success-50 text-success-700 dark:bg-success-700/30 dark:text-success-100',
      warning: 'bg-warning-50 text-warning-700 dark:bg-warning-700/30 dark:text-warning-100',
      destructive: 'bg-destructive-50 text-destructive-700 dark:bg-destructive-700/30 dark:text-destructive-100'
    }
  },
  defaultVariants: { variant: 'default' }
})

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, { label: string; variant: 'warning' | 'success' | 'secondary' | 'destructive' | 'default' }> = {
    active: { label: 'Active', variant: 'warning' },
    resolved: { label: 'Resolved', variant: 'success' },
    reunited: { label: 'Reunited', variant: 'success' },
    flagged: { label: 'Flagged', variant: 'destructive' },
    archived: { label: 'Archived', variant: 'default' }
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={variant}>{label}</Badge>
}

export function KindBadge({ kind }: { kind: ReportKind }) {
  return <Badge variant={kind === 'missing' ? 'destructive' : 'secondary'}>{kind === 'missing' ? 'Missing' : 'Found'}</Badge>
}
