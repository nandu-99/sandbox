"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { runSmokeVerification } from "@/lib/api-client";

export function VerificationActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setPending(true);
    setError(null);

    try {
      await runSmokeVerification(requestId);
      router.refresh();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Smoke login could not be completed.",
      );
      setPending(false);
    }
  }

  return (
    <div className="verification-callout">
      <div>
        <span className="section-label">Independent verification</span>
        <h2>Run smoke login</h2>
        <p>Uses a synthetic identity reference. No password, OTP, or CAPTCHA is involved.</p>
      </div>
      <button className="button" type="button" onClick={handleVerify} disabled={pending}>
        {pending ? "Running checks…" : "Run smoke login"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
