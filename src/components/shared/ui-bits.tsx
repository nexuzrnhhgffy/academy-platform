'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ReactNode } from 'react'
import { toFa } from '@/lib/fa'

export function StatCard({
  title,
  value,
  sub,
  icon,
  tone = 'teal',
  loading,
}: {
  title: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
  tone?: 'teal' | 'amber' | 'rose' | 'cyan' | 'violet' | 'emerald'
  loading?: boolean
}) {
  const tones: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1.5" />
          ) : (
            <p className="text-xl md:text-2xl font-bold mt-1 truncate">{value}</p>
          )}
          {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 size-10 md:size-11 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${color}`}>{label}</span>
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base md:text-lg font-bold">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
        {icon || '—'}
      </div>
      <p className="font-medium">{title}</p>
      {sub && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{sub}</p>}
    </div>
  )
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function CountPill({ n }: { n: number }) {
  return <Badge variant="secondary" className="text-[11px]">{toFa(n)}</Badge>
}
