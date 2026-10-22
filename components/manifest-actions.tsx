"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { generateManifest } from "@/lib/api-client";

export function ManifestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);

    try {
      await generateManifest(requestId);
      router.refresh();
    } catch (manifestError) {
      setError(
        manifestError instanceof Error
          ? manifestError.message
          : "The setup manifest could not be generated.",
      );
      setPending(false);
    }
  }

  return (
    <div className="manifest-callout">
      <div>
        <span className="section-label">Final result</span>
        <h2>Generate setup manifest</h2>
        <p>The server selects safe fields and requires a passing secret scan before storage.</p>
      </div>
      <button className="button" type="button" onClick={handleGenerate} disabled={pending}>
        {pending ? "Scanning manifest…" : "Generate manifest"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
