import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PreviewProvider } from './context/PreviewContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Portal from './pages/Portal'
import PlanSelector from './pages/PlanSelector'
import BookingPage from './pages/BookingPage'
import OwnerSelector from './pages/OwnerSelector'
import OwnerAudit from './pages/OwnerAudit'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
      <PreviewProvider>
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

          {/* Public booking page — no auth required */}
          <Route path="/book/:tenantId" element={<BookingPage />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </PreviewProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
