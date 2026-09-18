import { useState } from "react";
import { DashboardLayout, type NavSection } from "@/components/layout/DashboardLayout";
import { InventorySection } from "@/components/sections/InventorySection";
import { Package } from "lucide-react";

const SECTIONS: NavSection[] = [{ id: "inventory", label: "Inventory", icon: Package }];

export default function InventoryOfficerDashboard() {
  const [activeSection, setActiveSection] = useState("inventory");

  return (
    <DashboardLayout
      title="Inventory Officer"
      roleLabel="Inventory Officer"
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "inventory" && <InventorySection canWrite />}
    </DashboardLayout>
  );
}
