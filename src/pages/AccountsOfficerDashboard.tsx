import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { AccountsApprovalDashboard } from "@/components/sections/AccountsApprovalDashboard";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { FinancialReports } from "@/components/sections/reports/FinancialReports";
import { BarChart3, Building2, FileSearch, Wallet } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "review", label: "Review Queue", icon: FileSearch },
  { id: "accounts", label: "All Reimbursements", icon: Wallet },
  { id: "departments", label: "Department Budgets", icon: Building2 },
  { id: "finance", label: "Financial Reports", icon: BarChart3 },
];

export default function AccountsOfficerDashboard() {
  const [activeSection, setActiveSection] = useState("review");

  return (
    <DashboardLayout
      title="Accounts Officer"
      roleLabel="Accounts Officer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "review" && <AccountsApprovalDashboard stage="review" />}
      {activeSection === "accounts" && <ReimbursementSection mode="accountsOfficer" />}
      {activeSection === "departments" && <DepartmentsSection canManage={false} />}
      {activeSection === "finance" && <FinancialReports />}
    </DashboardLayout>
  );
}
