import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/api-utils'

// GET /api/certificates/verify?code=AC-XXXX — public verification
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return ok({ valid: false })
  const cert = await db.certificate.findUnique({
    where: { code },
    include: {
      student: { select: { name: true } },
      course: { select: { title: true } },
    },
  })
  if (!cert) return ok({ valid: false })
  return ok({
    valid: true,
    certificate: {
      code: cert.code,
      studentName: cert.student.name,
      courseTitle: cert.course?.title || '—',
      grade: cert.grade,
      issuedAt: cert.issuedAt,
    },
  })
}
