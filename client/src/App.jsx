import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EmberBackground from './components/EmberBackground'
import Home from './pages/Home'
import Room from './pages/Room'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <BrowserRouter>
      <EmberBackground />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
