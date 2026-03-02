import {
    WorkOrder,
    WorkCenter,
    ReflowResult,
    ScheduleChange
  } from "./types";
  
  export function reflowSchedule(
    workOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): ReflowResult {
  
    console.log("Starting reflow...");
  
    const changes: ScheduleChange[] = [];
  
    // STEP 1 — clone orders (avoid mutation)
    const updatedOrders = workOrders.map(o => ({ ...o }));
  
    // STEP 2 — scheduling logic (coming next)
    // TODO: dependency resolution
    // TODO: shift handling
    // TODO: conflict resolution
  
    return {
      schedule: updatedOrders,
      changes
    };
  }