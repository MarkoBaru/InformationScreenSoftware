import { Routes, Route } from 'react-router-dom'
import HomeScreen from './pages/HomeScreen'
import ContentScreen from './pages/ContentScreen'

function App() {
  return (
    <Routes>
      <Route path="/:slug" element={<HomeScreen />} />
      <Route path="/:slug/view" element={<ContentScreen />} />
      <Route path="*" element={<HomeScreen />} />
    </Routes>
  )
}

export default App
