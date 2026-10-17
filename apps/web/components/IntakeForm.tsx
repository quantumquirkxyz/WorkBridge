'use client';

import { useMemo, useState } from 'react';
import type { IntakeResult, IntakeSourceKind } from '@puente/domain';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

type IntakeKind = IntakeSourceKind;

const KIND_OPTIONS: Array<{ value: IntakeKind; label: string; hint: string }> = [
  { value: 'text', label: 'Texto pegado', hint: 'Pega el contenido de tu CV o describe tus experiencias.' },
  { value: 'audio_transcript', label: 'Audio transcrito', hint: 'Pega la transcripción de una nota de voz.' },
  { value: 'pdf', label: 'Archivo PDF', hint: 'Sube tu CV en PDF; se extrae el texto.' },
  { value: 'image', label: 'Imagen del CV', hint: 'Sube una foto o captura de tu CV.' },
];

const RELEVANCE_LABELS: Record<string, string> = {
  relevant: 'Relevante',
  partially_relevant: 'Parcialmente relevante',
  not_relevant: 'No relevante',
  requires_additional_evidence: 'Requiere más evidencia',
};

const EXPERIENCE_TYPE_LABELS: Record<string, string> = {
  formal_employment: 'Empleo formal',
  informal_work: 'Trabajo informal',
  family_business: 'Negocio familiar',
  volunteering: 'Voluntariado',
  project: 'Proyecto',
  academic: 'Académico',
  internship: 'Pasantía',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function isFileKind(kind: IntakeKind): kind is 'pdf' | 'image' {
  return kind === 'pdf' || kind === 'image';
}

interface FormStatus {
  loading: boolean;
  error?: string;
}

export function IntakeForm() {
  const [kind, setKind] = useState<IntakeKind>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [status, setStatus] = useState<FormStatus>({ loading: false });
  const [result, setResult] = useState<IntakeResult | null>(null);

  const activeKind = useMemo(() => KIND_OPTIONS.find((option) => option.value === kind), [kind]);
  const fileKind = isFileKind(kind);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ loading: true });

    try {
      const payload: Record<string, unknown> = { kind };
      const roles = targetRoles
        .split(',')
        .map((role) => role.trim())
        .filter((role) => role.length > 0);
      if (roles.length > 0) {
        payload.targetRoles = roles;
      }

      if (fileKind) {
        if (!file) {
          throw new Error('Selecciona un archivo PDF o imagen.');
        }
        payload.fileName = file.name;
        payload.mimeType = file.type || undefined;
        payload.contentBase64 = await fileToBase64(file);
        if (kind === 'image' && altText.trim().length > 0) {
          payload.altText = altText.trim();
        }
      } else {
        if (text.trim().length === 0) {
          throw new Error('Escribe o pega tu contenido antes de continuar.');
        }
        payload.text = text;
      }

      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as IntakeResult | { error?: string; message?: string };

      if (!response.ok) {
        const message =
          'message' in body && body.message
            ? body.message
            : `No se pudo procesar la solicitud (HTTP ${response.status}).`;
        setResult(null);
        setStatus({ loading: false, error: message });
        return;
      }

      setResult(body as IntakeResult);
      setStatus({ loading: false });
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      });
    }
  }

  return (
    <Card className="mb-5 p-5" role="region" aria-labelledby="intake-heading">
      <h2 id="intake-heading">Captura de tu perfil</h2>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <Label htmlFor="intake-kind">Tipo de fuente</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as IntakeKind)}>
            <SelectTrigger id="intake-kind">
              <SelectValue placeholder="Selecciona un tipo de fuente" />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeKind ? <p className="hint">{activeKind.hint}</p> : null}
        </div>

        {fileKind ? (
          <>
            <div className="field">
              <Label htmlFor="intake-file">Archivo</Label>
              <Input
                id="intake-file"
                type="file"
                accept={kind === 'pdf' ? 'application/pdf' : 'image/*'}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {kind === 'image' ? (
              <div className="field">
                <Label htmlFor="intake-alt">Descripción de la imagen (opcional)</Label>
                <Textarea
                  id="intake-alt"
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Describe lo que aparece en la imagen si no hay reconocimiento automático."
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="field">
            <Label htmlFor="intake-text">
              {kind === 'audio_transcript' ? 'Transcripción' : 'Texto del CV o experiencia'}
            </Label>
            <Textarea
              id="intake-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ejemplo: Ayudaba en la tienda de mi familia los fines de semana, atendiendo clientes."
            />
          </div>
        )}

        <div className="field">
          <Label htmlFor="intake-roles">Puestos objetivo (opcional, separados por coma)</Label>
          <Input
            id="intake-roles"
            type="text"
            value={targetRoles}
            onChange={(event) => setTargetRoles(event.target.value)}
            placeholder="Atención al cliente, Ventas"
          />
        </div>

        <Button type="submit" disabled={status.loading}>
          {status.loading ? 'Procesando…' : 'Analizar mi perfil'}
        </Button>
      </form>

      <div aria-live="polite" role="status">
        {status.error ? (
          <p className="error" role="alert">
            {status.error}
          </p>
        ) : null}
      </div>

      {result ? <IntakeResultView result={result} /> : null}
    </Card>
  );
}

function IntakeResultView({ result }: { result: IntakeResult }) {
  const { profile, extraction } = result;
  return (
    <div className="result">
      <h3>Resultado</h3>
      <p>
        <span className={`badge ${extraction.needs_review ? 'review' : 'ok'}`}>
          {extraction.needs_review ? 'Requiere revisión humana' : 'Sin revisión pendiente'}
        </span>{' '}
        <span className="hint">
          Extractor: {extraction.extractor} · trace: {result.trace_id}
        </span>
      </p>

      {extraction.warnings.length > 0 ? (
        <ul className="warnings">
          {extraction.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <h4>Habilidades</h4>
      {profile.skills.length === 0 ? (
        <p className="hint">No se detectaron habilidades.</p>
      ) : (
        <table>
          <caption className="hint">Habilidades con nivel 0–4, fuente y confianza.</caption>
          <thead>
            <tr>
              <th scope="col">Habilidad</th>
              <th scope="col">Tipo</th>
              <th scope="col">Nivel</th>
              <th scope="col">Fuente</th>
              <th scope="col">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {profile.skills.map((skill) => (
              <tr key={skill.skill_id}>
                <td>{skill.canonical_name}</td>
                <td>{skill.kind === 'technical' ? 'Técnica' : 'Blanda'}</td>
                <td>{skill.level}</td>
                <td>{skill.source}</td>
                <td>{Math.round(skill.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>Experiencias</h4>
      {profile.experiences.length === 0 ? (
        <p className="hint">No se detectaron experiencias.</p>
      ) : (
        <table>
          <caption className="hint">Cada experiencia con su tipo y clasificación de relevancia.</caption>
          <thead>
            <tr>
              <th scope="col">Título</th>
              <th scope="col">Tipo</th>
              <th scope="col">Relevancia</th>
              <th scope="col">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {profile.experiences.map((experience) => (
              <tr key={experience.id}>
                <td>{experience.title}</td>
                <td>{EXPERIENCE_TYPE_LABELS[experience.experience_type] ?? experience.experience_type}</td>
                <td>{RELEVANCE_LABELS[experience.relevance] ?? experience.relevance}</td>
                <td>{experience.relevance_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {profile.warnings && profile.warnings.length > 0 ? (
        <>
          <h4>Advertencias del perfil</h4>
          <ul className="warnings">
            {profile.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
