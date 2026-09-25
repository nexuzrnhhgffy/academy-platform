import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

// GET /api/sessions/:id — detail with attendance & recordings
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const session = await db.session.findUnique({
    where: { id },
    include: {
      classGroup: {
        include: {
          course: { select: { title: true, coverColor: true } },
          teacher: { select: { id: true, name: true } },
          enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true, name: true } } } },
        },
      },
      attendance: { include: { student: { select: { name: true } } } },
      recordings: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!session) return fail('جلسه یافت نشد', 404)

  if (user.role === 'STUDENT') {
    const enrolled = session.classGroup.enrollments.some((e) => e.studentId === user.id)
    if (!enrolled) return fail('دسترسی غیرمجاز', 403)
  }
  return ok({ session })
}

// PATCH /api/sessions/:id — update status/topic/times; notify on LIVE
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const session = await db.session.findUnique({ where: { id }, include: { classGroup: true } })
  if (!session) return fail('جلسه یافت نشد', 404)

  const isOwnerTeacher = user.role === 'TEACHER' && session.classGroup.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.title) data.title = String(b.title)
  if (b.date) data.date = new Date(b.date)
  if (b.startTime) data.startTime = b.startTime
  if (b.endTime) data.endTime = b.endTime
  if (b.topic !== undefined) data.topic = b.topic
  if (b.status) data.status = b.status

  const updated = await db.session.update({ where: { id }, data })

  if (b.status === 'LIVE') {
    const enrolled = await db.enrollment.findMany({ where: { classGroupId: session.classGroupId, status: 'ACTIVE' } })
    for (const e of enrolled) {
      await notify(e.studentId, 'کلاس لایو شروع شد', `جلسه «${updated.title}» کلاس ${session.classGroup.name} هم‌اکنون به صورت لایو در حال برگزاری است`, 'LIVE')
    }
  }
  await logAudit(user.id, 'UPDATE', 'Session', id, `وضعیت جلسه: ${b.status || 'ویرایش'}`)
  return ok({ session: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const session = await db.session.findUnique({ where: { id }, include: { classGroup: true } })
  if (!session) return fail('جلسه یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && session.classGroup.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  await db.session.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Session', id, 'حذف جلسه')
  return ok({ ok: true })
}
