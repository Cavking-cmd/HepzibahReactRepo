import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReports } from "@/components/sections/reports/AttendanceReports";
import { FellowshipReports } from "@/components/sections/reports/FellowshipReports";
import { InventoryReports } from "@/components/sections/reports/InventoryReports";

export function ReportsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">Analytics and insights drawn from live church records.</p>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fellowship">Fellowship</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <AttendanceReports />
        </TabsContent>
        <TabsContent value="fellowship">
          <FellowshipReports />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
