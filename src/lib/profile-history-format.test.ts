import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHistoryDate, formatHistoryGpa, formatHistoryPeriod } from "./profile-history-format";

test("history dates use deterministic month labels and reject invalid calendar values", () => {
  assert.equal(formatHistoryDate("2024-01-01"), "Jan 2024");
  assert.equal(formatHistoryDate("2024-02-29"), "Feb 2024");
  assert.equal(formatHistoryDate("2100-12-31"), "Dec 2100");
  for (const value of [null, "", "2025-02-29", "2024-02-30", "2024-13-01", "2024-00-01", "2024-01-00", "2024-01-01T00:00:00Z", "1899-12-31", "2101-01-01"]) {
    assert.equal(formatHistoryDate(value), "Date not provided");
  }
});

test("history periods distinguish unknown dates from an explicitly current record", () => {
  assert.equal(formatHistoryPeriod({ startDate: null, endDate: null, isCurrent: false }), "Dates not provided");
  assert.equal(formatHistoryPeriod({ startDate: "2022-09-01", endDate: null, isCurrent: false }), "Sep 2022 – End date not provided");
  assert.equal(formatHistoryPeriod({ startDate: null, endDate: "2025-06-30", isCurrent: false }), "Start date not provided – Jun 2025");
  assert.equal(formatHistoryPeriod({ startDate: "2022-09-01", endDate: null, isCurrent: true }), "Sep 2022 – Present");
  assert.equal(formatHistoryPeriod({ startDate: null, endDate: null, isCurrent: true }), "Start date not provided – Present");
  assert.equal(formatHistoryPeriod({ startDate: "2021-01-01", endDate: "2023-12-31", isCurrent: false }), "Jan 2021 – Dec 2023");
});

test("GPA display preserves the explicit scale and never invents or converts a value", () => {
  assert.equal(formatHistoryGpa({ gpa: 3.75, gpaScale: 4 }), "GPA: 3.75 / 4");
  assert.equal(formatHistoryGpa({ gpa: 82, gpaScale: 100 }), "GPA: 82 / 100");
  assert.equal(formatHistoryGpa({ gpa: 0, gpaScale: 4 }), "GPA: 0 / 4");
  assert.equal(formatHistoryGpa({ gpa: 3.875, gpaScale: 4 }), "GPA: 3.875 / 4");
  for (const value of [
    { gpa: null, gpaScale: null }, { gpa: 3, gpaScale: null }, { gpa: null, gpaScale: 4 },
    { gpa: 0, gpaScale: 0 }, { gpa: 5, gpaScale: 4 }, { gpa: -1, gpaScale: 4 },
    { gpa: Number.NaN, gpaScale: 4 }, { gpa: 3, gpaScale: Number.POSITIVE_INFINITY }, { gpa: 3, gpaScale: 101 }
  ]) assert.equal(formatHistoryGpa(value), null);
});
