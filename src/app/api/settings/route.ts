import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES } from '@/lib/api-utils'

const DEFAULTS: Record<string, string> = {
  instituteName: 'آکادمی نخبگان',
  instituteSlogan: 'مسیر رشد شما از اینجا شروع می‌شود',
  phone: '۰۲۱-۱۲۳۴۵۶۷۸',
  address: 'تهران، خیابان ولیعصر، مجتمع آموزشی نخبگان',
  currency: 'تومان',
  workHours: '۸ صبح تا ۹ شب',
}

export async function GET() {
  const rows = await db.setting.findMany()
  const settings: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) settings[r.key] = r.value
  return ok({ settings })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const b = await req.json()
  for (const [key, value] of Object.entries(b)) {
    if (typeof value !== 'string') continue
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
  }
  const rows = await db.setting.findMany()
  const settings: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) settings[r.key] = r.value
  return ok({ settings })
}
