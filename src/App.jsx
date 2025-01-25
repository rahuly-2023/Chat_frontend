import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const token = localStorage.getItem('token')
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chat" replace /> : <Login />}/>
        <Route path="/register" element={token ? <Navigate to="/chat" replace /> : <Register />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App