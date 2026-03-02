import { WorkCenter, WorkOrder } from "../reflow/types";

export const workCenters: WorkCenter[] = [
  {
    id: "WC1",
    name: "Extrusion Line 1",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: []
  }
];

export const workOrders: WorkOrder[] = [
  {
    id: "A",
    workOrderNumber: "WO-A",
    manufacturingOrderId: "MO1",
    workCenterId: "WC1",
    start: new Date("2026-03-02T16:00:00"),
    end: new Date("2026-03-02T18:00:00"),
    durationMinutes: 120,
    isMaintenance: false,
    dependsOn: []
  }
];