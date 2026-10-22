type ColumnAlign = "left" | "right";

export interface TablePdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  widths?: number[];
  align?: ColumnAlign[];
  landscape?: boolean;
  footerNote?: string;
}

const CHARACTER_REPLACEMENTS: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2022": "-",
  "\u2026": "...",
};

function sanitize(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) {
      out += " ";
      continue;
    }
    const replacement = CHARACTER_REPLACEMENTS[ch];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    out += (code <= 0x7e || (code >= 0xa0 && code <= 0xff)) ? ch : "?";
  }
  return out.replace(/ {2,}/g, " ");
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function charUnits(ch: string, bold: boolean): number {
  const code = ch.charCodeAt(0);
  if (ch === " ") return 278;
  if (code >= 48 && code <= 57) return 556;
  if (code >= 65 && code <= 90) return bold ? 722 : 667;
  if (code >= 97 && code <= 122) return bold ? 556 : 500;
  if (".,:;'!|".includes(ch)) return 278;
  if ('()[]{}-/\\"'.includes(ch)) return 333;
  if ("$#%&@".includes(ch)) return 556;
  return bold ? 556 : 500;
}

function measure(text: string, size: number, bold: boolean): number {
  let units = 0;
  for (const ch of text) units += charUnits(ch, bold);
  return (units / 1000) * size;
}

function fitText(text: string, maxWidth: number, size: number, bold: boolean): string {
  if (measure(text, size, bold) <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && measure(text.slice(0, end) + "...", size, bold) > maxWidth) end--;
  return text.slice(0, end) + "...";
}

function assemble(objects: string[]): Uint8Array<ArrayBuffer> {
  const chunks: string[] = [];
  const offsets: number[] = [];
  let offset = 0;

  const push = (chunk: string) => {
    chunks.push(chunk);
    offset += chunk.length;
  };

  push("%PDF-1.4\n");
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = offset;
    push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  push(xref);

  const full = chunks.join("");
  const bytes = new Uint8Array(full.length);
  for (let i = 0; i < full.length; i++) bytes[i] = full.charCodeAt(i) & 0xff;
  return bytes;
}

export function buildTablePdf(options: TablePdfOptions): Uint8Array<ArrayBuffer> {
  const landscape = options.landscape ?? true;
  const pageWidth = landscape ? 792 : 612;
  const pageHeight = landscape ? 612 : 792;
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;

  const widths = options.widths ?? options.headers.map(() => 1);
  const totalWeight = widths.reduce((sum, width) => sum + width, 0) || 1;
  const columnWidths = widths.map((width) => (width / totalWeight) * usableWidth);
  const aligns: ColumnAlign[] = options.headers.map(
    (_, index) => options.align?.[index] ?? "left"
  );

  const titleY = pageHeight - margin - 12;
  const subtitleY = titleY - 16;
  const dividerY = subtitleY - 10;
  const tableTop = dividerY - 14;
  const headerHeight = 22;
  const rowHeight = 18;
  const bottomLimit = margin + 26;
  const rowsPerPage = Math.max(
    1,
    Math.floor((tableTop - headerHeight - bottomLimit) / rowHeight)
  );

  const groups: string[][][] = [];
  if (options.rows.length === 0) {
    groups.push([]);
  } else {
    for (let i = 0; i < options.rows.length; i += rowsPerPage) {
      groups.push(options.rows.slice(i, i + rowsPerPage));
    }
  }

  const renderPage = (rows: string[][], pageIndex: number, pageCount: number): string => {
    const ops: string[] = [];
    const putText = (
      x: number,
      y: number,
      size: number,
      content: string,
      font: "F1" | "F2",
      gray: number
    ) => {
      ops.push(
        `BT /${font} ${size} Tf ${gray} g 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdf(
          content
        )}) Tj ET`
      );
    };

    const title = sanitize(options.title);
    putText(
      (pageWidth - measure(title, 16, true)) / 2,
      titleY,
      16,
      title,
      "F2",
      0.1
    );

    if (options.subtitle) {
      const subtitle = sanitize(options.subtitle);
      putText(
        (pageWidth - measure(subtitle, 9, false)) / 2,
        subtitleY,
        9,
        subtitle,
        "F1",
        0.45
      );
    }

    ops.push(`0.75 G 0.6 w ${margin} ${dividerY} m ${margin + usableWidth} ${dividerY} l S`);

    ops.push(`0.93 g ${margin} ${tableTop - headerHeight} ${usableWidth} ${headerHeight} re f`);

    let x = margin;
    options.headers.forEach((header, index) => {
      const label = fitText(sanitize(header), columnWidths[index] - 8, 8.5, true);
      const textX =
        aligns[index] === "right"
          ? x + columnWidths[index] - 4 - measure(label, 8.5, true)
          : x + 4;
      putText(textX, tableTop - 14.5, 8.5, label, "F2", 0.25);
      x += columnWidths[index];
    });

    ops.push(`0.55 G 0.8 w ${margin} ${tableTop} m ${margin + usableWidth} ${tableTop} l S`);
    ops.push(
      `0.55 G 0.8 w ${margin} ${tableTop - headerHeight} m ${margin + usableWidth} ${
        tableTop - headerHeight
      } l S`
    );

    rows.forEach((row, rowIndex) => {
      const rowTop = tableTop - headerHeight - rowIndex * rowHeight;
      if (rowIndex % 2 === 1) {
        ops.push(`0.97 g ${margin} ${rowTop - rowHeight} ${usableWidth} ${rowHeight} re f`);
      }

      let cellX = margin;
      options.headers.forEach((_, columnIndex) => {
        const cell = fitText(
          sanitize(row[columnIndex] ?? ""),
          columnWidths[columnIndex] - 8,
          8.5,
          false
        );
        const textX =
          aligns[columnIndex] === "right"
            ? cellX + columnWidths[columnIndex] - 4 - measure(cell, 8.5, false)
            : cellX + 4;
        putText(textX, rowTop - 12.5, 8.5, cell, "F1", 0.12);
        cellX += columnWidths[columnIndex];
      });

      const lineY = rowTop - rowHeight;
      ops.push(`0.85 G 0.5 w ${margin} ${lineY} m ${margin + usableWidth} ${lineY} l S`);
    });

    if (rows.length === 0) {
      putText(margin + 4, tableTop - headerHeight - 12.5, 8.5, "No items to list.", "F1", 0.45);
    }

    if (options.footerNote) {
      putText(margin, margin - 14, 8, sanitize(options.footerNote), "F1", 0.45);
    }

    const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;
    putText(
      (pageWidth - measure(pageLabel, 8, false)) / 2,
      margin - 14,
      8,
      pageLabel,
      "F1",
      0.45
    );

    return ops.join("\n");
  };

  const pageCount = groups.length;
  const streams = groups.map((rows, index) => renderPage(rows, index, pageCount));

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  const kids: string[] = [];
  streams.forEach((stream, index) => {
    const contentId = 5 + index * 2;
    const pageId = contentId + 1;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    kids.push(`${pageId} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`;

  return assemble(objects);
}

export function downloadTablePdf(fileName: string, options: TablePdfOptions): void {
  const bytes = buildTablePdf(options);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
