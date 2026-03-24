import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ScreensPage from './pages/ScreensPage'
import ScreenEditPage from './pages/ScreenEditPage'
import TilesPage from './pages/TilesPage'
import TileEditPage from './pages/TileEditPage'
import MediaPage from './pages/MediaPage'
import CategoriesPage from './pages/CategoriesPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="/screens/new" element={<ScreenEditPage />} />
        <Route path="/screens/:id" element={<ScreenEditPage />} />
        <Route path="/tiles" element={<TilesPage />} />
        <Route path="/tiles/new" element={<TileEditPage />} />
        <Route path="/tiles/:id" element={<TileEditPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
