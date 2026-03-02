import { reflowSchedule } from "./reflow/reflow.service";
// import rawData from "./data/raw-data.json";
import delay from "./data/delay-cascade.json";

// const result = reflowSchedule(rawData);

console.log("\n=== delay cascade Schedule ===");
console.dir(reflowSchedule(delay), { depth: null });