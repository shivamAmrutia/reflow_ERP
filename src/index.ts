import { reflowSchedule } from "./reflow/reflow.service";
// import rawData from "./data/raw-data.json";
import impossible from "./data/impossible-schedule.json";

// const result = reflowSchedule(rawData);

console.log("\n=== Impossible Schedule ===");
console.dir(reflowSchedule(impossible), { depth: null });