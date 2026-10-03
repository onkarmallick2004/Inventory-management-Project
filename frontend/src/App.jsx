// All routes of the app, grouped by who may see them.
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import { homeFor, useAuth } from './auth/AuthContext';
import AppLayout from './layouts/AppLayout';
import { Loader } from './components/ui';

import Login from './pages/Login';
import QrLanding from './pages/public/QrLanding';
import ProductSelector from './pages/public/ProductSelector';

import Dashboard from './pages/admin/Dashboard';
import Machines from './pages/admin/Machines';
import Parts from './pages/admin/Parts';
import Jobs from './pages/admin/Jobs';
import Requests from './pages/admin/Requests';
import Customers from './pages/admin/Customers';
import MachineDetail from './pages/MachineDetail';

import MyJobs from './pages/technician/MyJobs';
import JobDetail from './pages/technician/JobDetail';

import MyMachines from './pages/customer/MyMachines';
import MyRequests from './pages/customer/MyRequests';

function Home() {
  const { user, checking } = useAuth();
  if (checking) return <Loader full />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public pages: can be linked from the marketing website */}
      <Route path="/login" element={<Login />} />
      <Route path="/m/:token" element={<QrLanding />} />
      <Route path="/selector" element={<ProductSelector />} />

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/machines" element={<Machines />} />
          <Route path="/admin/machines/:id" element={<MachineDetail />} />
          <Route path="/admin/parts" element={<Parts />} />
          <Route path="/admin/jobs" element={<Jobs />} />
          <Route path="/admin/requests" element={<Requests />} />
          <Route path="/admin/customers" element={<Customers />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['TECHNICIAN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/tech" element={<MyJobs />} />
          <Route path="/tech/jobs/:id" element={<JobDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/portal" element={<MyMachines />} />
          <Route path="/portal/machines/:id" element={<MachineDetail />} />
          <Route path="/portal/requests" element={<MyRequests />} />
        </Route>
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
