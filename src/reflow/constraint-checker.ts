import { WorkOrder } from "./types";

/**
 * Validates final schedule.
 * Throws error if any constraint is violated.
 */
export function validateSchedule(workOrders: WorkOrder[]): boolean {

  console.log("Validating schedule...");

  // Basic sanity checks
  for (const wo of workOrders) {
    if (wo.end <= wo.start) {
      throw new Error(
        `Invalid interval for ${wo.id}: end <= start`
      );
    }
  }

  // Dependency validation
  const map = new Map(workOrders.map(w => [w.id, w]));

  for (const wo of workOrders) {
    for (const parentId of wo.dependsOn) {
      const parent = map.get(parentId);
      if (!parent) continue;

      if (parent.end > wo.start) {
        throw new Error(
          `Dependency violation: ${parent.id} ends after ${wo.id} starts`
        );
      }
    }
  }

  // Work center overlap validation
  const byWorkCenter = new Map<string, WorkOrder[]>();

  for (const wo of workOrders) {
    const arr = byWorkCenter.get(wo.workCenterId) ?? [];
    arr.push(wo);
    byWorkCenter.set(wo.workCenterId, arr);
  }

  for (const [wcId, orders] of byWorkCenter.entries()) {

    // sort by start time
    orders.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (let i = 1; i < orders.length; i++) {
      const prev = orders[i - 1];
      const curr = orders[i];

      if (curr.start < prev.end) {
        throw new Error(
          `Overlap detected on work center ${wcId}: ${prev.id} overlaps ${curr.id}`
        );
      }
    }
  }

  return true;
}