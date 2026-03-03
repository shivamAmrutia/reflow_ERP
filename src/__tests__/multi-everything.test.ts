import { reflowSchedule } from "../reflow/reflow.service";
import multiEverything from "../data/multi-everything.json";

describe("Multi-Order, Multi-Constraint Scenario", () => {

  it("should handle multiple MOs, dependencies, maintenance windows, and maintenance work orders with splits", () => {

    const result = reflowSchedule(multiEverything as any);
    const schedule = result.updatedWorkOrders;

    const A1 = schedule.find(w => w.id === "A1")!;
    const M1 = schedule.find(w => w.id === "M1")!;
    const B1 = schedule.find(w => w.id === "B1")!;
    const C1 = schedule.find(w => w.id === "C1")!;
    const E2 = schedule.find(w => w.id === "E2")!;
    const F2 = schedule.find(w => w.id === "F2")!;

    // --- Maintenance work order stays fixed ---
    expect(M1.start.toISOString())
      .toBe("2026-03-02T11:00:00.000Z");
    expect(M1.end.toISOString())
      .toBe("2026-03-02T13:00:00.000Z");

    // --- MO1 chain: A1 -> B1 -> C1 (multi-parent on C1) ---

    // A1: 3h on WCX, Monday morning
    expect(A1.start.toISOString())
      .toBe("2026-03-02T08:00:00.000Z");
    expect(A1.end.toISOString())
      .toBe("2026-03-02T11:00:00.000Z");

    // B1 depends on A1, but is on WCY
    expect(B1.start.toISOString())
      .toBe("2026-03-02T11:00:00.000Z");
    expect(B1.end.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");
    expect(A1.end.getTime()).toBeLessThanOrEqual(B1.start.getTime());

    // C1 depends on B1 and M1, runs on WCX and must split:
    // - Mon 14:00–17:00 (3h after B1 and M1)
    // - Tue 08:00–10:00 (2h before maintenance window)
    // - Tue 12:00–13:00 (1h after maintenance window)
    //
    // Total working time = 6h (360 min), but
    // elapsed time spans both days and a WC maintenance window.
    expect(C1.start.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");
    expect(C1.end.toISOString())
      .toBe("2026-03-03T13:00:00.000Z");

    expect(B1.end.getTime()).toBeLessThanOrEqual(C1.start.getTime());
    expect(M1.end.getTime()).toBeLessThanOrEqual(C1.start.getTime());
    expect(C1.durationMinutes).toBe(360);

    // --- MO2 chain: E2 -> F2 on WCY, independent of MO1 ---
    expect(E2.start.toISOString())
      .toBe("2026-03-02T08:00:00.000Z");
    expect(F2.start.getTime()).toBeGreaterThanOrEqual(E2.end.getTime());
    expect(F2.durationMinutes).toBe(120);

    // --- Change tracking sanity ---
    expect(result.changes.length).toBeGreaterThan(0);
    const changedIds = result.changes.map(c => c.workOrderId);
    expect(changedIds).toContain("B1");
    expect(changedIds).toContain("C1");
    expect(changedIds).toContain("F2");
  });

}
)

