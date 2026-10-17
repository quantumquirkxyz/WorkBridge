import { SubmissionDecision } from '../../../components/employer/SubmissionDecision';

export default async function EmployerSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return (
    <main className="space-y-4">
      <header className="page-head page-head-mint">
        <h1>Postulación</h1>
      </header>
      <SubmissionDecision submissionId={submissionId} />
    </main>
  );
}
