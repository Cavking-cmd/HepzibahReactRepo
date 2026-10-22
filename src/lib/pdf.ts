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

interface PdfObject {
  head: string;
  stream?: Uint8Array;
  tail?: string;
}

function assemble(objects: (PdfObject | string)[]): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const pushString = (value: string) => {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
    parts.push(bytes);
    length += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    length += bytes.length;
  };

  pushString("%PDF-1.4\n");
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = length;
    const object = objects[id];
    const head = typeof object === "string" ? object : object.head;
    pushString(`${id} 0 obj\n${head}`);
    if (typeof object !== "string") {
      if (object.stream) pushBytes(object.stream);
      if (object.tail) pushString(object.tail);
    }
    pushString("\nendobj\n");
  }

  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pushString(xref);

  const bytes = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    bytes.set(part, cursor);
    cursor += part.length;
  }
  return bytes;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  let index = 2;
  while (index + 8 < bytes.length) {
    if (bytes[index] !== 0xff) {
      index++;
      continue;
    }
    const marker = bytes[index + 1];
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      index += 2;
      continue;
    }
    const segmentLength = (bytes[index + 2] << 8) | bytes[index + 3];
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isStartOfFrame) {
      const height = (bytes[index + 5] << 8) | bytes[index + 6];
      const width = (bytes[index + 7] << 8) | bytes[index + 8];
      return { width, height };
    }
    index += 2 + segmentLength;
  }
  return { width: 1200, height: 700 };
}

function decodeJpegDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const metadata = dataUrl.slice(0, comma);
  if (!metadata.includes("image/jpeg")) {
    throw new Error("Expected a JPEG data URL.");
  }
  const binary = atob(dataUrl.slice(comma + 1).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function triggerPdfDownload(fileName: string, bytes: Uint8Array<ArrayBuffer>): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  triggerPdfDownload(fileName, buildTablePdf(options));
}

export interface ImagePdfPage {
  caption: string;
  dataUrl: string;
}

export interface ImagePdfOptions {
  title: string;
  subtitle?: string;
  pages: ImagePdfPage[];
  landscape?: boolean;
  footerNote?: string;
}

export function buildImagePdf(options: ImagePdfOptions): Uint8Array<ArrayBuffer> {
  const landscape = options.landscape ?? true;
  const pageWidth = landscape ? 792 : 612;
  const pageHeight = landscape ? 612 : 792;
  const margin = 40;

  const objects: (PdfObject | string)[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  const images = options.pages.map((page) => {
    const bytes = decodeJpegDataUrl(page.dataUrl);
    return { caption: sanitize(page.caption), bytes, ...jpegDimensions(bytes) };
  });

  const pageCount = images.length;
  const titleY = pageHeight - margin - 10;
  const subtitleY = titleY - 15;
  const dividerY = subtitleY - 8;
  const captionY = dividerY - 20;
  const imageTop = captionY - 10;
  const imageBottom = margin + 22;
  const imageBoxWidth = pageWidth - margin * 2;
  const imageBoxHeight = imageTop - imageBottom;

  const kids: string[] = [];
  images.forEach((image, index) => {
    const imageId = 5 + index * 3;
    const contentId = imageId + 1;
    const pageId = imageId + 2;

    const title = sanitize(options.title);
    const ops: string[] = [
      `BT /F2 15 Tf 0.1 g 1 0 0 1 ${((pageWidth - measure(title, 15, true)) / 2).toFixed(
        2
      )} ${titleY.toFixed(2)} Tm (${escapePdf(title)}) Tj ET`,
    ];

    if (options.subtitle) {
      const subtitle = sanitize(options.subtitle);
      ops.push(
        `BT /F1 9 Tf 0.45 g 1 0 0 1 ${(
          (pageWidth - measure(subtitle, 9, false)) / 2
        ).toFixed(2)} ${subtitleY.toFixed(2)} Tm (${escapePdf(subtitle)}) Tj ET`
      );
    }

    ops.push(
      `0.75 G 0.6 w ${margin} ${dividerY.toFixed(2)} m ${pageWidth - margin} ${dividerY.toFixed(
        2
      )} l S`
    );

    const caption = fitText(image.caption, imageBoxWidth, 11, true);
    ops.push(
      `BT /F2 11 Tf 0.15 g 1 0 0 1 ${((pageWidth - measure(caption, 11, true)) / 2).toFixed(
        2
      )} ${captionY.toFixed(2)} Tm (${escapePdf(caption)}) Tj ET`
    );

    const scale = Math.min(
      imageBoxWidth / Math.max(1, image.width),
      imageBoxHeight / Math.max(1, image.height)
    );
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = (pageWidth - drawWidth) / 2;
    const drawY = imageBottom + (imageBoxHeight - drawHeight) / 2;
    ops.push(
      `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(
        2
      )} cm /Im0 Do Q`
    );

    if (options.footerNote) {
      const note = sanitize(options.footerNote);
      ops.push(
        `BT /F1 8 Tf 0.45 g 1 0 0 1 ${margin} ${(margin - 12).toFixed(2)} Tm (${escapePdf(
          note
        )}) Tj ET`
      );
    }

    const pageLabel = `Page ${index + 1} of ${pageCount}`;
    ops.push(
      `BT /F1 8 Tf 0.45 g 1 0 0 1 ${((pageWidth - measure(pageLabel, 8, false)) / 2).toFixed(
        2
      )} ${(margin - 12).toFixed(2)} Tm (${escapePdf(pageLabel)}) Tj ET`
    );

    const stream = ops.join("\n");

    objects[imageId] = {
      head: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      stream: image.bytes,
      tail: "\nendstream",
    };
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im0 ${imageId} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;
    kids.push(`${pageId} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`;

  return assemble(objects);
}

export function downloadImagePdf(fileName: string, options: ImagePdfOptions): void {
  triggerPdfDownload(fileName, buildImagePdf(options));
}
