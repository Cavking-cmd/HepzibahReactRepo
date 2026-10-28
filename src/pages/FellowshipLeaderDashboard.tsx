import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { FellowshipCentersSection } from "@/components/sections/FellowshipCentersSection";
import { FellowshipAttendanceSection } from "@/components/sections/FellowshipAttendanceSection";
import { ReimbursementSection } from "@/components/sections/ReimbursementSection";
import { Home, ClipboardList, Receipt } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "centers", label: "Fellowship Centers", icon: Home },
  { id: "fellowship-attendance", label: "Fellowship Attendance", icon: ClipboardList },
  { id: "reimbursements", label: "My Reimbursements", icon: Receipt },
];

export default function FellowshipLeaderDashboard() {
  const [activeSection, setActiveSection] = useState("centers");

  return (
    <DashboardLayout
      title="Fellowship Leader"
      roleLabel="Fellowship Leader"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "centers" && <FellowshipCentersSection canWrite />}
      {activeSection === "fellowship-attendance" && <FellowshipAttendanceSection canWrite canApprove={false} />}
      {activeSection === "reimbursements" && <ReimbursementSection mode="member" />}
    </DashboardLayout>
  );
}
