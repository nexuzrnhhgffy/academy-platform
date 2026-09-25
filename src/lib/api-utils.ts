import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>

export async function requireUser(req: NextRequest): Promise<SessionUser | null> {
  return getSessionUser(req)
}

export function can(role: string, allowed: string[]): boolean {
  return allowed.includes(role)
}

export const ADMIN_ROLES = ['ADMIN', 'MANAGER']
export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

// Branch scoping: ADMIN sees all, others are limited to their branch
export function branchScope(user: SessionUser): string | undefined {
  if (user.role === 'ADMIN') return undefined
  return user.branchId || undefined
}

export async function logAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  try {
    await db.auditLog.create({ data: { userId, action, entity, entityId, details } })
  } catch {
    // audit logging must never break the request
  }
}

export function genRefCode(): string {
  return 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase()
}

export function genCertCode(): string {
  return 'AC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export async function notify(userId: string, title: string, body?: string, type = 'INFO') {
  try {
    await db.notification.create({ data: { userId, title, body, type } })
  } catch {
    // ignore
  }
}
