import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { ClipboardCheck } from "lucide-react";

const SECTIONS: NavSection[] = [{ id: "reimbursements", label: "Reimbursement Oversight", icon: ClipboardCheck }];

export default function PastorDashboard() {
  const [activeSection, setActiveSection] = useState("reimbursements");

  return (
    <DashboardLayout
      title="Pastor"
      roleLabel="Pastor / Minister in Charge"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "reimbursements" && <ReimbursementSection mode="pastor" />}
    </DashboardLayout>
  );
}
