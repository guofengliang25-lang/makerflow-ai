import { reconcileCreativePlanState } from "./creative-plan-state.js";
import { createClarificationLedger } from "./clarification-ledger.js";
export function migratePersistedState(saved={}){const next=structuredClone(saved);next.version=3;next.clarificationLedger=next.clarificationLedger||createClarificationLedger();next.creativePlan=reconcileCreativePlanState(next.creativePlan||{});return next;}
