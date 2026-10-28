import { useCallback, useEffect, useState } from "react";
import { apiList, type PastorDto } from "@/lib/api";
import { SearchSelect } from "@/components/SearchSelect";
import { PastorFormDialog } from "@/components/sections/pastors/PastorFormDialog";

interface PastorPickerProps {
  id?: string;
  /** Selected pastor id, or "" for none. */
  value: string;
  onChange: (pastorId: string) => void;
  /** Name to show for the current value if it isn't in the active list (e.g. now inactive). */
  currentName?: string | null;
  /** Older typed name on a service not linked to a pastor yet. */
  legacyName?: string | null;
  canAdd?: boolean;
}

/** Searchable pastor dropdown with "Add a new pastor". Saves only an id, never free text. */
export function PastorPicker({ id, value, onChange, currentName, legacyName, canAdd = true }: PastorPickerProps) {
  const [pastors, setPastors] = useState<PastorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [initialName, setInitialName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setPastors(await apiList<PastorDto>("/api/Pastors"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <SearchSelect
        id={id}
        value={value}
        onChange={onChange}
        options={pastors.map((p) => ({ value: p.id, label: p.name, hint: p.description ?? undefined }))}
        pinnedOptions={[
          legacyName
            ? { value: "", label: `Keep typed name "${legacyName}"`, hint: "Not linked to a pastor record" }
            : { value: "", label: "No preacher recorded" },
        ]}
        placeholder="Choose a pastor"
        searchPlaceholder="Search pastors"
        emptyText="No pastor matches. Add them below."
        loading={loading}
        fallbackLabel={currentName ?? undefined}
        action={
          canAdd
            ? {
                label: "Add a new pastor or guest",
                onClick: (search) => {
                  setInitialName(search);
                  setAdding(true);
                },
              }
            : undefined
        }
      />
      <PastorFormDialog
        open={adding}
        onOpenChange={setAdding}
        editing={null}
        initialName={initialName}
        onSaved={(pastor) => {
          void load().then(() => onChange(pastor.id));
        }}
      />
    </>
  );
}
