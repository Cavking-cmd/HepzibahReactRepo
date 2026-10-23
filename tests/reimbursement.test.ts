import assert from "node:assert/strict";
import test from "node:test";

import {
  computeTotals,
  emptyLine,
  formatDay,
  formatMoney,
  lineAmount,
  lineTotal,
  requiresSerialNumber,
  statusMeta,
} from "../src/lib/reimbursement-format.ts";

test("computes item and request totals from subtotal and taxes", () => {
  const lines = [
    { ...emptyLine(1), itemName: "Serving spoons", subtotal: "122.49", gst: "6.12", pst: "8.57", hst: "15.92" },
    { ...emptyLine(2), itemName: "Cling wrap", subtotal: "77", gst: "3.85", pst: "5.39", hst: "0" },
    { ...emptyLine(3), itemName: "Bell pepper", subtotal: "30" },
  ];

  assert.equal(lineTotal(lines[0]), 153.1);
  assert.deepEqual(computeTotals(lines), {
    subtotal: 229.49,
    gst: 9.97,
    pst: 13.96,
    hst: 15.92,
    total: 269.34,
  });
});

test("treats blank and negative amounts as zero", () => {
  assert.equal(lineAmount(""), 0);
  assert.equal(lineAmount("abc"), 0);
  assert.equal(lineAmount("-5"), 0);
  assert.equal(lineAmount("12.5"), 12.5);
});

test("flags serialised equipment but not ordinary supplies", () => {
  assert.equal(requiresSerialNumber("Laptop for media team"), true);
  assert.equal(requiresSerialNumber("computer monitor"), true);
  assert.equal(requiresSerialNumber("1 carton of bell pepper"), false);
  assert.equal(requiresSerialNumber("serving spoons"), false);
  assert.equal(requiresSerialNumber("printer paper"), true);
  assert.equal(requiresSerialNumber(""), false);
});

test("maps statuses to labels used by the workflow", () => {
  assert.equal(statusMeta(0).label, "Draft");
  assert.equal(statusMeta(1).label, "Pending Approval");
  assert.equal(statusMeta(4).label, "Paid");
  assert.equal(statusMeta(5).variant, "destructive");
});

test("formats dates without shifting the day", () => {
  assert.equal(formatDay("2026-09-30T00:00:00"), "30 Sep 2026");
  assert.equal(formatDay(null), "-");
});

test("formats Canadian currency", () => {
  assert.equal(formatMoney(269.35), "$269.35");
  assert.equal(formatMoney(null), "$0.00");
});
