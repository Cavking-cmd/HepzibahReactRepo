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
  Receipt,
  FileSearch,
} from "lucide-react";

const OVERVIEW: NavSection = { id: "overview", label: "Overview", icon: LayoutDashboard };
const REPORTS: NavSection = { id: "reports", label: "Reports", icon: BarChart3 };

/** Church administration sections. Shown to the Admin role. */
const ADMIN_SECTIONS: NavSection[] = [
  { id: "services", label: "Services", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: Users },
  { id: "pastors", label: "Pastors", icon: UserRound },
  { id: "centers", label: "Fellowship Centers", icon: Home },
  { id: "fellowship-attendance", label: "Fellowship Attendance", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "users", label: "Users & Roles", icon: UserPlus },
];

/**
 * Accounts Admin: everything on the Accounts Officer page (review queue, all
 * reimbursements, department budgets, financial reports), plus final approval and
 * payment, plus Overview and Reports from the admin page.
 */
const ACCOUNTS_SECTIONS: NavSection[] = [
  { id: "final-approval", label: "Final Approval & Payment", icon: ClipboardCheck },
  { id: "review", label: "Review Queue", icon: FileSearch },
  { id: "accounts", label: "All Reimbursements", icon: Wallet },
  { id: "departments", label: "Department Budgets", icon: Building2 },
  { id: "finance", label: "Financial Reports", icon: LineChart },
];

export default function AdminDashboard() {
  const { hasRole } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const isAccountsAdmin = hasRole("AccountsAdmin");
  const isAdmin = hasRole("Admin");
  // Church administration shows for Admins. Someone who is only an Accounts Admin gets the
  // accounts dashboard on its own; someone with both roles gets both.
  const showAdminSections = isAdmin || !isAccountsAdmin;

  const sections: NavSection[] = [
    OVERVIEW,
    ...(isAccountsAdmin ? ACCOUNTS_SECTIONS : []),
    ...(showAdminSections ? ADMIN_SECTIONS : []),
    REPORTS,
    // Accounts Admins see their own requests in All Reimbursements, so only plain Admins need this.
    ...(isAccountsAdmin ? [] : [{ id: "my-reimbursements", label: "My Reimbursements", icon: Receipt }]),
  ];

  const visible = new Set(sections.map((s) => s.id));
  const show = (id: string) => activeSection === id && visible.has(id);

  // Overview links inventory alerts to the Inventory section; only offer that when it exists.
  const navigateFromOverview = visible.has("inventory") ? setActiveSection : undefined;

  return (
    <DashboardLayout
      title={isAccountsAdmin && !isAdmin ? "Accounts Administrator" : "Admin"}
      roleLabel={isAccountsAdmin ? "Accounts Admin" : "Administrator"}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {show("overview") && <OverviewSection onNavigate={navigateFromOverview} />}

      {show("final-approval") && <AccountsApprovalDashboard stage="final" />}
      {show("review") && <AccountsApprovalDashboard stage="review" />}
      {show("accounts") && <ReimbursementSection mode="accountsAdmin" />}
      {show("departments") && <DepartmentsSection canManage />}
      {show("finance") && <FinancialReports />}

      {show("services") && <ServicesSection canWrite />}
      {show("attendance") && <AttendanceSection canWrite canApprove />}
      {show("pastors") && <PastorsSection />}
      {show("centers") && <FellowshipCentersSection canWrite />}
      {show("fellowship-attendance") && <FellowshipAttendanceSection canWrite canApprove />}
      {show("inventory") && <InventorySection canWrite />}
      {show("users") && <UsersSection />}

      {show("reports") && <ReportsSection />}
      {show("my-reimbursements") && <ReimbursementSection mode="member" />}
    </DashboardLayout>
  );
}
