import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { AttendanceSection } from "@/components/sections/AttendanceSection";
import { FellowshipCentersSection } from "@/components/sections/FellowshipCentersSection";
import { FellowshipAttendanceSection } from "@/components/sections/FellowshipAttendanceSection";
import { InventorySection } from "@/components/sections/InventorySection";
import { ReportsSection } from "@/components/sections/reports/ReportsSection";
import { Calendar, Users, Home, ClipboardList, Package, BarChart3 } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "services", label: "Services", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: Users },
  { id: "centers", label: "Fellowship Centers", icon: Home },
  { id: "fellowship-attendance", label: "Fellowship Attendance", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function ViewerDashboard() {
  const [activeSection, setActiveSection] = useState("services");

  return (
    <DashboardLayout
      title="Viewer"
      roleLabel="Viewer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      readOnly
    >
      {activeSection === "services" && <ServicesSection canWrite={false} />}
      {activeSection === "attendance" && <AttendanceSection canWrite={false} canApprove={false} />}
      {activeSection === "centers" && <FellowshipCentersSection canWrite={false} />}
      {activeSection === "fellowship-attendance" && <FellowshipAttendanceSection canWrite={false} canApprove={false} />}
      {activeSection === "inventory" && <InventorySection canWrite={false} />}
      {activeSection === "reports" && <ReportsSection />}
    </DashboardLayout>
  );
}
