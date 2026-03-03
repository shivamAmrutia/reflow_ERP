import { reflowSchedule } from "./reflow/reflow.service";
// import rawData from "./data/raw-data.json";
import shift from "./data/delay-cascade.json";

// const result = reflowSchedule(rawData);

console.dir(reflowSchedule(shift), { depth: null });