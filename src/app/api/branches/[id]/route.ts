import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, logAudit } from '@/lib/api-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN') return fail('دسترسی غیرمجاز', 403)
  const { id } = await params

  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.name) data.name = String(b.name)
  if (b.address !== undefined) data.address = b.address
  if (b.phone !== undefined) data.phone = b.phone
  if (b.managerId !== undefined) data.managerId = b.managerId || null
  if (b.isActive !== undefined) data.isActive = Boolean(b.isActive)

  const branch = await db.branch.update({ where: { id }, data })
  await logAudit(user.id, 'UPDATE', 'Branch', id, `ویرایش شعبه ${branch.name}`)
  return ok({ branch })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN') return fail('دسترسی غیرمجاز', 403)
  const { id } = await params

  const count = await db.classGroup.count({ where: { branchId: id } })
  if (count > 0) return fail('این شعبه کلاس فعال دارد و قابل حذف نیست')
  await db.branch.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Branch', id, 'حذف شعبه')
  return ok({ ok: true })
}
