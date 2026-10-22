import assert from "node:assert/strict";
import test from "node:test";

import { buildTablePdf } from "../src/lib/pdf.ts";

function toBinaryString(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

test("builds a well-formed PDF with a valid xref table", () => {
  const bytes = buildTablePdf({
    title: "Inventory List",
    subtitle: "Generated today",
    headers: ["Item", "Qty"],
    rows: [
      ["Chairs", "40"],
      ["Tables", "10"],
    ],
    widths: [3, 1],
    align: ["left", "right"],
  });
  const text = toBinaryString(bytes);

  assert.ok(text.startsWith("%PDF-1.4\n"));
  assert.ok(text.endsWith("%%EOF\n"));
  assert.ok(text.includes("/BaseFont /Helvetica"));

  const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)?.[1]);
  assert.ok(startxref > 0, "startxref should be present");
  assert.equal(text.slice(startxref, startxref + 4), "xref");

  const xrefLines = text.slice(startxref).split("\n");
  const entryCount = Number(xrefLines[1].split(" ")[1]);
  assert.ok(entryCount > 1, "xref should list objects");
  const offsets = xrefLines
    .slice(3, 3 + entryCount - 1)
    .map((line) => Number(line.slice(0, 10)));

  offsets.forEach((offset, index) => {
    const header = `${index + 1} 0 obj`;
    assert.equal(text.slice(offset, offset + header.length), header);
  });
});

test("escapes parentheses and backslashes in cell text", () => {
  const bytes = buildTablePdf({
    title: "Escape check",
    headers: ["Item"],
    rows: [["Paint (white) \\ 100%"]],
  });
  const text = toBinaryString(bytes);

  assert.ok(text.includes("Paint \\(white\\) \\\\ 100%"));
});

test("normalizes smart punctuation into WinAnsi-safe text", () => {
  const bytes = buildTablePdf({
    title: "Sanitize check",
    headers: ["Item"],
    rows: [["Café \u2014 \u201cold\u201d \u2026"]],
  });
  const text = toBinaryString(bytes);

  assert.ok(text.includes('Café - "old" ...'));
  assert.ok(!text.includes("\u2014"));
  assert.ok(!text.includes("\u201c"));
});

test("paginates long lists and renders every row exactly once", () => {
  const rows = Array.from({ length: 60 }, (_, index) => [`R${index}`]);
  const bytes = buildTablePdf({
    title: "Pagination check",
    headers: ["Row"],
    rows,
  });
  const text = toBinaryString(bytes);

  const pageCount = Number(/\/Count (\d+)/.exec(text)?.[1]);
  assert.ok(pageCount > 1, "long lists should span multiple pages");

  for (let index = 0; index < rows.length; index++) {
    const occurrences = text.split(`(R${index})`).length - 1;
    assert.equal(occurrences, 1, `row R${index} should appear once`);
  }
});

test("renders a valid single page for an empty list", () => {
  const bytes = buildTablePdf({
    title: "Empty check",
    headers: ["Item"],
    rows: [],
  });
  const text = toBinaryString(bytes);

  assert.equal(Number(/\/Count (\d+)/.exec(text)?.[1]), 1);
  assert.ok(text.includes("No items to list."));
});
