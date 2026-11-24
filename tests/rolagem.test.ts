import { describe, expect, it } from 'vitest';
import { lerChordpro } from '../src/lib/chordpro';
import {
  BPM_PADRAO,
  VELOCIDADE_MAX,
  VELOCIDADE_MIN,
  avancar,
  batidaNaPosicao,
  batidasDaLinha,
  inicios,
  mudarVelocidade,
  posicaoNaBatida,
  rotuloAndamento,
  rotuloVelocidade,
  temposPorCompasso,
} from '../src/lib/rolagem';

const linha = (fonte: string) => lerChordpro(fonte)[0]!.linhas[0]!;

describe('tempos de cada compasso (a batida do BPM)', () => {
  it('compasso simples: o número de cima', () => {
    expect(temposPorCompasso('4/4')).toBe(4);
    expect(temposPorCompasso('3/4')).toBe(3);
    expect(temposPorCompasso('2/2')).toBe(2);
  });

  it('compasso composto (6/8, 9/8, 12/8): o BPM conta a semínima pontuada', () => {
    expect(temposPorCompasso('6/8')).toBe(2);
    expect(temposPorCompasso('12/8')).toBe(4);
  });

  it('formato estranho conta como 4/4', () => {
    expect(temposPorCompasso('x')).toBe(4);
  });
});

describe('quantas batidas cada linha dura (o mapa é feito no build)', () => {
  it('cada acorde vale um compasso', () => {
    expect(batidasDaLinha(linha('[C]Pelo caminho [F]vou'), 3)).toBe(6);
    expect(batidasDaLinha(linha('[G]Cantamos [C]juntos [D]canção'), 4)).toBe(12);
  });

  it('linha sem acorde continua o anterior: vale dois compassos', () => {
    expect(batidasDaLinha(linha('Com a voz e o coração'), 4)).toBe(8);
  });

  it('o que está entre colchetes e não é acorde, como [x2], não conta', () => {
    expect(batidasDaLinha(linha('[G]Glória [x2]'), 4)).toBe(4);
  });
});

describe('início de cada linha, em batidas', () => {
  it('soma as anteriores', () => {
    expect(inicios([6, 6, 8])).toEqual([0, 6, 12]);
  });
});

// Três linhas: a primeira em 100 px, depois 160 e 220; a última termina em 280.
const topos = [100, 160, 220];
const batidas = [6, 6, 6];
const FIM = 280;

describe('batida → posição na tela', () => {
  it('no começo de uma linha, o topo dela', () => {
    expect(posicaoNaBatida(topos, batidas, FIM, 0)).toBe(100);
    expect(posicaoNaBatida(topos, batidas, FIM, 6)).toBe(160);
  });

  it('no meio da linha, anda aos poucos até a próxima', () => {
    expect(posicaoNaBatida(topos, batidas, FIM, 3)).toBe(130);
    expect(posicaoNaBatida(topos, batidas, FIM, 15)).toBe(250);
  });

  it('linha a linha (para quem pede menos movimento): pula só no começo de cada linha', () => {
    expect(posicaoNaBatida(topos, batidas, FIM, 5.9, true)).toBe(100);
    expect(posicaoNaBatida(topos, batidas, FIM, 6, true)).toBe(160);
  });

  it('depois do fim, fica no fim', () => {
    expect(posicaoNaBatida(topos, batidas, FIM, 99)).toBe(280);
  });

  it('linha escondida (só acordes, no modo Só letra) tem altura zero: a tela espera parada', () => {
    expect(posicaoNaBatida([100, 100, 160], [4, 6, 6], FIM, 2)).toBe(100);
  });
});

describe('posição → batida (recomeçar de onde a pessoa está)', () => {
  it('é o caminho de volta', () => {
    expect(batidaNaPosicao(topos, batidas, FIM, 130)).toBe(3);
    expect(batidaNaPosicao(topos, batidas, FIM, 160)).toBe(6);
  });

  it('acima da primeira linha é o começo; abaixo da última, o fim', () => {
    expect(batidaNaPosicao(topos, batidas, FIM, 0)).toBe(0);
    expect(batidaNaPosicao(topos, batidas, FIM, 999)).toBe(18);
  });
});

describe('o tempo passando', () => {
  it('a 60 BPM, um segundo é uma batida; a 120, são duas', () => {
    expect(avancar(0, 1000, 60, 1)).toBe(1);
    expect(avancar(0, 1000, 120, 1)).toBe(2);
  });

  it('a velocidade ajusta o andamento', () => {
    expect(avancar(10, 1000, 60, 0.5)).toBe(10.5);
  });
});

describe('ajuste de velocidade', () => {
  it('muda de 10 em 10%, entre 50% e 150%', () => {
    expect(mudarVelocidade(1, 1)).toBe(1.1);
    expect(mudarVelocidade(1, -1)).toBe(0.9);
    expect(mudarVelocidade(VELOCIDADE_MAX, 1)).toBe(VELOCIDADE_MAX);
    expect(mudarVelocidade(VELOCIDADE_MIN, -1)).toBe(VELOCIDADE_MIN);
  });

  it('não acumula erro de conta (0,1 + 0,2)', () => {
    expect(mudarVelocidade(mudarVelocidade(1, 1), 1)).toBe(1.2);
  });

  it('escreve em porcentagem', () => {
    expect(rotuloVelocidade(1.1)).toBe('Velocidade 110%');
  });
});

describe('andamento no cabeçalho do cântico', () => {
  it('mostra o compasso e o BPM', () => {
    expect(rotuloAndamento('3/4', 66)).toBe('3/4 · 66 BPM');
  });

  it('sem BPM informado, mostra só o compasso', () => {
    expect(rotuloAndamento('3/4', undefined)).toBe('3/4');
  });
});

describe('cântico sem BPM informado', () => {
  it('a rolagem usa 100 BPM, um andamento médio', () => {
    expect(BPM_PADRAO).toBe(100);
  });
});
