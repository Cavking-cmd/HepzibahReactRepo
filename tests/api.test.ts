import assert from "node:assert/strict";
import test from "node:test";

import { deRef, unwrap } from "../src/lib/api.ts";

test("deRef removes reference metadata and normalizes nested objects", () => {
  const result = deRef({
    $id: "1",
    type: "InventoryReplacement",
    detail: { $id: "2", message: "Replace this item" },
  });

  assert.deepEqual(result, {
    type: "InventoryReplacement",
    detail: { message: "Replace this item" },
  });
});

test("unwrap normalizes .NET $values collections", () => {
  const result = unwrap({
    $id: "1",
    $values: [
      { $id: "2", type: "InventoryReplacement", message: "Replace this item" },
    ],
  });

  assert.deepEqual(result, [
    { type: "InventoryReplacement", message: "Replace this item" },
  ]);
});

test("deRef returns the same normalized result on repeated calls", () => {
  const input = { $id: "1", message: "Repeated alert" };

  assert.deepEqual(deRef(input), { message: "Repeated alert" });
  assert.deepEqual(deRef(input), { message: "Repeated alert" });
});

test("deRef safely preserves cycles in in-memory objects", () => {
  const input: Record<string, unknown> = { $id: "1", message: "Cyclic alert" };
  input.self = input;

  const result = deRef(input);

  assert.equal(result.self, result);
});
