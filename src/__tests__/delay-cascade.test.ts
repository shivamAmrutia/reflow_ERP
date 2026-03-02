import { reflowSchedule } from "../reflow/reflow.service";
import delayCascade from "../data/delay-cascade.json";

describe("Delay Cascade Scenario", () => {

  it("should cascade delays and maintain schedule validity", () => {

    const result = reflowSchedule(delayCascade as any);

    const A = result.updatedWorkOrders.find(w => w.id === "A")!;
    const B = result.updatedWorkOrders.find(w => w.id === "B")!;
    const C = result.updatedWorkOrders.find(w => w.id === "C")!;

    // ---- Exact start times ----
    expect(A.start.toISOString())
      .toBe("2026-03-02T08:00:00.000Z");
    expect(B.start.toISOString())
      .toBe("2026-03-02T12:00:00.000Z");
    expect(C.start.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");

    // ---- Exact end times ----
    expect(A.end.toISOString())
      .toBe("2026-03-02T12:00:00.000Z");
    expect(B.end.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");
    expect(C.end.toISOString())
      .toBe("2026-03-02T16:00:00.000Z");

    // ---- Duration integrity ----
    const durationMinutes = (wo: any) =>
      (wo.end.getTime() - wo.start.getTime()) / 60000;

    expect(durationMinutes(A)).toBe(240);
    expect(durationMinutes(B)).toBe(120);
    expect(durationMinutes(C)).toBe(120);

    // ---- Dependency integrity ----
    expect(A.end.getTime()).toBeLessThanOrEqual(B.start.getTime());
    expect(B.end.getTime()).toBeLessThanOrEqual(C.start.getTime());

    // ---- No overlaps ----
    expect(B.start.getTime()).toBeGreaterThanOrEqual(A.end.getTime());
    expect(C.start.getTime()).toBeGreaterThanOrEqual(B.end.getTime());

    // ---- Change detection ----
    expect(result.changes.length).toBe(3);

  });

});