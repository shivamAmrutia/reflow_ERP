import { reflowSchedule } from "../reflow/reflow.service";
import maintenanceScenario from "../data/maintenance-work-orders.json";

describe("Maintenance Work Orders", () => {

  it("should keep maintenance fixed and segment production around it", () => {

    const result = reflowSchedule(maintenanceScenario as any);
    const schedule = result.updatedWorkOrders;

    const M1 = schedule.find(w => w.id === "M1")!;
    const P1 = schedule.find(w => w.id === "P1")!;

    // Maintenance work order must not move
    expect(M1.start.toISOString())
      .toBe("2026-03-02T09:00:00.000Z");
    expect(M1.end.toISOString())
      .toBe("2026-03-02T11:00:00.000Z");

    // Production order should use free time
    // before and after maintenance on the
    // same day (true partial segmentation).
    expect(P1.start.toISOString())
      .toBe("2026-03-02T08:00:00.000Z");
    expect(P1.end.toISOString())
      .toBe("2026-03-02T14:00:00.000Z");

    // Working duration requirement is preserved
    expect(P1.durationMinutes).toBe(240);

    // Ensure there is at least one recorded change
    expect(result.changes.length).toBeGreaterThan(0);
    const changedIds = result.changes.map(c => c.workOrderId);
    expect(changedIds).toContain("P1");
    expect(changedIds).not.toContain("M1");
  });

});

