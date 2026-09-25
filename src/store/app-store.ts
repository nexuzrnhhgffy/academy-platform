'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role: 'ADMIN' | 'MANAGER' | 'TEACHER' | 'STUDENT' | 'STAFF'
  avatar?: string | null
  bio?: string | null
  branchId?: string | null
  branchName?: string | null
  teacherProfile?: { specialty: string; hourlyRate: number; rating: number } | null
  studentProfile?: { studentCode: string } | null
}

export type AppView =
  | 'landing'
  | 'auth'
  | 'dashboard'

interface AppState {
  view: AppView
  user: AuthUser | null
  authChecked: boolean
  activeMenu: string
  liveSessionId: string | null
  branchFilter: string | null
  setView: (v: AppView) => void
  setUser: (u: AuthUser | null) => void
  setAuthChecked: (b: boolean) => void
  setActiveMenu: (m: string) => void
  openLive: (sessionId: string) => void
  closeLive: () => void
  setBranchFilter: (b: string | null) => void
  logout: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      view: 'landing',
      user: null,
      authChecked: false,
      activeMenu: 'overview',
      liveSessionId: null,
      branchFilter: null,
      setView: (view) => set({ view }),
      setUser: (user) => set({ user }),
      setAuthChecked: (authChecked) => set({ authChecked }),
      setActiveMenu: (activeMenu) => set({ activeMenu }),
      openLive: (liveSessionId) => set({ liveSessionId }),
      closeLive: () => set({ liveSessionId: null }),
      setBranchFilter: (branchFilter) => set({ branchFilter }),
      logout: () => set({ user: null, view: 'landing', activeMenu: 'overview', liveSessionId: null }),
    }),
    {
      name: 'academy-ui',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ view: s.view, activeMenu: s.activeMenu }),
    }
  )
)

export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'خطای غیرمنتظره رخ داد')
  }
  return data as T
}
