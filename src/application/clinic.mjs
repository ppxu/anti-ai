import { deriveClinicStudyHistory } from "../clinic-studies.mjs";
import { executeContainmentMutation } from "./action-execution.mjs";

async function executeClinicStudyStart(options, session = {}) {
  const selected = await executeContainmentMutation(
    "start_study",
    {
      date: options.date,
      lang: options.lang ?? "zh",
      choice: options.protocol,
    },
    session,
  );
  if (selected.status !== "completed") {
    return {
      status: "unavailable",
      reason: selected.reason,
      state: selected.state,
    };
  }
  return {
    status: "completed",
    result: deriveClinicStudyHistory(selected.state, options.date),
    state: selected.state,
  };
}

export { executeClinicStudyStart };
