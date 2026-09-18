import { useCallback, useEffect, useState } from "react";
import { apiList } from "@/lib/api";

export function useCrudList<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await apiList<T>(endpoint);
    setItems(list);
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh, setItems };
}
