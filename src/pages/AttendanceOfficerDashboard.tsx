import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { AttendanceSection } from "@/components/sections/AttendanceSection";
import { Calendar, Users } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "services", label: "Services", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: Users },
];

export default function AttendanceOfficerDashboard() {
  const [activeSection, setActiveSection] = useState("services");

  return (
    <DashboardLayout
      title="Attendance Officer"
      roleLabel="Attendance Officer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "services" && <ServicesSection canWrite />}
      {activeSection === "attendance" && <AttendanceSection canWrite canApprove={false} />}
    </DashboardLayout>
  );
}
