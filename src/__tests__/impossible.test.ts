import { reflowSchedule } from "../reflow/reflow.service";
import impossible from "../data/impossible-schedule.json";

describe("Impossible Schedule", () => {

  it("should throw error when no feasible slot exists", () => {

    expect(() =>
      reflowSchedule(impossible as any)
    ).toThrow();
  });

});