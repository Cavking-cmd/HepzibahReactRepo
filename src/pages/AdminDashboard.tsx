import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { AttendanceSection } from "@/components/sections/AttendanceSection";
import { FellowshipCentersSection } from "@/components/sections/FellowshipCentersSection";
import { FellowshipAttendanceSection } from "@/components/sections/FellowshipAttendanceSection";
import { InventorySection } from "@/components/sections/InventorySection";
import { ReportsSection } from "@/components/sections/reports/ReportsSection";
import { LayoutDashboard, Calendar, Users, Home, ClipboardList, Package, BarChart3 } from "lucide-react";

const SECTIONS: NavSection[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "services", label: "Services", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: Users },
  { id: "centers", label: "Fellowship Centers", icon: Home },
  { id: "fellowship-attendance", label: "Fellowship Attendance", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <DashboardLayout
      title="Admin"
      roleLabel="Administrator"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "overview" && <OverviewSection onNavigate={setActiveSection} />}
      {activeSection === "services" && <ServicesSection canWrite />}
      {activeSection === "attendance" && <AttendanceSection canWrite canApprove />}
      {activeSection === "centers" && <FellowshipCentersSection canWrite />}
      {activeSection === "fellowship-attendance" && <FellowshipAttendanceSection canWrite canApprove />}
      {activeSection === "inventory" && <InventorySection canWrite />}
      {activeSection === "reports" && <ReportsSection />}
    </DashboardLayout>
  );
}
