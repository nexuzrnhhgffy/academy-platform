import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const branchId = req.nextUrl.searchParams.get('branchId') || branchScope(user)
  const rooms = await db.room.findMany({
    where: branchId ? { branchId } : {},
    include: { branch: { select: { name: true } }, _count: { select: { classes: true } } },
  })
  return ok({ rooms })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const b = await req.json()
  if (!b.name || !b.branchId) return fail('نام کلاس و شعبه الزامی است')
  const room = await db.room.create({
    data: { name: String(b.name), capacity: Number(b.capacity) || 20, branchId: String(b.branchId) },
  })
  return ok({ room }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.room.delete({ where: { id } })
  return ok({ ok: true })
}
