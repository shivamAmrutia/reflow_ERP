import { reflowSchedule } from "./reflow/reflow.service";
// import rawData from "./data/raw-data.json";
import delayCascade from "./data/delay-cascade.json";
import shiftMaintenance from "./data/shift-maintenance.json";

// const result = reflowSchedule(rawData);

console.log("=== Delay Cascade ===");
console.dir(reflowSchedule(delayCascade), { depth: null });

console.log("\n=== Shift + Maintenance ===");
console.dir(reflowSchedule(shiftMaintenance), { depth: null });