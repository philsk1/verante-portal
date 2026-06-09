import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PreviewProvider } from './context/PreviewContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Portal from './pages/Portal'
import DemoLogin from './pages/DemoLogin'
import BusinessSelector from './pages/BusinessSelector'
import TierSelector from './pages/TierSelector'
import DemoPortal from './pages/DemoPortal'
import SalesPerformance from './pages/SalesPerformance'
import PlanSelector from './pages/PlanSelector'
import BookingPage from './pages/BookingPage'
import OwnerSelector from './pages/OwnerSelector'

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

          {/* Demo routes — localStorage session, no Supabase auth */}
          <Route path="/demo/login" element={<DemoLogin />} />
          <Route path="/demo"       element={<DemoLogin />} />
          <Route path="/demo/select" element={<BusinessSelector />} />
          <Route path="/demo/tier/:businessId" element={<TierSelector />} />
          <Route path="/demo/portal/:businessId/:tier" element={<DemoPortal />} />
          <Route path="/demo/performance" element={<SalesPerformance />} />

          {/* Owner tenant selector — protected, email-checked inside the component */}
          <Route path="/owner/select" element={
            <ProtectedRoute>
              <OwnerSelector />
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
