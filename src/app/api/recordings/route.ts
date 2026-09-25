import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/recordings?sessionId= | classGroupId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams
  const where: Record<string, unknown> = {}
  if (sp.get('sessionId')) where.sessionId = sp.get('sessionId')
  if (sp.get('classGroupId')) where.session = { classGroupId: sp.get('classGroupId') }
  if (user.role === 'STUDENT') {
    where.session = { classGroup: { enrollments: { some: { studentId: user.id } } } }
  }
  const recordings = await db.recording.findMany({
    where,
    include: { session: { select: { title: true, date: true, classGroup: { select: { name: true, course: { select: { title: true } } } } } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok({ recordings })
}

// POST /api/recordings
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.sessionId || !b.title) return fail('عنوان و جلسه الزامی است')

  const session = await db.session.findUnique({ where: { id: String(b.sessionId) }, include: { classGroup: true } })
  if (!session) return fail('جلسه یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && session.classGroup.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const rec = await db.recording.create({
    data: {
      sessionId: String(b.sessionId),
      title: String(b.title),
      url: b.url || null,
      durationMin: Number(b.durationMin) || 0,
    },
  })
  await logAudit(user.id, 'CREATE', 'Recording', rec.id, `ثبت ضبط جلسه ${session.title}`)
  return ok({ recording: rec }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.recording.delete({ where: { id } })
  return ok({ ok: true })
}
