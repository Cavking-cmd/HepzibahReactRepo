import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AttendanceOfficerDashboard from "@/pages/AttendanceOfficerDashboard";
import FellowshipLeaderDashboard from "@/pages/FellowshipLeaderDashboard";
import InventoryOfficerDashboard from "@/pages/InventoryOfficerDashboard";
import MemberDashboard from "@/pages/MemberDashboard";
import AccountsOfficerDashboard from "@/pages/AccountsOfficerDashboard";
import SignUpPage from "@/pages/SignUpPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

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
            path="/member"
            element={
              <ProtectedRoute requiredRole="ChurchMember">
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts-officer"
            element={
              <ProtectedRoute requiredRole="AccountsOfficer">
                <AccountsOfficerDashboard />
              </ProtectedRoute>
            }
          />
          {/* The Pastor login role is retired; old links go back to sign-in. */}
          <Route path="/pastor" element={<Navigate to="/login" replace />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
