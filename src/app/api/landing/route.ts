import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Public landing data
export async function GET() {
  const [students, teachers, courses, branches] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT', isActive: true } }),
    db.user.count({ where: { role: 'TEACHER', isActive: true } }),
    db.course.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, category: true, level: true, price: true, coverColor: true, sessionsCount: true, durationHours: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
    }),
    db.branch.count({ where: { isActive: true } }),
  ])
  return NextResponse.json({ stats: { students, teachers, courses: courses.length, branches }, courses })
}
