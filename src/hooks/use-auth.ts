'use client'

import { useEffect, useState, useCallback } from 'react'
import { useApp, AuthUser } from '@/store/app-store'

export function useAuth() {
  const { user, setUser, authChecked, setAuthChecked, setView, logout } = useApp()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
  }, [setUser, setAuthChecked])

  useEffect(() => {
    if (!authChecked) refresh()
  }, [authChecked, refresh])

  const login = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'خطا در ورود')
    setUser(data.user)
    setView('dashboard')
    return data.user
  }

  const register = async (payload: { name: string; phone?: string; email?: string; password: string; nationalId?: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'خطا در ثبت‌نام')
    setUser(data.user)
    setView('dashboard')
    return data.user
  }

  const doLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
  }

  return { user, authChecked, login, register, logout: doLogout, refresh }
}

export type { AuthUser }
