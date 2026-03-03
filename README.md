## Setup Instructions

- **Prerequisites**
  - Node.js **v18+** (recommended)
  - npm **v8+**

Check versions:

```bash
node -v
npm -v
```

- **Install dependencies**

From the project root:

```bash
npm install
```

---

## How to Run the Code

### Run the reflow on sample data

The simplest way to exercise the algorithm is via the Jest scenarios, which call the public `reflowSchedule` API with different JSON datasets:

```bash
npm test
```

This runs tests under `src/__tests__`, using data from `src/data/*.json`. Each test invokes:

```ts
import { reflowSchedule } from "../reflow/reflow.service";
import data from "../data/your-scenario.json";

const result = reflowSchedule(data as any);
```

### Run manually from a script

You can also call the service from `src/index.ts` (or another script):

```ts
import { reflowSchedule } from "./reflow/reflow.service";
import rawData from "./data/raw-data.json";

const result = reflowSchedule(rawData as any);

console.log(result.updatedWorkOrders);
console.log(result.changes);
```

Then run with:

```bash
npx ts-node src/index.ts
```

---

## High-Level Algorithm Approach

- **1. Parse raw ERP documents**
  - `reflowSchedule` receives an array of generic ERP documents (`RawDocument`).
  - `parseDocuments` converts them into typed `WorkOrder` and `WorkCenter` objects:
    - Work orders: start, end, `durationMinutes`, `isMaintenance`, `dependsOn`.
    - Work centers: shifts and maintenance windows.

- **2. Topological sort (dependencies)**
  - A **topological sort** over the work-order graph ensures all parents are scheduled before their children.
  - Cycles are detected and cause the reflow to throw (see `cycle.test.ts`).

- **3. Seed work-center timelines**
  - For each work center, we keep a **timeline** of scheduled blocks.
  - Maintenance work orders (`isMaintenance: true`) are seeded into these timelines first and are never moved.

- **4. Core scheduling loop**
  - Iterate over work orders in topological order, skipping maintenance jobs (already fixed).
  - For each order:
    - Compute `earliestStart` as the max of:
      - Original start
      - All parent `end` times.
    - Build an **effective work center** that merges:
      - Static maintenance windows from the work center.
      - Already-scheduled work orders on that center, treated as extra “maintenance” windows.
    - Use `addWorkingMinutes` (in `date-utils`) twice:
      - First to align `start` to the first valid working minute:
        - Inside a shift
        - Outside all maintenance and previously scheduled blocks.
      - Then to compute `end` by accumulating `durationMinutes` of **working** time, automatically pausing:
        - Outside shifts
        - During maintenance windows
        - During other work orders on the same center.
    - Record any changes in a `ScheduleChange` object (old/new start/end, deltas, reasons).

- **5. Validation**
  - `validateSchedule` enforces:
    - **Interval sanity**: `end > start` for every work order.
    - **Dependency correctness**: every parent’s `end` is `<=` the child’s `start`.
  - Non-overlap of actual working time on a work center is guaranteed by the way `addWorkingMinutes` is applied against timelines and maintenance windows (true partial segmentation).

This design keeps the core model simple (start, end, duration per work order) while still supporting complex real-world behavior like multi-parent dependencies, shift calendars, maintenance, and fragmented execution of a single job over several disjoint working periods.

