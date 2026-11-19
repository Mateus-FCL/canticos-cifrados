import { describe, expect, it } from 'vitest';
import {
  NOME_MAX,
  adicionarCantico,
  avisoPosicao,
  criarSetlist,
  descer,
  erroDoNome,
  escreverSetlists,
  excluirSetlist,
  lerSetlists,
  limparNome,
  removerCantico,
  renomearSetlist,
  rotuloQuantidade,
  semAusentes,
  subir,
  vizinhos,
  type Setlist,
} from '../src/lib/setlists';

const domingo: Setlist = { id: 'a', nome: 'Culto de domingo', canticos: ['louvor', 'exemplo', 'paz'] };
const quinta: Setlist = { id: 'b', nome: 'Ensaio de quinta', canticos: [] };
const lista = [domingo, quinta];

describe('nome da setlist', () => {
  it('tira espaços sobrando', () => {
    expect(limparNome('  Culto   de  domingo ')).toBe('Culto de domingo');
  });

  it('corta no tamanho máximo', () => {
    expect(limparNome('a'.repeat(NOME_MAX + 10))).toHaveLength(NOME_MAX);
  });

  it('explica em palavras quando o nome está vazio', () => {
    expect(erroDoNome('   ')).toBe('Escreva um nome para a setlist.');
    expect(erroDoNome('Culto')).toBeUndefined();
  });
});

describe('criar, renomear e excluir', () => {
  it('cria no fim da lista, vazia e com o nome limpo', () => {
    const nova = criarSetlist(lista, ' Culto de jovens ', 'c');
    expect(nova.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(nova[2]).toEqual({ id: 'c', nome: 'Culto de jovens', canticos: [] });
  });

  it('não cria com nome vazio nem com id repetido', () => {
    expect(criarSetlist(lista, '  ', 'c')).toBe(lista);
    expect(criarSetlist(lista, 'Outra', 'a')).toBe(lista);
  });

  it('renomeia só a setlist pedida', () => {
    const nova = renomearSetlist(lista, 'b', 'Ensaio de sexta');
    expect(nova[1]?.nome).toBe('Ensaio de sexta');
    expect(nova[0]).toBe(domingo);
  });

  it('não renomeia para um nome vazio', () => {
    expect(renomearSetlist(lista, 'b', '')).toBe(lista);
  });

  it('exclui pelo id', () => {
    expect(excluirSetlist(lista, 'a')).toEqual([quinta]);
  });

  it('não altera a lista original', () => {
    renomearSetlist(lista, 'a', 'Outro');
    excluirSetlist(lista, 'a');
    expect(lista).toEqual([domingo, quinta]);
    expect(domingo.nome).toBe('Culto de domingo');
  });
});

describe('adicionar e remover cântico', () => {
  it('adiciona no fim', () => {
    expect(adicionarCantico(lista, 'b', 'paz')[1]?.canticos).toEqual(['paz']);
  });

  it('não repete um cântico que já está na setlist', () => {
    expect(adicionarCantico(lista, 'a', 'paz')).toBe(lista);
  });

  it('remove o cântico', () => {
    expect(removerCantico(lista, 'a', 'exemplo')[0]?.canticos).toEqual(['louvor', 'paz']);
  });

  it('ignora setlist que não existe', () => {
    expect(adicionarCantico(lista, 'x', 'paz')).toBe(lista);
    expect(removerCantico(lista, 'x', 'paz')).toBe(lista);
  });
});

describe('ordem dos cânticos', () => {
  it('sobe uma posição', () => {
    expect(subir(lista, 'a', 'exemplo')[0]?.canticos).toEqual(['exemplo', 'louvor', 'paz']);
  });

  it('desce uma posição', () => {
    expect(descer(lista, 'a', 'exemplo')[0]?.canticos).toEqual(['louvor', 'paz', 'exemplo']);
  });

  it('o primeiro não sobe e o último não desce', () => {
    expect(subir(lista, 'a', 'louvor')).toBe(lista);
    expect(descer(lista, 'a', 'paz')).toBe(lista);
  });

  it('ignora cântico que não está na setlist', () => {
    expect(subir(lista, 'a', 'outro')).toBe(lista);
  });
});

describe('navegação entre os cânticos da setlist', () => {
  it('dá o anterior, o próximo e a posição', () => {
    expect(vizinhos(domingo, 'exemplo')).toEqual({ anterior: 'louvor', proximo: 'paz', posicao: 2, total: 3 });
  });

  it('o primeiro não tem anterior e o último não tem próximo', () => {
    expect(vizinhos(domingo, 'louvor')).toEqual({ proximo: 'exemplo', posicao: 1, total: 3 });
    expect(vizinhos(domingo, 'paz')).toEqual({ anterior: 'exemplo', posicao: 3, total: 3 });
  });

  it('cântico fora da setlist não tem navegação', () => {
    expect(vizinhos(domingo, 'outro')).toBeUndefined();
  });
});

describe('cânticos que saíram do app', () => {
  it('somem da setlist sem dar erro', () => {
    expect(semAusentes(domingo, new Set(['louvor', 'paz'])).canticos).toEqual(['louvor', 'paz']);
  });
});

describe('quantidade, como no protótipo', () => {
  it('escreve no singular, no plural e quando está vazia', () => {
    expect(rotuloQuantidade(0)).toBe('Nenhum cântico');
    expect(rotuloQuantidade(1)).toBe('1 cântico');
    expect(rotuloQuantidade(4)).toBe('4 cânticos');
  });
});

describe('avisos para o leitor de tela', () => {
  it('diz onde o cântico ficou depois de mudar de lugar', () => {
    expect(avisoPosicao('Paz no Caminho', 1, 4)).toBe('“Paz no Caminho” agora é o 1º de 4.');
  });
});

describe('guardar no aparelho', () => {
  it('lê de volta o que escreveu', () => {
    expect(lerSetlists(escreverSetlists(lista))).toEqual(lista);
  });

  it('começa vazio se não houver nada guardado ou se estiver estragado', () => {
    for (const texto of [null, '', 'não é json', '[]', '{"versao":99,"setlists":[]}', '{"versao":1}']) {
      expect(lerSetlists(texto), String(texto)).toEqual([]);
    }
  });

  it('aproveita as setlists boas e descarta só as estragadas', () => {
    const texto = JSON.stringify({
      versao: 1,
      setlists: [
        { id: 'a', nome: 'Boa', canticos: ['paz', 3, 'paz', 'louvor'] },
        { id: 'b', nome: '   ', canticos: [] },
        { id: 'a', nome: 'Id repetido', canticos: [] },
        { nome: 'Sem id', canticos: [] },
        'lixo',
      ],
    });
    expect(lerSetlists(texto)).toEqual([{ id: 'a', nome: 'Boa', canticos: ['paz', 'louvor'] }]);
  });
});
