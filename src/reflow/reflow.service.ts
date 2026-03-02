import {
  RawDocument,
  WorkOrder,
  WorkCenter,
  ScheduleChange,
  ReflowResult
} from "./types";

import { addWorkingMinutes } from "../utils/date-utils";
import { validateSchedule } from "./constraint-checker";

/**
   * Public entrypoint.
 */
export function reflowSchedule(
  rawDocs: RawDocument[]
): ReflowResult {

  console.log("🔄 Starting ERP Reflow...");

    // 1) Parse documents.
  const { workOrders, workCenters } = parseDocuments(rawDocs);

    // 2) Build indexes.
  const workCenterMap = new Map(
    workCenters.map(wc => [wc.id, wc])
  );

  const workOrderMap = new Map(
    workOrders.map(wo => [wo.id, wo])
  );

    // 3) Sort by dependency order.
  const ordered = topologicalSort(workOrders);

    // 4) Work center timelines.
  const timelines = new Map<
    string,
    { start: Date; end: Date; workOrderId: string }[]
  >();

  const changes: ScheduleChange[] = [];

    // 5) Core scheduling loop.
  for (const order of ordered) {

    if (order.isMaintenance) continue;

    const wc = workCenterMap.get(order.workCenterId);
    if (!wc) throw new Error("Missing work center");

    const timeline =
      timelines.get(order.workCenterId) ?? [];

    // ---- store original values BEFORE mutation ----
    const originalStart = new Date(order.start);
    const originalEnd = new Date(order.end);

    // ---- dependency constraint ----
    let earliestStart = order.start;

    for (const parentId of order.dependsOn) {
      const parent = workOrderMap.get(parentId);
      if (!parent) continue;

      if (parent.end > earliestStart) {
        earliestStart = parent.end;
      }
    }

    // ---- work center conflict constraint ----
    const start = findNextAvailableSlot(
      earliestStart,
      order.durationMinutes,
      wc,
      timeline
    );

    const end = addWorkingMinutes(
      start,
      order.durationMinutes,
      wc
    );

    // ---- compute deltas ----
    const startDeltaMinutes =
      (start.getTime() - originalStart.getTime()) / 60000;

    const endDeltaMinutes =
      (end.getTime() - originalEnd.getTime()) / 60000;

    let reasons: string[] = [];

    if (earliestStart.getTime() > originalStart.getTime()) {
      reasons.push("Dependency constraint");
    }

    if (start.getTime() > earliestStart.getTime()) {
      reasons.push("Work center conflict");
    }

    if (endDeltaMinutes > startDeltaMinutes) {
      reasons.push("Shift boundary or maintenance");
    }

    if (startDeltaMinutes !== 0 || endDeltaMinutes !== 0) {
      changes.push({
        workOrderId: order.id,
        oldStart: originalStart,
        newStart: start,
        oldEnd: originalEnd,
        newEnd: end,
        startDeltaMinutes,
        endDeltaMinutes,
        reason: reasons.join(", ") || "Duration recalculation"
      });
    }

    // ---- update order ----
    order.start = start;
    order.end = end;

    // ---- update timeline ----
    timeline.push({
      workOrderId: order.id,
      start,
      end
    });

    timelines.set(order.workCenterId, timeline);
  }

    // 6) Validate schedule.
  validateSchedule(ordered);

  return {
    updatedWorkOrders: ordered,
    changes
  };
}

function parseDocuments(rawDocs: RawDocument[]) {

  const workOrders: WorkOrder[] = [];
  const workCenters: WorkCenter[] = [];

  for (const doc of rawDocs) {

    if (doc.docType === "workOrder") {
      workOrders.push({
        id: doc.docId,
        workOrderNumber: doc.data.workOrderNumber,
        manufacturingOrderId: doc.data.manufacturingOrderId,
        workCenterId: doc.data.workCenterId,
        start: new Date(doc.data.startDate),
        end: new Date(doc.data.endDate),
        durationMinutes: doc.data.durationMinutes,
        isMaintenance: doc.data.isMaintenance,
        dependsOn: doc.data.dependsOnWorkOrderIds ?? []
      });
    }

    if (doc.docType === "workCenter") {
      workCenters.push({
        id: doc.docId,
        name: doc.data.name,
        shifts: doc.data.shifts,
        maintenanceWindows:
          doc.data.maintenanceWindows.map((m: any) => ({
            start: new Date(m.startDate),
            end: new Date(m.endDate)
          }))
      });
    }
  }

  return { workOrders, workCenters };
}

function topologicalSort(workOrders: WorkOrder[]): WorkOrder[] {

  const map = new Map(workOrders.map(w => [w.id, w]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: WorkOrder[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id))
      throw new Error("Dependency cycle detected");

    visiting.add(id);

    const wo = map.get(id);
    if (!wo) return;

    for (const dep of wo.dependsOn) {
      visit(dep);
    }

    visiting.delete(id);
    visited.add(id);
    result.push(wo);
  }

  for (const wo of workOrders) {
    visit(wo.id);
  }

  return result;
}

function findNextAvailableSlot(
  earliestStart: Date,
  duration: number,
  wc: WorkCenter,
  timeline: { start: Date; end: Date }[]
): Date {

  // Align initial candidate to valid working time
  let candidate = addWorkingMinutes(
    new Date(earliestStart),
    0,
    wc
  );

  while (true) {

    const candidateEnd = addWorkingMinutes(
      candidate,
      duration,
      wc
    );

    const conflict = timeline.find(
      block =>
        candidate < block.end &&
        candidateEnd > block.start
    );

    if (!conflict) return candidate;

    // Move to end of conflict and realign
    candidate = addWorkingMinutes(
      conflict.end,
      0,
      wc
    );
  }
}