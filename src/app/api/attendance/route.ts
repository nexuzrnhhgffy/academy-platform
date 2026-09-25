import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES } from '@/lib/api-utils'

// GET /api/attendance?sessionId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return fail('شناسه جلسه الزامی است')

  const attendance = await db.attendance.findMany({
    where: { sessionId },
    include: { student: { select: { id: true, name: true } } },
  })
  return ok({ attendance })
}

// POST /api/attendance — bulk upsert { sessionId, records: [{studentId, status, note}] }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.sessionId || !Array.isArray(b.records)) return fail('داده نامعتبر است')

  const session = await db.session.findUnique({ where: { id: String(b.sessionId) }, include: { classGroup: true } })
  if (!session) return fail('جلسه یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && session.classGroup.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  for (const r of b.records) {
    await db.attendance.upsert({
      where: { sessionId_studentId: { sessionId: String(b.sessionId), studentId: r.studentId } },
      create: { sessionId: String(b.sessionId), studentId: r.studentId, status: r.status || 'PRESENT', note: r.note || null },
      update: { status: r.status || 'PRESENT', note: r.note || null },
    })
  }
  const attendance = await db.attendance.findMany({ where: { sessionId: String(b.sessionId) } })
  return ok({ attendance })
}
