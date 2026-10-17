import { SubmissionQueue } from '../../components/employer/SubmissionQueue';

export default function EmployerHomePage() {
  return (
    <main className="space-y-4 px-4 py-6 md:px-8">
      <h1 className="text-xl font-semibold">Postulaciones</h1>
      <SubmissionQueue />
    </main>
  );
}
