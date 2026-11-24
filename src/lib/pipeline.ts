import type { Stage } from "./types";

const ALLOWED: Record<Stage, Stage[]> = {
  new: ["qualified", "lost"],
  qualified: ["contacted", "lost"],
  contacted: ["inspecting", "lost"],
  inspecting: ["offer", "lost"],
  offer: ["won", "lost"],
  won: [],
  lost: ["new"], // a lost lead can be reopened
};

export function canMove(from: Stage, to: Stage): boolean {
  return ALLOWED[from].includes(to);
}

export function nextStages(from: Stage): Stage[] {
  return ALLOWED[from];
}

export function assertMove(from: Stage, to: Stage): void {
  if (!canMove(from, to)) {
    throw new Error(`Cannot move a property from "${from}" to "${to}"`);
  }
}
