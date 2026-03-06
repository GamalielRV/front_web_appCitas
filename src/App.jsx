import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import BranchesPage from './pages/BranchesPage'
import CategoriesPage from './pages/CategoriesPage'
import DashboardPage from './pages/DashboardPage'
import LegalContentPage from './pages/LegalContentPage'
import LoginPage from './pages/LoginPage'
import OwnersPage from './pages/OwnersPage'
import PrivacyContentPage from './pages/PrivacyContentPage'
import PrivacyPage from './pages/PrivacyPage'
import SupportPage from './pages/SupportPage'
import TermsPage from './pages/TermsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/terminos-y-condiciones" element={<TermsPage />} />
      <Route path="/politica-de-privacidad" element={<PrivacyPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="sucursales" element={<BranchesPage />} />
        <Route path="owners" element={<OwnersPage />} />
        <Route path="contenido-legal" element={<LegalContentPage />} />
        <Route path="contenido-privacidad" element={<PrivacyContentPage />} />
        <Route path="soporte" element={<Navigate to="/soporte/mensajes" replace />} />
        <Route path="soporte/:tab" element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
