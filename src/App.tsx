import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

import LoginPage from "@/pages/LoginPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AttendanceOfficerDashboard from "@/pages/AttendanceOfficerDashboard";
import FellowshipLeaderDashboard from "@/pages/FellowshipLeaderDashboard";
import InventoryOfficerDashboard from "@/pages/InventoryOfficerDashboard";
import ViewerDashboard from "@/pages/ViewerDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/settings"
            element={
              <ProtectedRoute anyRole>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-officer"
            element={
              <ProtectedRoute requiredRole="AttendanceOfficer">
                <AttendanceOfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fellowship-leader"
            element={
              <ProtectedRoute requiredRole="FellowshipLeader">
                <FellowshipLeaderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory-officer"
            element={
              <ProtectedRoute requiredRole="InventoryOfficer">
                <InventoryOfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewer"
            element={
              <ProtectedRoute requiredRole="Viewer">
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
