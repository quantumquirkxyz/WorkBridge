'use client';

import type { ContractType, TransportMode, WorkModality } from '@workbridge/domain';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  CONTRACT_OPTIONS,
  DAY_LABELS,
  MODALITY_OPTIONS,
  TRANSPORT_OPTIONS,
} from './constants';
import { toggleListValue } from './utils';

export interface PreferencesFormState {
  targetRoles: string;
  modality: WorkModality;
  province: string;
  district: string;
  maxTravel: number;
  budget: number;
  minSalary: number;
  days: number[];
  start: string;
  end: string;
  weeklyHours: number;
  contracts: ContractType[];
  modes: TransportMode[];
  willingTrain: boolean;
  willingIntern: boolean;
}

export interface PreferencesFormProps {
  state: PreferencesFormState;
  onChange: (patch: Partial<PreferencesFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

export function PreferencesForm({ state, onChange, onSubmit, loading }: PreferencesFormProps) {
  const set = (patch: Partial<PreferencesFormState>) => onChange(patch);

  return (
    <form id="preferencias" onSubmit={onSubmit} noValidate>
      <div className="field">
        <Label htmlFor="pref-roles">Puestos objetivo (separados por coma)</Label>
        <Input
          id="pref-roles"
          type="text"
          value={state.targetRoles}
          onChange={(event) => set({ targetRoles: event.target.value })}
          placeholder="Atención al cliente, Ventas"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <Label htmlFor="pref-modality">Modalidad</Label>
          <Select value={state.modality} onValueChange={(value) => set({ modality: value as WorkModality })}>
            <SelectTrigger id="pref-modality">
              <SelectValue placeholder="Selecciona una modalidad" />
            </SelectTrigger>
            <SelectContent>
              {MODALITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <Label htmlFor="pref-province">Provincia</Label>
          <Input
            id="pref-province"
            type="text"
            value={state.province}
            onChange={(event) => set({ province: event.target.value })}
          />
        </div>
        <div className="field">
          <Label htmlFor="pref-district">Distrito</Label>
          <Input
            id="pref-district"
            type="text"
            value={state.district}
            onChange={(event) => set({ district: event.target.value })}
          />
        </div>
      </div>

      <details>
        <summary>Más opciones</summary>
      <div className="field-row">
        <div className="field">
          <Label htmlFor="pref-travel">Traslado máximo (minutos)</Label>
          <Input
            id="pref-travel"
            type="number"
            min={0}
            max={600}
            value={state.maxTravel}
            onChange={(event) => set({ maxTravel: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <Label htmlFor="pref-budget">Presupuesto de transporte (USD/mes)</Label>
          <Input
            id="pref-budget"
            type="number"
            min={0}
            value={state.budget}
            onChange={(event) => set({ budget: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <Label htmlFor="pref-salary">Salario mínimo (USD/mes)</Label>
          <Input
            id="pref-salary"
            type="number"
            min={0}
            value={state.minSalary}
            onChange={(event) => set({ minSalary: Number(event.target.value) })}
          />
        </div>
      </div>

      <fieldset className="field">
        <legend>Días disponibles</legend>
        <div className="checkbox-group">
          {DAY_LABELS.map((day) => (
            <Label key={day.value}>
              <Checkbox
                checked={state.days.includes(day.value)}
                onCheckedChange={() => set({ days: toggleListValue(state.days, day.value) })}
              />
              {day.label}
            </Label>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <div className="field">
          <Label htmlFor="pref-start">Hora de inicio</Label>
          <Input
            id="pref-start"
            type="time"
            value={state.start}
            onChange={(event) => set({ start: event.target.value })}
          />
        </div>
        <div className="field">
          <Label htmlFor="pref-end">Hora de fin</Label>
          <Input id="pref-end" type="time" value={state.end} onChange={(event) => set({ end: event.target.value })} />
        </div>
        <div className="field">
          <Label htmlFor="pref-weekly">Horas semanales</Label>
          <Input
            id="pref-weekly"
            type="number"
            min={0}
            max={168}
            value={state.weeklyHours}
            onChange={(event) => set({ weeklyHours: Number(event.target.value) })}
          />
        </div>
      </div>

      <fieldset className="field">
        <legend>Tipo de contrato</legend>
        <div className="checkbox-group">
          {CONTRACT_OPTIONS.map((option) => (
            <Label key={option.value}>
              <Checkbox
                checked={state.contracts.includes(option.value)}
                onCheckedChange={() => set({ contracts: toggleListValue(state.contracts, option.value) })}
              />
              {option.label}
            </Label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Modos de transporte</legend>
        <div className="checkbox-group">
          {TRANSPORT_OPTIONS.map((option) => (
            <Label key={option.value}>
              <Checkbox
                checked={state.modes.includes(option.value)}
                onCheckedChange={() => set({ modes: toggleListValue(state.modes, option.value) })}
              />
              {option.label}
            </Label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Disposición</legend>
        <div className="checkbox-group">
          <Label>
            <Checkbox
              checked={state.willingTrain}
              onCheckedChange={(checked) => set({ willingTrain: checked === true })}
            />
             Me interesa tomar cursos
          </Label>
          <Label>
            <Checkbox
              checked={state.willingIntern}
              onCheckedChange={(checked) => set({ willingIntern: checked === true })}
            />
             Me interesa hacer pasantías
          </Label>
        </div>
      </fieldset>

      </details>
      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
