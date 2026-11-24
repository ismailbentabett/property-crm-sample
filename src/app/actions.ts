"use server";

import { revalidatePath } from "next/cache";
import { store } from "@/lib/store";
import type { Stage, Verdict } from "@/lib/types";

export async function runAgentAction(formData: FormData) {
  const id = String(formData.get("id"));
  await store.runAgent(id);
  revalidatePath("/");
  revalidatePath(`/property/${id}`);
}

export async function moveStageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as Stage;
  store.moveStage(id, to);
  revalidatePath("/");
  revalidatePath(`/property/${id}`);
}

export async function overrideAction(formData: FormData) {
  const id = String(formData.get("id"));
  const verdict = String(formData.get("verdict")) as Verdict;
  const note = String(formData.get("note") ?? "");
  store.override(id, verdict, note);
  revalidatePath("/");
  revalidatePath(`/property/${id}`);
}
