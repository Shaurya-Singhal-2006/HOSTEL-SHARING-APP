import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DesignPage from './pages/DesignPage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/design" element={<DesignPage />} />
            <Route path="/login" element={<ProtectedRoute page="login"><LoginPage /></ProtectedRoute>} />
            <Route path="/join" element={<ProtectedRoute page="join"><JoinPage /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute page="onboarding"><OnboardingPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute page="profile"><ProfilePage /></ProtectedRoute>} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/" element={<ProtectedRoute page="home" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
