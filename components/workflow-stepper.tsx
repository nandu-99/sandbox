const workflowSteps = [
  { id: "request", label: "Request", description: "Choose the project and access." },
  { id: "plan", label: "Plan", description: "Apply safety and least privilege." },
  { id: "approval", label: "Approve", description: "A human reviews the exact plan." },
  { id: "execution", label: "Execute", description: "Create or reuse the mock sandbox." },
  { id: "verification", label: "Verify", description: "Run the independent smoke login." },
  { id: "manifest", label: "Report", description: "Generate a secret-free manifest." },
] as const;

export type WorkflowStage = (typeof workflowSteps)[number]["id"];

type WorkflowStepperProps = {
  current: WorkflowStage;
  stopped?: boolean;
};

export function WorkflowStepper({ current, stopped = false }: WorkflowStepperProps) {
  const currentIndex = workflowSteps.findIndex((step) => step.id === current);

  return (
    <nav className="workflow-progress" aria-label="Setup workflow progress">
      <div className="workflow-progress-heading">
        <span className="section-label">Your progress</span>
        <span>{stopped ? "Workflow safely stopped" : `Step ${currentIndex + 1} of ${workflowSteps.length}`}</span>
      </div>
      <ol>
        {workflowSteps.map((step, index) => {
          const state = stopped && index > currentIndex
            ? "locked"
            : index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "upcoming";

          return (
            <li key={step.id} className={`workflow-step workflow-step-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="workflow-step-number" aria-hidden="true">
                {state === "complete" ? "✓" : index + 1}
              </span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
