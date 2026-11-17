// Confere se todo cântico declara direitos. A regra completa entra com a
// coleção de conteúdo (fatia conteudo/colecao-canticos); por ora só avisa
// quando a coleção ainda não existe.
import { existsSync } from 'node:fs';

const pasta = new URL('../src/content/canticos/', import.meta.url);

if (!existsSync(pasta)) {
  console.log('check:direitos: coleção de cânticos ainda não existe, nada a conferir.');
  process.exit(0);
}

console.error('check:direitos: coleção encontrada, mas a verificação ainda não foi implementada.');
process.exit(1);
