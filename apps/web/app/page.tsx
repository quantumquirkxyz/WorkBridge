import { IntakeForm } from '../components/IntakeForm';

export default function HomePage() {
  return (
    <main>
      <h1>Puente Laboral Panamá</h1>
      <p className="lead">
        Captura tu CV o describe tus experiencias. El sistema extrae tu perfil, clasifica cada experiencia y
        guarda un <code>CandidateProfile</code> validado. Nunca envía una postulación.
      </p>
      <IntakeForm />
    </main>
  );
}
