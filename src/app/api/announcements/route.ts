import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)

  const audienceFor: Record<string, string[]> = {
    STUDENT: ['ALL', 'STUDENTS'],
    TEACHER: ['ALL', 'TEACHERS'],
    STAFF: ['ALL', 'STAFF'],
    MANAGER: ['ALL', 'STAFF', 'TEACHERS', 'STUDENTS'],
    ADMIN: ['ALL', 'STAFF', 'TEACHERS', 'STUDENTS'],
  }
  const allowed = audienceFor[user.role] || ['ALL']

  const announcements = await db.announcement.findMany({
    where: { audience: { in: allowed } },
    include: { createdBy: { select: { name: true } }, branch: { select: { name: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
  return ok({ announcements })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  if (!b.title || !b.content) return fail('عنوان و متن الزامی است')

  const ann = await db.announcement.create({
    data: {
      title: String(b.title),
      content: String(b.content),
      audience: b.audience || 'ALL',
      isPinned: Boolean(b.isPinned),
      createdById: user.id,
    },
  })

  // push notification to target audience
  const roleFilter =
    b.audience === 'STUDENTS' ? { role: 'STUDENT' } :
    b.audience === 'TEACHERS' ? { role: 'TEACHER' } :
    b.audience === 'STAFF' ? { role: { in: ['STAFF', 'MANAGER'] } } : {}
  const targets = await db.user.findMany({ where: { isActive: true, ...roleFilter }, select: { id: true } })
  for (const t of targets) {
    await notify(t.id, 'اطلاعیه جدید', ann.title, 'ANNOUNCEMENT')
  }
  await logAudit(user.id, 'CREATE', 'Announcement', ann.id, `اطلاعیه ${ann.title}`)
  return ok({ announcement: ann }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.announcement.delete({ where: { id } })
  return ok({ ok: true })
}
