"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getOfficialTestRuns,
  type OfficialTestRun,
  runOfficialTestCases,
} from "@/lib/api-client";

export function TestCaseDashboard() {
  const [runs, setRuns] = useState<OfficialTestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOfficialTestRuns(controller.signal)
      .then(setRuns)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Test runs could not be loaded.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const newRuns = await runOfficialTestCases();
      setRuns((current) => [...current, ...newRuns]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Official scenarios could not run.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <div className="source-state" role="status">Loading official test evidence…</div>;
  }

  return (
    <>
      <div className="test-run-toolbar">
        <p>Each run uses synthetic data and persists its input, expected result, actual result, and evidence.</p>
        <button className="button" type="button" onClick={handleRun} disabled={running}>
          {running ? "Running TC1-TC4…" : "Run all official tests"}
        </button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {runs.length === 0 ? (
        <div className="empty-state test-empty">
          <div className="empty-index" aria-hidden="true">04</div>
          <div><h3>No test runs yet</h3><p>Run the four official scenarios when you are ready to capture evidence.</p></div>
        </div>
      ) : (
        <div className="test-run-list">
          {runs.slice().reverse().map((run) => (
            <article key={run.id}>
              <div className="test-run-heading">
                <span>{run.testCase}</span>
                <strong className={run.status === "PASSED" ? "test-pass" : "test-fail"}>{run.status}</strong>
              </div>
              <dl>
                <div><dt>Expected</dt><dd>{run.expectedResult}</dd></div>
                <div><dt>Actual</dt><dd>{run.actualResult}</dd></div>
              </dl>
              <div className="test-run-footer">
                <code>{run.id}</code>
                {typeof run.evidence.evidence.requestId === "string" ? (
                  <Link className="text-link" href={`/requests/${run.evidence.evidence.requestId}`}>View request</Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
