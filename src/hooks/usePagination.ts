import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSizeDefault = 10) {
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  function changePage(next: number) {
    setPage(Math.min(Math.max(next, 1), totalPages));
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return { pageItems, page: safePage, pageSize, totalPages, changePage, changePageSize };
}