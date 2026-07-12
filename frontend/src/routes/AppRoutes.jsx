import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Organization from '../pages/Organization';
import Assets from '../pages/Assets';
import Allocation from '../pages/Allocation';
import Booking from '../pages/Booking';
import Maintenance from '../pages/Maintenance';
import Audit from '../pages/Audit';
import Reports from '../pages/Reports';
import Notifications from '../pages/Notifications';

// IMPORTANT — merge-conflict avoidance rule:
// This file's structure is final as of shell setup. Every screen already
// has a route below. Page owners should NOT need to edit this file again —
// just build out the corresponding file in src/pages/. If a genuinely new
// route is required, coordinate before editing this file.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/organization" element={<Organization />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/allocation" element={<Allocation />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}