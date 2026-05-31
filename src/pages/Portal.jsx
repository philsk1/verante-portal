import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const Portal = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const tabs = [
    { id: 'profile', label: 'Business Profile' },
    { id: 'ai', label: 'AI Behaviour' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'referrals', label: 'Partners and Referrals' },
    { id: 'account', label: 'Account' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex' }}>
      <div style={{ width: '240px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#6366f1' }}>Verrante</h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{user?.email}</p>
        </div>

        <nav style={{ flex: 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.625rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#eef2ff' : 'transparent',
                color: activeTab === tab.id ? '#6366f1' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '400',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          style={{ padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>

      <div style={{ flex: 1, padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '1rem' }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <p style={{ color: '#94a3b8' }}>This section is coming soon.</p>
        </div>
      </div>
    </div>
  )
}

export default Portal