import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { AccountsApprovalDashboard } from "@/components/sections/AccountsApprovalDashboard";
import { Wallet, CheckSquare } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "approval", label: "Approval & Payment", icon: CheckSquare },
  { id: "accounts", label: "All Reimbursements", icon: Wallet },
];

export default function AccountsOfficerDashboard() {
  const [activeSection, setActiveSection] = useState("approval");

  return (
    <DashboardLayout
      title="Accounts Officer"
      roleLabel="Accounts Officer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "approval" && <AccountsApprovalDashboard />}
      {activeSection === "accounts" && <ReimbursementSection mode="accountsOfficer" />}
    </DashboardLayout>
  );
}
