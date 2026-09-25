import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-utils'

// GET /api/audit — admin only audit trail
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN') return fail('دسترسی غیرمجاز', 403)

  const logs = await db.auditLog.findMany({
    where: {},
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok({ logs })
}
