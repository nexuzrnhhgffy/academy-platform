'use client'

import { useApp } from '@/store/app-store'
import { useAuth } from '@/hooks/use-auth'
import LandingPage from '@/components/landing/landing-page'
import AuthView from '@/components/auth/auth-view'
import DashboardShell from '@/components/shell/dashboard-shell'
import AdminOverview from '@/components/admin/overview'
import UsersView from '@/components/admin/users-view'
import StructureView from '@/components/admin/structure-view'
import ClassesView from '@/components/admin/classes-view'
import FinanceView from '@/components/admin/finance-view'
import EnrollmentsView from '@/components/admin/enrollments-view'
import CommsView from '@/components/admin/comms-view'
import SettingsView from '@/components/admin/settings-view'
import TeacherView from '@/components/teacher/teacher-view'
import StudentView from '@/components/student/student-view'
import LiveClassroom from '@/components/live/live-classroom'
import LiveHub from '@/components/live/live-hub'
import { Loader2 } from 'lucide-react'

function DashboardRouter() {
  const { user, activeMenu } = useApp()
  const role = user?.role

  if (!role) return null

  // Shared: live hub
  if (activeMenu === 'live') return <LiveHub />
  // Shared: comms (announcements + tickets)
  if (activeMenu === 'comms') return <CommsView />

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF') {
    switch (activeMenu) {
      case 'overview': return <AdminOverview />
      case 'users': return <UsersView />
      case 'structure': return <StructureView />
      case 'classes': return <ClassesView />
      case 'enrollments': return <EnrollmentsView />
      case 'finance': return <FinanceView />
      case 'settings': return <SettingsView />
      default: return <AdminOverview />
    }
  }

  if (role === 'TEACHER') {
    return <TeacherView view={activeMenu} />
  }

  if (role === 'STUDENT') {
    return <StudentView view={activeMenu} />
  }

  return <AdminOverview />
}

export default function Home() {
  const { view, setView, user, authChecked, liveSessionId } = useApp()
  const { refresh } = useAuth()

  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری سامانه...</p>
        </div>
      </div>
    )
  }

  const effectiveView = view === 'landing' && user ? 'landing' : view === 'auth' ? 'auth' : user ? 'dashboard' : 'landing'

  return (
    <>
      {effectiveView === 'dashboard' && user ? (
        <DashboardShell>
          <DashboardRouter />
        </DashboardShell>
      ) : effectiveView === 'auth' ? (
        <AuthView onBack={() => setView('landing')} />
      ) : (
        <LandingPage
          onEnter={() => {
            refresh()
            setView(user ? 'dashboard' : 'auth')
          }}
        />
      )}
      {liveSessionId && <LiveClassroom />}
    </>
  )
}
