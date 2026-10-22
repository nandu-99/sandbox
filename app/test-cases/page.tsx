import { PageHeading } from "@/components/page-heading";
import { TestCaseDashboard } from "@/components/test-case-dashboard";

export const metadata = {
  title: "Official test cases",
};

export default function TestCasesPage() {
  return (
    <>
      <PageHeading
        title="Official test cases"
        description="Run TC1-TC4 against the same policies and mock actions used by the interactive workflow."
      />
      <TestCaseDashboard />
    </>
  );
}
