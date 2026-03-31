import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ScreensPage from './pages/ScreensPage'
import ScreenEditPage from './pages/ScreenEditPage'
import ScreenOverviewPage from './pages/ScreenOverviewPage'
import TilesPage from './pages/TilesPage'
import TileEditPage from './pages/TileEditPage'
import MediaPage from './pages/MediaPage'
import CategoriesPage from './pages/CategoriesPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<ScreensPage />} />
        <Route path="/screens" element={<Navigate to="/" replace />} />
        <Route path="/screens/new" element={<ScreenEditPage />} />
        <Route path="/screens/:id" element={<ScreenEditPage />} />
        <Route path="/screens/:id/overview" element={<ScreenOverviewPage />} />
        <Route path="/tiles" element={<TilesPage />} />
        <Route path="/tiles/new" element={<TileEditPage />} />
        <Route path="/tiles/:id" element={<TileEditPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        {user?.role === 'Admin' && (
          <Route path="/users" element={<UsersPage />} />
        )}
        {user?.role === 'Admin' && (
          <Route path="/settings" element={<SettingsPage />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
