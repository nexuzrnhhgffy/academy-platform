import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

const SECRET = process.env.AUTH_SECRET || 'academy-platform-secret-key-2024'
export const TOKEN_NAME = 'academy_token'
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface TokenPayload {
  uid: string
  role: string
  branchId?: string | null
  exp: number
}

// ---------- Password hashing (scrypt, no external deps) ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const test = crypto.scryptSync(password, salt, 64)
    const hashBuf = Buffer.from(hash, 'hex')
    return hashBuf.length === test.length && crypto.timingSafeEqual(hashBuf, test)
  } catch {
    return false
  }
}

// ---------- HMAC-signed token ----------
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signToken(payload: TokenPayload): string {
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token?: string | null): TokenPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function setAuthCookie(res: NextResponse, uid: string, role: string, branchId?: string | null) {
  const token = signToken({ uid, role, branchId, exp: Date.now() + TOKEN_TTL })
  res.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL / 1000,
  })
  return res
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(TOKEN_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}

// ---------- Session helpers (call inside route handlers) ----------
export async function getSessionUser(req: NextRequest) {
  const payload = verifyToken(req.cookies.get(TOKEN_NAME)?.value)
  if (!payload) return null
  const user = await db.user.findUnique({
    where: { id: payload.uid },
    include: { teacherProfile: true, studentProfile: true, branch: true },
  })
  if (!user || !user.isActive) return null
  return user
}

export function publicUser(u: {
  id: string; name: string; email?: string | null; phone?: string | null
  role: string; avatar?: string | null; bio?: string | null
  branchId?: string | null; branch?: { id: string; name: string } | null
  teacherProfile?: unknown; studentProfile?: unknown
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: u.avatar,
    bio: u.bio,
    branchId: u.branchId,
    branchName: u.branch?.name || null,
    teacherProfile: u.teacherProfile,
    studentProfile: u.studentProfile,
  }
}
