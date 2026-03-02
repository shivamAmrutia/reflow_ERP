import { reflowSchedule } from "./reflow/reflow.service";
// import rawData from "./data/raw-data.json";
import complex from "./data/complex-multi-constraint.json";

// const result = reflowSchedule(rawData);

console.dir(reflowSchedule(complex), { depth: null });