import { IntakeForm } from '../components/IntakeForm';
import { ExplorationDashboard } from '../components/ExplorationDashboard';

export default function HomePage() {
  return (
    <main>
      <h1>Puente Laboral Panamá</h1>
      <p className="lead">
        Captura tu CV o describe tus experiencias. El sistema arma tu perfil, clasifica cada experiencia y
        guarda un perfil validado. Luego declaras tus preferencias de trabajo y exploras
        vacantes compatibles del catálogo en caché. Nunca envía una postulación.
      </p>
      <IntakeForm />
      <ExplorationDashboard />
    </main>
  );
}
