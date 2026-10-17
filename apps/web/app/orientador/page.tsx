import { CounselorQueue, CounselorQueueCount } from '../../components/counselor/CounselorQueue';
import '../styles/roles.css';

export default function CounselorHomePage() {
  return (
    <main className="grid gap-4">
      <header className="page-head page-head-pink page-head-row">
        <h1>Pendientes de revisión</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CounselorQueueCount />
        </div>
      </header>
      <CounselorQueue />
    </main>
  );
}
