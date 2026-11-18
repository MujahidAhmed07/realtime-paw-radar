import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/auth'
import { AppProvider } from './store/app'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Layout } from './components/layout/Layout'
import { DashboardLayout, RequireRole } from './components/layout/DashboardLayout'
import { HomePage } from './pages/public/HomePage'
import { LiveMapPage } from './pages/public/LiveMapPage'
import { ReportListPage } from './pages/public/ReportListPage'
import { PetDetailPage } from './pages/public/PetDetailPage'
import { AboutPage, HowItWorksPage } from './pages/public/StaticPages'
import { LoginPage } from './pages/public/LoginPage'
import { RegisterPage } from './pages/public/RegisterPage'
import { ResetRequestPage, ResetConfirmPage } from './pages/public/ResetPasswordPages'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { MyReportsPage, MyPetsPage, ReportLostPage, ReportFoundPage } from './pages/dashboard/MyReportsPage'
import { NearbyAlertsPage } from './pages/dashboard/NearbyAlertsPage'
import { NotificationsPage } from './pages/dashboard/NotificationsPage'
import { MessagesPage, SavedReportsPage } from './pages/dashboard/MessagesPage'
import { ProfileSettingsPage } from './pages/dashboard/ProfileSettingsPage'
import { AdminOverviewPage, AdminUsersPage, AdminReportsPage, AdminModerationPage, AdminSuspiciousPage, AdminAnalyticsPage } from './pages/admin/AdminPages'

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH.replace(/\/$/, '') : undefined}>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/map" element={<LiveMapPage />} />
                <Route path="/missing" element={<ReportListPage kind="missing" />} />
                <Route path="/found" element={<ReportListPage kind="found" />} />
                <Route path="/pet/:id" element={<PetDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-request" element={<ResetRequestPage />} />
                <Route path="/reset-confirm" element={<ResetConfirmPage />} />

                <Route element={<RequireRole><DashboardLayout /></RequireRole>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/report-lost" element={<ReportLostPage />} />
                  <Route path="/dashboard/report-found" element={<ReportFoundPage />} />
                  <Route path="/dashboard/my-pets" element={<MyPetsPage />} />
                  <Route path="/dashboard/my-reports" element={<MyReportsPage />} />
                  <Route path="/dashboard/nearby" element={<NearbyAlertsPage />} />
                  <Route path="/dashboard/notifications" element={<NotificationsPage />} />
                  <Route path="/dashboard/messages" element={<MessagesPage />} />
                  <Route path="/dashboard/saved" element={<SavedReportsPage />} />
                  <Route path="/dashboard/profile" element={<ProfileSettingsPage />} />
                </Route>

                <Route element={<RequireRole admin><DashboardLayout admin /></RequireRole>}>
                  <Route path="/admin" element={<AdminOverviewPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/reports" element={<AdminReportsPage />} />
                  <Route path="/admin/moderation" element={<AdminModerationPage />} />
                  <Route path="/admin/suspicious" element={<AdminSuspiciousPage />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                </Route>

                <Route path="*" element={
                  <div className="container-page py-24 text-center">
                    <h1 className="text-4xl font-bold">404</h1>
                    <p className="mt-2 text-muted-foreground">Page not found.</p>
                  </div>
                } />
              </Route>
            </Routes>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
      </ErrorBoundary>
  )
}
