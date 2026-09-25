import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { ok, fail, requireUser, branchScope, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/users?role=&branchId=&q=&isActive=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const sp = req.nextUrl.searchParams
  const role = sp.get('role') || undefined
  const branchId = sp.get('branchId') || branchScope(user)
  const q = sp.get('q') || undefined
  const isActive = sp.get('isActive')

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (branchId) where.branchId = branchId
  if (isActive !== null && isActive !== '' && isActive !== undefined) where.isActive = isActive === 'true'
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
      { nationalId: { contains: q } },
    ]
  }

  const users = await db.user.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      teacherProfile: true,
      studentProfile: true,
      _count: { select: { taughtClasses: true, enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Remove password hash from output
  const safe = users.map((u) => {
    const { password, ...rest } = u
    return rest
  })
  return ok({ users: safe })
}

// POST /api/users — create user (any role) — admin/manager/staff
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  try {
    const b = await req.json()
    const { name, phone, email, password, role, branchId, nationalId, bio, specialty, education, hourlyRate } = b
    if (!name || !password || !role) return fail('نام، رمز عبور و نقش الزامی است')
    if (role === 'ADMIN' && user.role !== 'ADMIN') return fail('فقط مدیر سیستم می‌تواند مدیر بسازد', 403)

    const dupWhere = phone ? { phone: String(phone) } : email ? { email: String(email).toLowerCase() } : null
    if (dupWhere) {
      const dup = await db.user.findFirst({ where: dupWhere })
      if (dup) return fail('کاربری با این شماره یا ایمیل وجود دارد')
    }

    const effectiveBranch = user.role === 'ADMIN' ? branchId || null : user.branchId

    const data: Record<string, unknown> = {
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : null,
      email: email ? String(email).toLowerCase() : null,
      nationalId: nationalId ? String(nationalId).trim() : null,
      password: hashPassword(String(password)),
      role,
      branchId: effectiveBranch,
      bio: bio || null,
    }
    if (role === 'TEACHER') {
      data.teacherProfile = {
        create: {
          specialty: specialty || '',
          education: education || '',
          hourlyRate: Number(hourlyRate) || 0,
          hireDate: new Date(),
        },
      }
    }
    if (role === 'STUDENT') {
      const count = await db.studentProfile.count()
      data.studentProfile = { create: { studentCode: 'STU-' + String(1000 + count + 1) } }
    }

    const created = await db.user.create({ data, include: { teacherProfile: true, studentProfile: true } })
    await logAudit(user.id, 'CREATE', 'User', created.id, `ایجاد کاربر ${created.name} (${role})`)
    const { password: _p, ...safe } = created
    return ok({ user: safe }, 201)
  } catch (e) {
    console.error('create user error', e)
    return fail('خطا در ایجاد کاربر', 500)
  }
}
