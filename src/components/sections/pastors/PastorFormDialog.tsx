import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest, type PastorDto, type PastorDuplicateDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";

interface PastorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PastorDto | null;
  /** Prefill the name when adding from a search box. */
  initialName?: string;
  /** Called with the saved pastor, or an existing one the user chose instead. */
  onSaved: (pastor: PastorDto) => void;
}

interface FormState {
  name: string;
  email: string;
  phoneNumber: string;
  description: string;
  isActive: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-.\s]{5,40}$/;

const textareaClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function PastorFormDialog({ open, onOpenChange, editing, initialName, onSaved }: PastorFormDialogProps) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", phoneNumber: "", description: "", isActive: true });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [duplicate, setDuplicate] = useState<PastorDuplicateDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            email: editing.email ?? "",
            phoneNumber: editing.phoneNumber ?? "",
            description: editing.description ?? "",
            isActive: editing.isActive,
          }
        : { name: initialName?.trim() ?? "", email: "", phoneNumber: "", description: "", isActive: true },
    );
    setErrors({});
    setDuplicate(null);
    setSaving(false);
  }, [open, editing, initialName]);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    else if (form.name.trim().length > 150) next.name = "Keep the name to 150 characters or fewer.";
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) next.email = "Enter a valid email address, or leave it empty.";
    if (form.phoneNumber.trim() && !PHONE_PATTERN.test(form.phoneNumber.trim())) next.phoneNumber = "Use digits, spaces, +, - or brackets, or leave it empty.";
    if (form.description.length > 500) next.description = "Keep the description to 500 characters or fewer.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(confirmNotDuplicate: boolean) {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phoneNumber: form.phoneNumber.trim() || null,
      description: form.description.trim() || null,
      confirmNotDuplicate,
    };

    const result = editing
      ? await apiRequest<PastorDto>("PUT", `/api/Pastors/${editing.id}`, { ...payload, id: editing.id, isActive: form.isActive })
      : await apiRequest<PastorDto>("POST", "/api/Pastors", payload);
    setSaving(false);

    if (result.httpStatus === 409) {
      const dup = result.body?.data as unknown as PastorDuplicateDto | null;
      setDuplicate(dup ?? { message: result.body?.message ?? "A pastor with a similar name already exists.", matches: [] });
      return;
    }

    if (!result.ok || !result.body?.data) {
      toast.error(result.body?.message ?? "The pastor could not be saved.");
      return;
    }

    toast.success(editing ? "Pastor updated." : "Pastor added.");
    onSaved(result.body.data);
    onOpenChange(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pastor" : "Add Pastor"}</DialogTitle>
          <DialogDescription>Used when recording who preached at a service. This is not a login account.</DialogDescription>
        </DialogHeader>

        {duplicate ? (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{duplicate.message}</p>
            </div>
            <div className="space-y-2">
              {duplicate.matches.map((match) => (
                <div key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {match.name}
                      {!match.isActive && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[match.description, match.email, match.phoneNumber, `${match.serviceCount} service${match.serviceCount === 1 ? "" : "s"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {!editing && match.isActive && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onSaved(match);
                        onOpenChange(false);
                      }}
                    >
                      Use this
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDuplicate(null)} disabled={saving}>
                Back
              </Button>
              <Button onClick={() => void save(true)} disabled={saving}>
                {saving ? "Saving…" : "It's a different person"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="pastorName">Name *</Label>
              <Input id="pastorName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name || undefined} autoFocus />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pastorEmail">Email</Label>
                <Input
                  id="pastorEmail"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!errors.email || undefined}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pastorPhone">Phone Number</Label>
                <Input
                  id="pastorPhone"
                  type="tel"
                  inputMode="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  aria-invalid={!!errors.phoneNumber || undefined}
                />
                {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pastorDescription">Description</Label>
              <textarea
                id="pastorDescription"
                rows={3}
                className={textareaClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Home or Guest pastor?"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
            {editing && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive pastors stay on past services but aren't offered for new ones.</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(checked: boolean) => setForm({ ...form, isActive: checked })} />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Pastor"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
