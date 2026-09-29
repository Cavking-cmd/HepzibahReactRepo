import { toPng } from "html-to-image";

export async function exportElementAsPng(
  element: HTMLElement | null,
  fileName: string
): Promise<void> {
  if (!element) return;
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
  triggerDownload(dataUrl, fileName);
}

type CsvValue = string | number | null | undefined;

export function exportCsv(
  fileName: string,
  rows: CsvValue[][]
): void {
  if (rows.length === 0) return;
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(dataUrl);
}