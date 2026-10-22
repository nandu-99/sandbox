"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { executeSetup } from "@/lib/api-client";

type ExecutionActionsProps = {
  requestId: string;
  retry?: boolean;
};

export function ExecutionActions({ requestId, retry = false }: ExecutionActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const result = await executeSetup(requestId);
      if (result.idempotentReplay) {
        setMessage("Original execution returned. No sandbox or seed data was duplicated.");
        setPending(false);
      } else {
        router.refresh();
      }
    } catch (executionError) {
      setError(
        executionError instanceof Error
          ? executionError.message
          : "The approved setup could not be executed.",
      );
      setPending(false);
    }
  }

  return (
    <div className={retry ? "execution-retry" : "execution-callout"}>
      {!retry ? (
        <div>
          <span className="section-label">Approved action</span>
          <h2>Execute the mock setup</h2>
          <p>The API will recheck the locked plan before creating or reusing anything.</p>
        </div>
      ) : null}
      <button className={retry ? "button button-secondary button-small" : "button"} type="button" onClick={handleExecute} disabled={pending}>
        {pending ? "Executing…" : retry ? "Retry safely" : "Execute approved plan"}
      </button>
      {message ? <p className="execution-message" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
