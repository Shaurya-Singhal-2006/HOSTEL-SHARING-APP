import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { CommunityProvider } from './auth/CommunityProvider'
import ProtectedRoute from './components/ProtectedRoute'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DesignPage from './pages/DesignPage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import ItemFormPage from './pages/ItemFormPage'
import MyItemsPage from './pages/MyItemsPage'
import WantedPage from './pages/WantedPage'
import AppShell from './components/AppShell'
import RequestsPage from './pages/RequestsPage'
import TourPage from './pages/TourPage'
import HelpPage from './pages/HelpPage'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CommunityProvider><Routes>
            <Route path="/design" element={<DesignPage />} />
            <Route path="/login" element={<ProtectedRoute page="login"><LoginPage /></ProtectedRoute>} />
            <Route path="/start" element={<ProtectedRoute page="start"><JoinPage /></ProtectedRoute>} />
            <Route path="/join" element={<ProtectedRoute page="join"><JoinPage /></ProtectedRoute>} />
            <Route path="/join/:code" element={<ProtectedRoute page="join"><JoinPage /></ProtectedRoute>} />
            <Route path="/waiting" element={<ProtectedRoute page="waiting"><JoinPage /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute page="onboarding"><OnboardingPage /></ProtectedRoute>} />
            <Route path="/tour" element={<ProtectedRoute page="app"><TourPage /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute page="app"><AppShell><HelpPage /></AppShell></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute page="profile"><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/" element={<ProtectedRoute page="app"><AppShell><HomePage /></AppShell></ProtectedRoute>} />
            <Route path="/wanted" element={<ProtectedRoute page="app"><AppShell><WantedPage /></AppShell></ProtectedRoute>} />
            <Route path="/wanted/:id" element={<ProtectedRoute page="app"><AppShell><WantedPage /></AppShell></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute page="app"><AppShell><RequestsPage /></AppShell></ProtectedRoute>} />
            <Route path="/my-items" element={<ProtectedRoute page="app"><AppShell><MyItemsPage /></AppShell></ProtectedRoute>} />
            <Route path="/items/new" element={<ProtectedRoute page="app"><AppShell><ItemFormPage /></AppShell></ProtectedRoute>} />
            <Route path="/items/:id/edit" element={<ProtectedRoute page="app"><AppShell><ItemFormPage /></AppShell></ProtectedRoute>} />
            <Route path="/items/:id" element={<ProtectedRoute page="app"><AppShell><ItemDetailPage /></AppShell></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></CommunityProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
