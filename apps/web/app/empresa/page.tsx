import { SubmissionQueue, SubmissionQueueCount } from '../../components/employer/SubmissionQueue';
import '../styles/roles.css';

export default function EmployerHomePage() {
  return (
    <main className="space-y-4">
      <header className="page-head page-head-mint page-head-row">
        <h1>Postulaciones</h1>
        <SubmissionQueueCount />
      </header>
      <SubmissionQueue />
    </main>
  );
}
