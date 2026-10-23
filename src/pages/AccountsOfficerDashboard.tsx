import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { Wallet } from "lucide-react";

const SECTIONS: NavSection[] = [{ id: "accounts", label: "Accounts Payable", icon: Wallet }];

export default function AccountsOfficerDashboard() {
  const [activeSection, setActiveSection] = useState("accounts");

  return (
    <DashboardLayout
      title="Accounts Officer"
      roleLabel="Accounts Officer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "accounts" && <ReimbursementSection mode="accountsOfficer" />}
    </DashboardLayout>
  );
}
