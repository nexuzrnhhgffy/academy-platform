import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope, logAudit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  const branchId = sp.get('branchId') || branchScope(user)
  if (branchId) where.branchId = branchId
  if (sp.get('category')) where.category = sp.get('category')

  const expenses = await db.expense.findMany({
    where,
    include: { branch: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 500,
  })
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  return ok({ expenses, total })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const b = await req.json()
  if (!b.title || !b.amount) return fail('عنوان و مبلغ الزامی است')

  const expense = await db.expense.create({
    data: {
      title: String(b.title),
      category: b.category || 'OTHER',
      amount: Number(b.amount),
      branchId: user.role === 'ADMIN' ? b.branchId || null : user.branchId,
      note: b.note || null,
      date: b.date ? new Date(b.date) : new Date(),
      createdById: user.id,
    },
  })
  await logAudit(user.id, 'CREATE', 'Expense', expense.id, `ثبت هزینه ${expense.title}`)
  return ok({ expense }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return fail('دسترسی غیرمجاز', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.expense.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Expense', id, 'حذف هزینه')
  return ok({ ok: true })
}
