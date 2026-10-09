import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMinutesToTime,
  assertStatusTransition,
  dayGroup,
  periodsOverlap
} from '../src/domain/rules.js';

test('calcula o horário final a partir da duração', () => {
  assert.equal(addMinutesToTime('09:30', 60), '10:30:00');
});

test('classifica corretamente os grupos de dias', () => {
  assert.equal(dayGroup('2026-09-14'), 'segundaQuinta');
  assert.equal(dayGroup('2026-09-18'), 'sextaDomingo');
});

test('detecta sobreposição de horários', () => {
  assert.equal(periodsOverlap('09:00', '10:00', '09:30', '10:30'), true);
  assert.equal(periodsOverlap('09:00', '10:00', '10:00', '11:00'), false);
});

test('aceita somente transições válidas de status', () => {
  assert.doesNotThrow(() => assertStatusTransition('PENDENTE', 'CONFIRMADO'));
  assert.throws(() => assertStatusTransition('CANCELADO', 'CONFIRMADO'));
});
