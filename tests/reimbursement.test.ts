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
  nextStepText,
  formatPercent,
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

test("maps statuses to labels used by the two-stage workflow", () => {
  assert.equal(statusMeta(0).label, "Draft");
  assert.equal(statusMeta(1).label, "Under Review");
  assert.equal(statusMeta(2).label, "Under Review"); // retired stage shows as Under Review
  assert.equal(statusMeta(7).label, "Pending Approval");
  assert.equal(statusMeta(3).label, "Approved · Awaiting Payment");
  assert.equal(statusMeta(4).label, "Paid");
  assert.equal(statusMeta(5).variant, "destructive");
  assert.equal(statusMeta(6).label, "Returned for Correction");
});

test("never describes an approved request as paid, or a reviewed one as approved", () => {
  assert.match(nextStepText(7), /not approved or paid yet/i);
  assert.match(nextStepText(3), /waiting for payment/i);
  assert.equal(nextStepText(4), "Paid.");
});

test("formats percentages and empty values", () => {
  assert.equal(formatPercent(83.333), "83.3%");
  assert.equal(formatPercent(null), "-");
});

test("formats dates without shifting the day", () => {
  assert.equal(formatDay("2026-09-30T00:00:00"), "30 Sep 2026");
  assert.equal(formatDay(null), "-");
});

test("formats Canadian currency", () => {
  assert.equal(formatMoney(269.35), "$269.35");
  assert.equal(formatMoney(null), "$0.00");
});
