import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/users/:id — full profile
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  if (user.role === 'STUDENT' && user.id !== id) return fail('دسترسی غیرمجاز', 403)

  const target = await db.user.findUnique({
    where: { id },
    include: {
      branch: true,
      teacherProfile: true,
      studentProfile: true,
      taughtClasses: { include: { course: { select: { title: true } } } },
      enrollments: { include: { classGroup: { include: { course: { select: { title: true } } } } } },
      payments: { orderBy: { paidAt: 'desc' }, take: 20 },
      salaries: { orderBy: { month: 'desc' } },
    },
  })
  if (!target) return fail('کاربر یافت نشد', 404)
  const { password, ...safe } = target
  return ok({ user: safe })
}

// PATCH /api/users/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const isSelf = user.id === id
  if (!STAFF_ROLES.includes(user.role) && !isSelf) return fail('دسترسی غیرمجاز', 403)

  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    const allowedSelf = ['name', 'bio', 'avatar']
    const allowedStaff = ['name', 'phone', 'email', 'nationalId', 'bio', 'avatar', 'branchId', 'role', 'isActive']

    for (const k of allowedStaff) {
      if (b[k] !== undefined && (STAFF_ROLES.includes(user.role) || allowedSelf.includes(k))) {
        if (k === 'role' && user.role !== 'ADMIN') continue
        if (k === 'role' && b[k] === 'ADMIN' && user.role !== 'ADMIN') continue
        data[k] = b[k]
      }
    }
    if (b.password) data.password = hashPassword(String(b.password))

    // profile sub-fields
    if (b.hourlyRate !== undefined || b.specialty !== undefined || b.education !== undefined) {
      const tp = await db.teacherProfile.findUnique({ where: { userId: id } })
      const tpData = {
        hourlyRate: b.hourlyRate !== undefined ? Number(b.hourlyRate) : undefined,
        specialty: b.specialty,
        education: b.education,
      }
      if (tp) await db.teacherProfile.update({ where: { userId: id }, data: tpData })
      else await db.teacherProfile.create({ data: { userId: id, ...tpData, hourlyRate: tpData.hourlyRate ?? 0 } })
    }
    if (b.educationLevel !== undefined || b.address !== undefined || b.guardianName !== undefined || b.guardianPhone !== undefined || b.birthDate !== undefined) {
      const spData: Record<string, unknown> = {}
      if (b.educationLevel !== undefined) spData.educationLevel = b.educationLevel
      if (b.address !== undefined) spData.address = b.address
      if (b.guardianName !== undefined) spData.guardianName = b.guardianName
      if (b.guardianPhone !== undefined) spData.guardianPhone = b.guardianPhone
      if (b.birthDate) spData.birthDate = new Date(b.birthDate)
      const sp = await db.studentProfile.findUnique({ where: { userId: id } })
      if (sp) await db.studentProfile.update({ where: { userId: id }, data: spData })
    }

    const updated = await db.user.update({ where: { id }, data, include: { teacherProfile: true, studentProfile: true } })
    await logAudit(user.id, 'UPDATE', 'User', id, `ویرایش کاربر ${updated.name}`)
    const { password: _p, ...safe } = updated
    return ok({ user: safe })
  } catch (e) {
    console.error('update user error', e)
    return fail('خطا در ویرایش کاربر', 500)
  }
}

// DELETE /api/users/:id — soft deactivate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  if (id === user.id) return fail('نمی‌توانید حساب خودتان را غیرفعال کنید')

  const target = await db.user.update({ where: { id }, data: { isActive: false } })
  await logAudit(user.id, 'DEACTIVATE', 'User', id, `غیرفعال‌سازی ${target.name}`)
  return ok({ ok: true })
}
