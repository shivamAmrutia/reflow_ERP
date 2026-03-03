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

  //Seed timelines with fixed maintenance work orders
  for (const order of ordered) {
    if (!order.isMaintenance) continue;

    const existing =
      timelines.get(order.workCenterId) ?? [];

    existing.push({
      workOrderId: order.id,
      start: order.start,
      end: order.end
    });

    timelines.set(order.workCenterId, existing);
  }

  // 5) CORE SCHEDULING LOOP
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
    const blockingParentIds: string[] = [];

    for (const parentId of order.dependsOn) {
      const parent = workOrderMap.get(parentId);
      if (!parent) continue;

      if (parent.end > earliestStart) {
        earliestStart = parent.end;
        blockingParentIds.push(parentId);
      }
    }

    // ---- work center conflict constraint with TRUE partial segmentation ----
    // Treat already-scheduled blocks on this work center as additional
    // "maintenance windows" so the job can consume *all* free gaps
    // (possibly over multiple disjoint segments) without overlapping
    // existing work.
    const blockingWindows = timeline.map(block => ({
      start: block.start,
      end: block.end
    }));

    const effectiveWorkCenter: WorkCenter = {
      ...wc,
      maintenanceWindows: [
        ...wc.maintenanceWindows,
        ...blockingWindows
      ]
    };

    // Align to first free working minute that is:
    // - inside a shift
    // - outside maintenance windows
    // - outside any existing scheduled block
    const start = addWorkingMinutes(
      earliestStart,
      0,
      effectiveWorkCenter
    );

    // Then accumulate working minutes, automatically pausing:
    // - outside shifts
    // - during maintenance windows
    // - during already-scheduled blocks (treated as maintenance)
    const end = addWorkingMinutes(
      start,
      order.durationMinutes,
      effectiveWorkCenter
    );

    // ---- compute deltas ----
    const startDeltaMinutes =
      (start.getTime() - originalStart.getTime()) / 60000;

    const endDeltaMinutes =
      (end.getTime() - originalEnd.getTime()) / 60000;

    const reasons: string[] = [];

    if (blockingParentIds.length > 0) {
      reasons.push(`Waiting for parent(s): ${blockingParentIds.join(", ")}`);
    }

    if (start.getTime() > earliestStart.getTime()) {
      reasons.push("Scheduled after prior work on same work center");
    }

    if (endDeltaMinutes > startDeltaMinutes) {
      reasons.push("End extended: work spans shift boundary or maintenance window");
    }

    if (startDeltaMinutes !== 0 || endDeltaMinutes !== 0) {
      changes.push({
        workOrderId: order.id,
        workOrderNumber: order.workOrderNumber,
        oldStart: originalStart,
        newStart: start,
        oldEnd: originalEnd,
        newEnd: end,
        startDeltaMinutes,
        endDeltaMinutes,
        reason: reasons.join(". ") || "Duration recalculation"
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

  const explanation = buildExplanation(changes);

  return {
    updatedWorkOrders: ordered,
    changes,
    explanation
  };
}

/** Format date for explanation (UTC, compact). */
function formatDT(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Build a clear, multi-line explanation of what changed and why.
 */
function buildExplanation(changes: ScheduleChange[]): string {
  if (changes.length === 0) {
    return "No changes required. Schedule already respects all constraints.";
  }

  const lines: string[] = [
    `Reflow complete. ${changes.length} work order(s) rescheduled.`,
    ""
  ];

  for (const c of changes) {
    const startMove = c.startDeltaMinutes !== 0
      ? `start ${formatDT(c.oldStart)} → ${formatDT(c.newStart)} (${c.startDeltaMinutes > 0 ? "+" : ""}${c.startDeltaMinutes} min)`
      : "start unchanged";
    const endMove = c.endDeltaMinutes !== 0
      ? `end ${formatDT(c.oldEnd)} → ${formatDT(c.newEnd)} (${c.endDeltaMinutes > 0 ? "+" : ""}${c.endDeltaMinutes} min)`
      : "end unchanged";
    lines.push(`• ${c.workOrderNumber} (${c.workOrderId}): ${startMove}; ${endMove}.`);
    lines.push(`  Reason: ${c.reason}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
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

// NOTE: With true partial segmentation, we no longer
// require a single continuous free block on the work
// center. Instead, we model existing blocks as extra
// maintenance windows and rely on addWorkingMinutes
// to hop across them while accumulating working time.