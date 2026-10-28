import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiList, apiRequest, type LegacyPreacherDto, type PastorDto } from "@/lib/api";
import { formatDay } from "@/lib/reimbursements";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { SearchSelect } from "@/components/SearchSelect";
import { PastorFormDialog } from "@/components/sections/pastors/PastorFormDialog";
import { Link2, Pencil, Plus, Search } from "lucide-react";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export function PastorsSection() {
  const [pastors, setPastors] = useState<PastorDto[]>([]);
  const [legacy, setLegacy] = useState<LegacyPreacherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PastorDto | null>(null);
  const [initialName, setInitialName] = useState("");
  // When adding a pastor straight from an unlinked typed name, link it after saving.
  const [linkAfterSave, setLinkAfterSave] = useState<string | null>(null);

  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, legacyList] = await Promise.all([
      apiList<PastorDto>("/api/Pastors?includeInactive=true"),
      apiList<LegacyPreacherDto>("/api/Pastors/legacy-preachers"),
    ]);
    setPastors(list);
    setLegacy(legacyList);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return pastors
      .filter((p) => showInactive || p.isActive)
      .filter((p) => !q || normalize(p.name).includes(q) || normalize(p.description ?? "").includes(q) || normalize(p.email ?? "").includes(q));
  }, [pastors, search, showInactive]);

  const paging = usePagination(filtered);
  const activeOptions = pastors.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name, hint: p.description ?? undefined }));

  function openCreate(name = "") {
    setEditing(null);
    setInitialName(name);
    setFormOpen(true);
  }

  function openEdit(pastor: PastorDto) {
    setEditing(pastor);
    setInitialName("");
    setLinkAfterSave(null);
    setFormOpen(true);
  }

  async function link(preacherName: string, pastorId: string) {
    setLinking(preacherName);
    const result = await apiRequest<number>("POST", "/api/Pastors/link-legacy", { preacherName, pastorId });
    setLinking(null);
    if (!result.ok) {
      toast.error(result.body?.message ?? "Linking failed.");
      return;
    }
    toast.success(result.body?.message ?? "Linked.");
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pastors</h2>
          <p className="text-sm text-muted-foreground">
            One record per pastor or guest minister, picked from a list when recording services so names are always spelled the same.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setLinkAfterSave(null);
            openCreate();
          }}
        >
          <Plus className="h-4 w-4" /> Add Pastor
        </Button>
      </div>

      {legacy.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" /> Typed preacher names to link ({legacy.length})
            </CardTitle>
            <CardDescription>
              Older services have preacher names typed by hand. Link each one to a pastor so reports count them together. Nothing is
              merged automatically; similar names are only suggested.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {legacy.map((item) => {
              const suggestion = item.suggestedPastors.find((p) => p.isActive);
              const value = linkChoice[item.preacherName] ?? suggestion?.id ?? "";
              return (
                <div key={item.preacherName} className="grid gap-2 rounded-lg border border-border/70 p-3 lg:grid-cols-[1fr_16rem_auto] lg:items-center">
                  <div>
                    <p className="font-medium">"{item.preacherName}"</p>
                    <p className="text-xs text-muted-foreground">
                      {item.serviceCount} service{item.serviceCount === 1 ? "" : "s"} · {formatDay(item.firstServiceDate)}
                      {item.serviceCount > 1 ? ` to ${formatDay(item.lastServiceDate)}` : ""}
                      {suggestion ? ` · looks like ${suggestion.name}` : ""}
                    </p>
                  </div>
                  <SearchSelect
                    value={value}
                    onChange={(v) => setLinkChoice((prev) => ({ ...prev, [item.preacherName]: v }))}
                    options={activeOptions}
                    placeholder="Link to pastor…"
                    searchPlaceholder="Search pastors"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => value && void link(item.preacherName, value)} disabled={!value || linking === item.preacherName}>
                      {linking === item.preacherName ? "Linking…" : "Link"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLinkAfterSave(item.preacherName);
                        openCreate(item.preacherName);
                      }}
                    >
                      New pastor
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pastors" className="pl-8" aria-label="Search pastors" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={(checked: boolean) => setShowInactive(checked)} /> Show inactive
        </label>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Services</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {pastors.length === 0 ? "No pastors yet. Add the first one." : "No pastors match your search."}
                  </TableCell>
                </TableRow>
              )}
              {paging.pageItems.map((pastor) => (
                <TableRow key={pastor.id} className={cn(!pastor.isActive && "opacity-60")}>
                  <TableCell className="font-medium">
                    {pastor.name}
                    {!pastor.isActive && <Badge variant="outline" className="ml-2">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">{pastor.description ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[pastor.email, pastor.phoneNumber].filter(Boolean).join(" · ") || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pastor.serviceCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(pastor)} aria-label={`Edit ${pastor.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            total={filtered.length}
            page={paging.page}
            pageSize={paging.pageSize}
            totalPages={paging.totalPages}
            onPageChange={paging.changePage}
            onPageSizeChange={paging.changePageSize}
          />
        </div>
      )}

      <PastorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        initialName={initialName}
        onSaved={(pastor) => {
          const pending = linkAfterSave;
          setLinkAfterSave(null);
          if (pending) {
            void link(pending, pastor.id);
          } else {
            void load();
          }
        }}
      />
    </div>
  );
}
