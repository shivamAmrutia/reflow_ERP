import { reflowSchedule } from "./reflow/reflow.service";
import data from "./data/shift-maintenance.json";

const result = reflowSchedule(data as any);

console.log(result.updatedWorkOrders);
console.log(result.changes);
console.log(result.explanation)