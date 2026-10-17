import { SubmissionDecision } from '../../../components/employer/SubmissionDecision';

export default async function EmployerSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return (
    <main className="space-y-4 px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold">Postulación</h1>
      <SubmissionDecision submissionId={submissionId} />
    </main>
  );
}
