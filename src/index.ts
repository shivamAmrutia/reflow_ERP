import { reflowSchedule } from "./reflow/reflow.service";
import { workCenters, workOrders } from "./data/sample-data";

console.log("ERP Reflow Scheduler");

const result = reflowSchedule(workOrders, workCenters);

console.log("\nFinal Schedule:");
console.log(result.schedule);

console.log("\nChanges:");
console.log(result.changes);