import { reflowSchedule } from "../reflow/reflow.service";
import complex from "../data/complex-multi-constraint.json";

describe("Complex Multi-Constraint Scenario", () => {

  it("should handle dependencies, conflicts, shifts, and maintenance together", () => {

    const result = reflowSchedule(complex as any);
    const schedule = result.updatedWorkOrders;

    const A = schedule.find(w => w.id === "A")!;
    const D = schedule.find(w => w.id === "D")!;
    const B = schedule.find(w => w.id === "B")!;
    const C = schedule.find(w => w.id === "C")!;

    // Exact Start/End Times

    // A runs 6 hours on Monday
    expect(A.start.toISOString())
      .toBe("2026-03-02T08:00:00.000Z");
    expect(A.end.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");

    // D must wait for A (same work center)
    expect(D.start.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");
    expect(D.end.toISOString())
      .toBe("2026-03-02T17:00:00.000Z");

    // B depends on A but runs on WC2
    expect(B.start.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");
    expect(B.end.toISOString())
      .toBe("2026-03-02T17:00:00.000Z");

    // C depends on B and D (multi-parent) and spans maintenance
    expect(C.start.toISOString())
      .toBe("2026-03-03T08:00:00.000Z");
    expect(C.end.toISOString())
      .toBe("2026-03-03T14:00:00.000Z");

    
    // Dependency Integrity
    expect(A.end.getTime()).toBeLessThanOrEqual(B.start.getTime());
    expect(B.end.getTime()).toBeLessThanOrEqual(C.start.getTime());
    expect(D.end.getTime()).toBeLessThanOrEqual(C.start.getTime());

    // No Overlaps On WC1
    expect(D.start.getTime()).toBeGreaterThanOrEqual(A.end.getTime());

    
    // Duration Integrity
    const durationMinutes = (wo: any) =>
      (wo.end.getTime() - wo.start.getTime()) / 60000;

    expect(durationMinutes(A)).toBe(360);
    expect(durationMinutes(D)).toBe(180);
    expect(durationMinutes(B)).toBe(180);
    expect(durationMinutes(C)).toBeGreaterThan(240); 
    // elapsed > working because maintenance pause

    
    // Change Tracking
    expect(result.changes.length).toBeGreaterThan(0);

    // At least A, D, B, C should have changes
    const changedIds = result.changes.map(c => c.workOrderId);
    expect(changedIds).toContain("A");
    expect(changedIds).toContain("B");
    expect(changedIds).toContain("C");
    expect(changedIds).toContain("D");

  });

});