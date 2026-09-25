import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)

  const branches = await db.branch.findMany({
    where: user.role === 'ADMIN' ? {} : user.branchId ? { id: user.branchId } : {},
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { users: true, classes: true, courses: true, rooms: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return ok({ branches })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN') return fail('فقط مدیر سیستم می‌تواند شعبه ایجاد کند', 403)

  const b = await req.json()
  if (!b.name || !b.code) return fail('نام و کد شعبه الزامی است')
  const dup = await db.branch.findUnique({ where: { code: String(b.code) } })
  if (dup) return fail('این کد شعبه قبلاً استفاده شده است')

  const branch = await db.branch.create({
    data: {
      name: String(b.name),
      code: String(b.code).toUpperCase(),
      address: b.address || null,
      phone: b.phone || null,
      managerId: b.managerId || null,
    },
  })
  await logAudit(user.id, 'CREATE', 'Branch', branch.id, `ایجاد شعبه ${branch.name}`)
  return ok({ branch }, 201)
}
