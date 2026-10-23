import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { Receipt } from "lucide-react";

const SECTIONS: NavSection[] = [{ id: "reimbursements", label: "My Reimbursements", icon: Receipt }];

export default function MemberDashboard() {
  const [activeSection, setActiveSection] = useState("reimbursements");

  return (
    <DashboardLayout
      title="Church Member"
      roleLabel="Church Member"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "reimbursements" && <ReimbursementSection mode="member" />}
    </DashboardLayout>
  );
}
