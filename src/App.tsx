import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import ManagerLayout from './layouts/ManagerLayout'
import AdminLayout from './layouts/AdminLayout'
import Home from './pages/manager/Home'
import MilkEntry from './pages/manager/MilkEntry'
import CustomersPage from './pages/manager/CustomersPage'
import ExpensesPage from './pages/manager/ExpensesPage'
import HealthPage from './pages/manager/HealthPage'
import AnimalsList from './pages/manager/AnimalsList'
import AnimalProfile from './pages/AnimalProfile'
import Dashboard from './pages/admin/Dashboard'
import AdminAnimals from './pages/admin/AdminAnimals'
import AdminMilk from './pages/admin/AdminMilk'
import AdminSales from './pages/admin/AdminSales'
import AdminExpenses from './pages/admin/AdminExpenses'
import AdminHealth from './pages/admin/AdminHealth'
import AdminLabour from './pages/admin/AdminLabour'
import LabourPage from './pages/manager/LabourPage'
import AdminCash from './pages/admin/AdminCash'
import CashPage from './pages/manager/CashPage'
import Reports from './pages/admin/Reports'
import SettingsPage from './pages/admin/SettingsPage'
import AuditLog from './pages/admin/AuditLog'
import PlatformPage from './pages/platform/PlatformPage'
import About from './pages/legal/About'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import Terms from './pages/legal/Terms'
import DeleteAccount from './pages/legal/DeleteAccount'
import Support from './pages/legal/Support'

function Guard({ admin, children }: { admin?: boolean; children: JSX.Element }) {
  const { session, profile, isAdmin, loading } = useAuth()
  if (loading) return <div className="p-10 text-center text-gray-500">…</div>
  if (!session || !profile || !profile.active) return <Navigate to="/login" replace />
  if (admin && !isAdmin) return <Navigate to="/m" replace />
  return children
}

function Root() {
  const { session, profile, isAdmin, loading } = useAuth()
  if (loading) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/m'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/platform" element={<Guard><PlatformPage /></Guard>} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      <Route path="/support" element={<Support />} />
      <Route path="/m" element={<Guard><ManagerLayout /></Guard>}>
        <Route index element={<Home />} />
        <Route path="milk" element={<MilkEntry />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="labour" element={<LabourPage />} />
        <Route path="cash" element={<CashPage />} />
        <Route path="animals" element={<AnimalsList />} />
        <Route path="animals/:id" element={<AnimalProfile />} />
      </Route>
      <Route path="/admin" element={<Guard admin><AdminLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="animals" element={<AdminAnimals />} />
        <Route path="animals/:id" element={<AnimalProfile />} />
        <Route path="milk" element={<AdminMilk />} />
        <Route path="sales" element={<AdminSales />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="health" element={<AdminHealth />} />
        <Route path="labour" element={<AdminLabour />} />
        <Route path="cash" element={<AdminCash />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
