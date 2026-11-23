import { describe, expect, it } from 'vitest';
import { DIAS_ATE_OFERECER_DE_NOVO, deveOferecerInstalar } from '../src/lib/instalar';

const DIA = 24 * 60 * 60 * 1000;
const agora = Date.UTC(2026, 10, 23);

describe('oferecer "Instalar o app"', () => {
  it('oferece se a pessoa nunca disse "Agora não"', () => {
    expect(deveOferecerInstalar(null, agora)).toBe(true);
  });

  it('não insiste logo depois de "Agora não"', () => {
    expect(deveOferecerInstalar(String(agora - 2 * DIA), agora)).toBe(false);
  });

  it(`volta a oferecer depois de ${DIAS_ATE_OFERECER_DE_NOVO} dias`, () => {
    expect(deveOferecerInstalar(String(agora - DIAS_ATE_OFERECER_DE_NOVO * DIA), agora)).toBe(true);
  });

  it('valor estragado conta como nunca dispensado', () => {
    expect(deveOferecerInstalar('ontem', agora)).toBe(true);
  });
});
