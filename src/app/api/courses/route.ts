import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope, logAudit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams
  const branchId = sp.get('branchId') || branchScope(user)
  const category = sp.get('category') || undefined
  const q = sp.get('q') || undefined

  const where: Record<string, unknown> = {}
  if (branchId) where.OR = [{ branchId }, { branchId: null }]
  if (category) where.category = category
  if (q) where.title = { contains: q }

  const courses = await db.course.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      _count: { select: { classes: true, certificates: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return ok({ courses })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  if (!b.title) return fail('عنوان دوره الزامی است')
  const course = await db.course.create({
    data: {
      title: String(b.title),
      description: b.description || null,
      category: b.category || 'عمومی',
      level: b.level || 'مقدماتی',
      price: Number(b.price) || 0,
      durationHours: Number(b.durationHours) || 0,
      sessionsCount: Number(b.sessionsCount) || 8,
      coverColor: b.coverColor || 'emerald',
      branchId: user.role === 'ADMIN' ? b.branchId || null : user.branchId,
    },
  })
  await logAudit(user.id, 'CREATE', 'Course', course.id, `ایجاد دوره ${course.title}`)
  return ok({ course }, 201)
}
