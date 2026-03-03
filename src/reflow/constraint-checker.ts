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

  return true;
}