import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PreviewProvider } from './context/PreviewContext'
import ProtectedRoute from './components/ProtectedRoute'

// Eager — entry points that must render immediately
import Login from './pages/Login'
import Signup from './pages/Signup'

// Lazy — everything else; Vite splits these into separate chunks
const Portal        = lazy(() => import('./pages/Portal'))
const Onboarding    = lazy(() => import('./pages/Onboarding'))
const PlanSelector  = lazy(() => import('./pages/PlanSelector'))
const BookingPage   = lazy(() => import('./pages/BookingPage'))
const ManageBooking = lazy(() => import('./pages/ManageBooking'))
const OwnerSelector = lazy(() => import('./pages/OwnerSelector'))
const OwnerAudit    = lazy(() => import('./pages/OwnerAudit'))
const SalesChat     = lazy(() => import('./pages/SalesChat'))

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
      <PreviewProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/portal" element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            } />

            {/* Owner routes — email-gated inside each component */}
            <Route path="/owner/select" element={
              <ProtectedRoute>
                <OwnerSelector />
              </ProtectedRoute>
            } />
            <Route path="/owner/audit" element={
              <ProtectedRoute>
                <OwnerAudit />
              </ProtectedRoute>
            } />

            <Route path="/plans" element={
              <ProtectedRoute>
                <PlanSelector />
              </ProtectedRoute>
            } />

            {/* Public pages — no auth required */}
            <Route path="/book/:tenantId" element={<BookingPage />} />
            <Route path="/manage-booking/:token" element={<ManageBooking />} />
            <Route path="/try-q" element={<SalesChat />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </PreviewProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
