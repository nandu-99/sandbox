"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ApiRequestError,
  createSetupRequest,
  type SetupSources,
  getSetupSources,
} from "@/lib/api-client";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sources: SetupSources };

export function SetupRequestForm() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [templateId, setTemplateId] = useState("");
  const [repositoryId, setRepositoryId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getSetupSources(controller.signal)
      .then((sources) => {
        setLoadState({ status: "ready", sources });
        setTemplateId((current) => current || sources.templates[0]?.id || "");
        setRepositoryId((current) => current || sources.repositories[0]?.id || "");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Sources could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [reloadKey]);

  const selectedRepository = useMemo(() => {
    if (loadState.status !== "ready") return undefined;
    return loadState.sources.repositories.find((item) => item.id === repositoryId);
  }, [loadState, repositoryId]);

  const compatibleRepositories = useMemo(() => {
    if (loadState.status !== "ready") return [];
    return loadState.sources.repositories.filter(
      (item) => item.templateId === templateId,
    );
  }, [loadState, templateId]);

  const existingSandbox = useMemo(() => {
    if (loadState.status !== "ready") return undefined;
    return loadState.sources.sandboxes.find(
      (item) => item.repositoryId === repositoryId,
    );
  }, [loadState, repositoryId]);

  if (loadState.status === "loading") {
    return (
      <div className="source-state" role="status" aria-live="polite">
        <span className="source-state-mark" aria-hidden="true">···</span>
        <div>
          <h2>Loading demo sources</h2>
          <p>Reading the repository and sandbox dashboards.</p>
        </div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="source-state source-state-error" role="alert">
        <span className="source-state-mark" aria-hidden="true">!</span>
        <div>
          <h2>Source API is unavailable</h2>
          <p>{loadState.message} Start the Express API on port 4000, then retry.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setLoadState({ status: "loading" });
            setReloadKey((value) => value + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { templates, repositories, seedProfiles } = loadState.sources;

  if (templates.length === 0 || repositories.length === 0 || seedProfiles.length === 0) {
    return (
      <div className="source-state" role="status">
        <span className="source-state-mark" aria-hidden="true">0</span>
        <div>
          <h2>No setup sources found</h2>
          <p>Add at least one template, repository, and seed profile to the demo source data.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await createSetupRequest({
        projectTemplate: String(formData.get("projectTemplate")),
        repositoryId: String(formData.get("repositoryId")),
        targetEnvironment: String(formData.get("targetEnvironment")) as "sandbox" | "production",
        requestedPermission: String(formData.get("requestedPermission")) as "viewer" | "developer" | "admin",
        seedProfile: String(formData.get("seedProfile")),
      });
      router.push(`/requests/${result.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiRequestError || error instanceof Error
          ? error.message
          : "The setup request could not be saved.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="form-layout">
      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-heading">
            <span>Project</span>
            <p>Select the template and demo repository that provide the setup evidence.</p>
          </div>

          <label className="field">
            <span>Project template</span>
            <select
              name="projectTemplate"
              value={templateId}
              onChange={(event) => {
                const nextTemplateId = event.target.value;
                setTemplateId(nextTemplateId);
                setRepositoryId(
                  repositories.find((item) => item.templateId === nextTemplateId)?.id ?? "",
                );
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
            <small>The template determines the expected services and setup order.</small>
          </label>

          <label className="field">
            <span>Demo repository</span>
            <select name="repositoryId" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)}>
              {compatibleRepositories.map((repository) => (
                <option key={repository.id} value={repository.id}>{repository.name}</option>
              ))}
            </select>
            <small>Private, synthetic repositories returned by the mock repo dashboard.</small>
          </label>
        </div>

        <div className="form-section">
          <div className="form-section-heading">
            <span>Environment and access</span>
            <p>These values will be checked by deterministic safety policies.</p>
          </div>

          <label className="field">
            <span>Target environment</span>
            <select name="targetEnvironment" defaultValue="sandbox">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production (blocked)</option>
            </select>
            <small>Production requests are aborted before planning or execution.</small>
          </label>

          <label className="field">
            <span>Requested permission</span>
            <select name="requestedPermission" defaultValue="admin">
              <option value="viewer">Viewer</option>
              <option value="developer">Developer</option>
              <option value="admin">Administrator (subject to reduction)</option>
            </select>
            <small>For this demo, admin is requested intentionally; the plan should reduce it to developer.</small>
          </label>

          <label className="field">
            <span>Seed-data profile</span>
            <select name="seedProfile" defaultValue={seedProfiles[0].id}>
              {seedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
            <small>Every available record is synthetic.</small>
          </label>
        </div>

        <div className="form-actions">
          <Link className="button button-secondary" href="/">Cancel</Link>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Saving request…" : "Create request"}
          </button>
        </div>
        {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
      </form>

      <aside className="side-note" aria-labelledby="source-note-title">
        <div className="demo-tip">
          <strong>New here?</strong>
          <p>Use the preselected values for the first run. “Admin” is the request; “developer” will be the safer assigned role.</p>
          <Link className="text-link" href="/how-it-works">See the complete flow →</Link>
        </div>
        <span className="section-label">Source evidence</span>
        <h2 id="source-note-title">Dashboard record found</h2>
        {selectedRepository ? (
          <dl className="evidence-list">
            <div><dt>Repository ID</dt><dd>{selectedRepository.id}</dd></div>
            <div><dt>Source</dt><dd>{selectedRepository.source.sourceId}</dd></div>
            <div><dt>Retrieved</dt><dd>{new Date(selectedRepository.source.retrievedAt).toLocaleTimeString()}</dd></div>
            <div><dt>Existing sandbox</dt><dd>{existingSandbox ? existingSandbox.id : "None"}</dd></div>
          </dl>
        ) : null}
        <p className="evidence-note">
          {existingSandbox
            ? "This repository already has a sandbox. A later phase will reuse it instead of creating a duplicate."
            : "No sandbox is linked to this repository. No resource is created in this phase."}
        </p>
      </aside>
    </div>
  );
}
