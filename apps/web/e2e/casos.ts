export interface CasoVisual {
  id: 'UC-01' | 'UC-02' | 'UC-03' | 'UC-04' | 'UC-05' | 'UC-06';
  titulo: string;
  captura: string;
}

/** Same pasted CV the intake handler test already accepts. */
export const CV_TEXTO = [
  'Ayudaba en la tienda de mi familia los fines de semana, atendiendo clientes y manejando la caja.',
  'Habilidades: Excel, atención al cliente y trabajo en equipo.',
].join('\n');

export const CASOS: readonly CasoVisual[] = [
  {
    id: 'UC-01',
    titulo: 'Pegar un CV y obtener perfil, habilidades y experiencias',
    captura: 'UC-01.png',
  },
  {
    id: 'UC-02',
    titulo: 'Texto vacío: error visible, sin perfil',
    captura: 'UC-02.png',
  },
  {
    id: 'UC-03',
    titulo: 'Guardar preferencias y ver vacantes del catálogo',
    captura: 'UC-03.png',
  },
  {
    id: 'UC-04',
    titulo: 'Sin vacante viable: causas en español y, si el candidato acepta formarse, la ruta',
    captura: 'UC-04.png',
  },
  {
    id: 'UC-05',
    titulo: 'Guardar la búsqueda y verla en la lista',
    captura: 'UC-05.png',
  },
  {
    id: 'UC-06',
    titulo: 'Eliminar los datos del candidato',
    captura: 'UC-06.png',
  },
];
