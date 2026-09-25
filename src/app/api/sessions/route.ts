import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/sessions?classGroupId=&status=&from=&to=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (sp.get('classGroupId')) where.classGroupId = sp.get('classGroupId')
  if (sp.get('status')) where.status = sp.get('status')
  if (sp.get('from') || sp.get('to')) {
    where.date = {}
    if (sp.get('from')) (where.date as Record<string, unknown>).gte = new Date(sp.get('from')!)
    if (sp.get('to')) (where.date as Record<string, unknown>).lte = new Date(sp.get('to')!)
  }

  // scoping
  if (user.role === 'TEACHER') where.classGroup = { teacherId: user.id }
  if (user.role === 'STUDENT') where.classGroup = { enrollments: { some: { studentId: user.id, status: 'ACTIVE' } } }

  const sessions = await db.session.findMany({
    where,
    include: {
      classGroup: {
        select: { id: true, name: true, courseId: true, course: { select: { title: true, coverColor: true } }, teacher: { select: { name: true } } },
      },
      _count: { select: { attendance: true, recordings: true } },
    },
    orderBy: { date: 'asc' },
    take: 300,
  })
  return ok({ sessions })
}

// POST /api/sessions — create one or many sessions
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.classGroupId || !b.title) return fail('کلاس و عنوان جلسه الزامی است')

  const cls = await db.classGroup.findUnique({ where: { id: String(b.classGroupId) } })
  if (!cls) return fail('کلاس یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && cls.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const items = Array.isArray(b.items) ? b.items : [b]
  const created = []
  for (const item of items) {
    const s = await db.session.create({
      data: {
        classGroupId: String(b.classGroupId),
        title: String(item.title || 'جلسه جدید'),
        date: item.date ? new Date(item.date) : new Date(),
        startTime: item.startTime || '16:00',
        endTime: item.endTime || '18:00',
        topic: item.topic || null,
      },
    })
    created.push(s)
  }
  await logAudit(user.id, 'CREATE', 'Session', created[0]?.id, `ایجاد ${created.length} جلسه برای ${cls.name}`)
  return ok({ sessions: created }, 201)
}
