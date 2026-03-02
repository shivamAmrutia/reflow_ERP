import { reflowSchedule } from "../reflow/reflow.service";

describe("Dependency Cycle", () => {

  it("should detect circular dependencies", () => {

    const cycleData = [
      {
        docId: "WC1",
        docType: "workCenter",
        data: {
          name: "WC",
          shifts: [
            { dayOfWeek: 1, startHour: 8, endHour: 17 }
          ],
          maintenanceWindows: []
        }
      },
      {
        docId: "A",
        docType: "workOrder",
        data: {
          workOrderNumber: "A",
          manufacturingOrderId: "MO1",
          workCenterId: "WC1",
          startDate: "2026-03-02T08:00:00Z",
          endDate: "2026-03-02T09:00:00Z",
          durationMinutes: 60,
          isMaintenance: false,
          dependsOnWorkOrderIds: ["B"]
        }
      },
      {
        docId: "B",
        docType: "workOrder",
        data: {
          workOrderNumber: "B",
          manufacturingOrderId: "MO1",
          workCenterId: "WC1",
          startDate: "2026-03-02T09:00:00Z",
          endDate: "2026-03-02T10:00:00Z",
          durationMinutes: 60,
          isMaintenance: false,
          dependsOnWorkOrderIds: ["A"]
        }
      }
    ];

    expect(() =>
      reflowSchedule(cycleData as any)
    ).toThrow("Dependency cycle detected");
  });

});