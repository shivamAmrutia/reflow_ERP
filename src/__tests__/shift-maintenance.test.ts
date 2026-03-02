import { reflowSchedule } from "../reflow/reflow.service";
import shiftMaintenance from "../data/shift-maintenance.json";

describe("Shift + Maintenance Scenario", () => {

  it("should pause across shift and skip maintenance", () => {

    const result = reflowSchedule(shiftMaintenance as any);

    const D = result.updatedWorkOrders[0];

    expect(D.start.toISOString())
      .toBe("2026-03-02T16:00:00.000Z");

    expect(D.end.toISOString())
      .toBe("2026-03-03T14:00:00.000Z");

    expect(result.changes.length).toBe(1);
    expect(result.changes[0].endDeltaMinutes).toBeGreaterThan(0);
  });

});