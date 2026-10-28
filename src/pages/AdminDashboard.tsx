import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { AttendanceSection } from "@/components/sections/AttendanceSection";
import { FellowshipCentersSection } from "@/components/sections/FellowshipCentersSection";
import { FellowshipAttendanceSection } from "@/components/sections/FellowshipAttendanceSection";
import { InventorySection } from "@/components/sections/InventorySection";
import { UsersSection } from "@/components/sections/UsersSection";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { ReportsSection } from "@/components/sections/reports/ReportsSection";
import { AccountsApprovalDashboard } from "@/components/sections/AccountsApprovalDashboard";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { FinancialReports } from "@/components/sections/reports/FinancialReports";
import { PastorsSection } from "@/components/sections/pastors/PastorsSection";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Home,
  ClipboardList,
  Package,
  UserPlus,
  BarChart3,
  Wallet,
  ClipboardCheck,
  Building2,
  LineChart,
  UserRound,
} from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "services", label: "Services", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: Users },
  { id: "pastors", label: "Pastors", icon: UserRound },
  { id: "centers", label: "Fellowship Centers", icon: Home },
  { id: "fellowship-attendance", label: "Fellowship Attendance", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "users", label: "Users & Roles", icon: UserPlus },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function AdminDashboard() {
  const { hasRole } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const canManageAccounts = hasRole("AccountsAdmin");

  // Accounts Payable belongs to the AccountsAdmin role only; plain Admin does not see it.
  const sections = canManageAccounts
    ? [
        ...SECTIONS,
        { id: "final-approval", label: "Final Approval & Payment", icon: ClipboardCheck },
        { id: "accounts", label: "All Reimbursements", icon: Wallet },
        { id: "departments", label: "Departments & Budgets", icon: Building2 },
        { id: "finance", label: "Financial Reports", icon: LineChart },
      ]
    : SECTIONS;

  return (
    <DashboardLayout
      title={canManageAccounts ? "Accounts Administrator" : "Admin"}
      roleLabel={canManageAccounts ? "Administrator" : "Administrator"}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "overview" && <OverviewSection onNavigate={setActiveSection} />}
      {activeSection === "services" && <ServicesSection canWrite />}
      {activeSection === "attendance" && <AttendanceSection canWrite canApprove />}
      {activeSection === "centers" && <FellowshipCentersSection canWrite />}
      {activeSection === "fellowship-attendance" && <FellowshipAttendanceSection canWrite canApprove />}
      {activeSection === "inventory" && <InventorySection canWrite />}
      {activeSection === "users" && <UsersSection />}
      {activeSection === "pastors" && <PastorsSection />}
      {activeSection === "final-approval" && canManageAccounts && <AccountsApprovalDashboard stage="final" />}
      {activeSection === "accounts" && canManageAccounts && <ReimbursementSection mode="accountsAdmin" />}
      {activeSection === "departments" && canManageAccounts && <DepartmentsSection canManage />}
      {activeSection === "finance" && canManageAccounts && <FinancialReports />}
      {activeSection === "reports" && <ReportsSection />}
    </DashboardLayout>
  );
}
