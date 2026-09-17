"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  archiveGuardianAction,
  restoreGuardianAction,
  type GuardianActionState,
} from "@/features/guardians/actions/guardian-actions";
import type { GuardianStatus } from "@/features/guardians/types/guardian";

const initialActionState: GuardianActionState = { status: "idle" };

export function GuardianLifecycleControls({ guardianId, status }: { guardianId: string; status: GuardianStatus }) {
  const action = status === "archived" ? restoreGuardianAction : archiveGuardianAction;
  const [actionState, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="guardianId" type="hidden" value={guardianId} />
      <Button disabled={pending || actionState.status === "success"} loading={pending} type="submit" variant="secondary">
        {pending ? "Saving..." : status === "archived" ? "Restore Guardian" : "Archive Guardian"}
      </Button>
      {actionState.message ? (
        <p className={actionState.status === "error" ? "text-xs text-danger" : "text-xs text-emerald-700 dark:text-emerald-300"}>
          {actionState.message}
        </p>
      ) : null}
    </form>
  );
}
