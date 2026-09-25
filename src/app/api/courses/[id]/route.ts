import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const course = await db.course.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      classes: {
        include: { teacher: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } },
      },
    },
  })
  if (!course) return fail('دوره یافت نشد', 404)
  return ok({ course })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  const b = await req.json()

  const data: Record<string, unknown> = {}
  if (b.title) data.title = String(b.title)
  if (b.description !== undefined) data.description = b.description
  if (b.category) data.category = b.category
  if (b.level) data.level = b.level
  if (b.price !== undefined) data.price = Number(b.price)
  if (b.durationHours !== undefined) data.durationHours = Number(b.durationHours)
  if (b.sessionsCount !== undefined) data.sessionsCount = Number(b.sessionsCount)
  if (b.coverColor) data.coverColor = b.coverColor
  if (b.isActive !== undefined) data.isActive = Boolean(b.isActive)
  if (b.branchId !== undefined && user.role === 'ADMIN') data.branchId = b.branchId || null

  const course = await db.course.update({ where: { id }, data })
  await logAudit(user.id, 'UPDATE', 'Course', id, `ویرایش دوره ${course.title}`)
  return ok({ course })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN') return fail('فقط مدیر سیستم می‌تواند دوره حذف کند', 403)
  const { id } = await params
  const count = await db.classGroup.count({ where: { courseId: id } })
  if (count > 0) return fail('این دوره کلاس فعال دارد؛ ابتدا کلاس‌ها را حذف کنید')
  await db.course.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Course', id, 'حذف دوره')
  return ok({ ok: true })
}
