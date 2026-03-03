import { reflowSchedule } from "./reflow/reflow.service";
import data from "./data/delay-cascade.json";

console.dir(reflowSchedule(data), { depth: null });