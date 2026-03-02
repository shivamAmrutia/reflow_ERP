import { reflowSchedule } from "../reflow/reflow.service";
import delayCascade from "../data/delay-cascade.json";

describe("Delay Cascade Scenario", () => {

  it("should cascade delays through dependencies", () => {

    const result = reflowSchedule(delayCascade as any);

    const A = result.updatedWorkOrders.find(w => w.id === "A");
    const B = result.updatedWorkOrders.find(w => w.id === "B");
    const C = result.updatedWorkOrders.find(w => w.id === "C");

    expect(A?.start.toISOString()).toBe("2026-03-02T08:00:00.000Z");
    expect(A?.end.toISOString()).toBe("2026-03-02T12:00:00.000Z");

    expect(B?.start.toISOString()).toBe("2026-03-02T12:00:00.000Z");
    expect(C?.start.toISOString()).toBe("2026-03-02T14:00:00.000Z");

    expect(result.changes.length).toBe(3);
  });

});