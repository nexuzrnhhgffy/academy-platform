import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope, logAudit } from '@/lib/api-utils'

// GET /api/classes?teacherId=&studentId=&courseId=&status=&branchId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (user.role === 'TEACHER') where.teacherId = user.id
  else if (user.role === 'STUDENT') {
    if (sp.get('studentId') && sp.get('studentId') !== user.id) return fail('دسترسی غیرمجاز', 403)
    where.enrollments = { some: { studentId: user.id } }
  } else {
    if (sp.get('teacherId')) where.teacherId = sp.get('teacherId')
    const branchId = sp.get('branchId') || branchScope(user)
    if (branchId) where.branchId = branchId
  }
  if (sp.get('courseId')) where.courseId = sp.get('courseId')
  if (sp.get('status')) where.status = sp.get('status')

  const classes = await db.classGroup.findMany({
    where,
    include: {
      course: { select: { id: true, title: true, price: true, coverColor: true, category: true } },
      teacher: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      room: { select: { name: true } },
      _count: { select: { enrollments: true, sessions: true, assignments: true, quizzes: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return ok({ classes })
}

// POST /api/classes
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  if (!b.name || !b.courseId) return fail('نام کلاس و دوره الزامی است')

  const cls = await db.classGroup.create({
    data: {
      name: String(b.name),
      courseId: String(b.courseId),
      teacherId: b.teacherId || null,
      branchId: user.role === 'ADMIN' ? b.branchId || null : user.branchId,
      roomId: b.roomId || null,
      capacity: Number(b.capacity) || 20,
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
      scheduleDays: Array.isArray(b.scheduleDays) ? b.scheduleDays.join(',') : b.scheduleDays || '',
      scheduleTime: b.scheduleTime || '',
      status: b.status || 'PLANNED',
    },
  })

  // auto-generate sessions
  if (b.generateSessions && Number(b.sessionsCount) > 0) {
    const count = Math.min(Number(b.sessionsCount), 60)
    const start = b.startDate ? new Date(b.startDate) : new Date()
    // weekly schedule: create sessions spread over weeks (2 per week default)
    const perWeek = Number(b.perWeek) || 2
    for (let i = 0; i < count; i++) {
      const week = Math.floor(i / perWeek)
      const date = new Date(start)
      date.setDate(date.getDate() + week * 7 + ((i % perWeek) * 2))
      await db.session.create({
        data: {
          classGroupId: cls.id,
          title: `جلسه ${i + 1}`,
          date,
          startTime: b.startTime || '16:00',
          endTime: b.endTime || '18:00',
        },
      })
    }
  }

  await logAudit(user.id, 'CREATE', 'ClassGroup', cls.id, `ایجاد کلاس ${cls.name}`)
  return ok({ class: cls }, 201)
}
