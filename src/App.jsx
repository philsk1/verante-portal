import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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

// Guard for demo routes: requires localStorage demo session
const DemoRoute = ({ children }) => {
  const session = localStorage.getItem('demo_session')
  if (!session) return <Navigate to="/demo/login" replace />
  return children
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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

          {/* Demo routes — no Supabase auth, use localStorage session */}
          <Route path="/demo/login" element={<DemoLogin />} />
          <Route path="/demo/select" element={<DemoRoute><BusinessSelector /></DemoRoute>} />
          <Route path="/demo/tier/:businessId" element={<DemoRoute><TierSelector /></DemoRoute>} />
          <Route path="/demo/portal/:businessId/:tier" element={<DemoRoute><DemoPortal /></DemoRoute>} />
          <Route path="/demo/performance" element={<DemoRoute><SalesPerformance /></DemoRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App