import { reflowSchedule } from "./reflow/reflow.service";
import rawData from "./data/raw-data.json";

const result = reflowSchedule(rawData);

console.log("\n✅ FINAL SCHEDULE");
console.dir(result.schedule, { depth: null });

console.log("\n🔁 CHANGES");
console.dir(result.changes, { depth: null });