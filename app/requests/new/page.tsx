import { PageHeading } from "@/components/page-heading";
import { SetupRequestForm } from "@/components/setup-request-form";
import { WorkflowStepper } from "@/components/workflow-stepper";

export const metadata = {
  title: "New setup request",
};

export default function NewRequestPage() {
  return (
    <>
      <PageHeading
        title="New setup request"
        description="Define the developer environment. No sandbox will be created until an approved plan is executed."
      />

      <WorkflowStepper current="request" />

      <SetupRequestForm />
    </>
  );
}
