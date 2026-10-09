import { AppError } from '../errors.js';

export const CATEGORIAS = ['SPA', 'PASSEIO', 'REFEICAO'];
export const STATUS = ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO'];

const TRANSICOES = Object.freeze({
  PENDENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: []
});

export function normalizeTime(value) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    throw new AppError('Horário inválido. Use HH:mm ou HH:mm:ss');
  }
  return value.length === 5 ? `${value}:00` : value;
}

export function timeToSeconds(value) {
  const [hours, minutes, seconds] = normalizeTime(value).split(':').map(Number);
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new AppError('Horário inválido');
  }
  return hours * 3600 + minutes * 60 + seconds;
}

export function addMinutesToTime(value, minutes) {
  const total = timeToSeconds(value) + minutes * 60;
  if (total >= 24 * 3600) {
    throw new AppError('O serviço não pode terminar no dia seguinte');
  }
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const mins = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${mins}:${seconds}`;
}

export function periodsOverlap(startA, endA, startB, endB) {
  return timeToSeconds(startA) < timeToSeconds(endB)
    && timeToSeconds(endA) > timeToSeconds(startB);
}

export function dayGroup(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Data inválida. Use AAAA-MM-DD');
  }
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new AppError('Data inválida');
  }
  const day = parsed.getUTCDay();
  return day >= 1 && day <= 4 ? 'segundaQuinta' : 'sextaDomingo';
}

export function assertStatusTransition(current, next) {
  if (!TRANSICOES[current]?.includes(next)) {
    throw new AppError(
      `Transição de status não permitida: ${current} para ${next}`,
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }
}
