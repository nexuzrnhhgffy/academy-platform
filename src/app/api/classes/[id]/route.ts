import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/classes/:id — full detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const cls = await db.classGroup.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { select: { id: true, name: true, phone: true } },
      branch: { select: { name: true } },
      room: true,
      sessions: { orderBy: { date: 'asc' }, include: { _count: { select: { attendance: true, recordings: true } } } },
      enrollments: {
        include: {
          student: { select: { id: true, name: true, phone: true, studentProfile: { select: { studentCode: true } } } },
          payments: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      assignments: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { submissions: true } } } },
      quizzes: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { questions: true, attempts: true } } } },
    },
  })
  if (!cls) return fail('کلاس یافت نشد', 404)

  if (user.role === 'STUDENT') {
    const enrolled = cls.enrollments.some((e) => e.studentId === user.id)
    if (!enrolled) return fail('دسترسی غیرمجاز', 403)
  }
  if (user.role === 'TEACHER' && cls.teacherId !== user.id) return fail('دسترسی غیرمجاز', 403)

  return ok({ class: cls })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const cls = await db.classGroup.findUnique({ where: { id } })
  if (!cls) return fail('کلاس یافت نشد', 404)

  const isOwnerTeacher = user.role === 'TEACHER' && cls.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.name) data.name = String(b.name)
  if (b.teacherId !== undefined) data.teacherId = b.teacherId || null
  if (b.roomId !== undefined) data.roomId = b.roomId || null
  if (b.capacity !== undefined) data.capacity = Number(b.capacity)
  if (b.startDate) data.startDate = new Date(b.startDate)
  if (b.endDate) data.endDate = new Date(b.endDate)
  if (b.scheduleDays !== undefined) data.scheduleDays = Array.isArray(b.scheduleDays) ? b.scheduleDays.join(',') : b.scheduleDays
  if (b.scheduleTime !== undefined) data.scheduleTime = b.scheduleTime
  if (b.status) data.status = b.status

  const updated = await db.classGroup.update({ where: { id }, data })
  await logAudit(user.id, 'UPDATE', 'ClassGroup', id, `ویرایش کلاس ${updated.name}`)
  return ok({ class: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  const cls = await db.classGroup.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'ClassGroup', id, `حذف کلاس ${cls.name}`)
  return ok({ ok: true })
}
