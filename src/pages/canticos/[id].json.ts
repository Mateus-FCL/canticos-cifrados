/**
 * Dados de um cântico em JSON (/canticos/<id>.json), para "Sugerir correção" abrir já
 * preenchido. Gerado no build, como as páginas: continua sendo um site só de arquivos.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export const getStaticPaths = (async () => {
  const canticos = await getCollection('canticos');
  return canticos.map((cantico) => ({ params: { id: cantico.id }, props: { cantico } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ cantico: CollectionEntry<'canticos'> }> = ({ props }) => {
  const { numero, titulo, versoes } = props.cantico.data;
  const versao = versoes[0];
  const dados = {
    id: props.cantico.id,
    numero,
    titulo,
    tom: versao?.tom,
    compasso: versao?.compasso,
    bpm: versao?.bpm,
    chordpro: versao?.chordpro,
  };
  return new Response(JSON.stringify(dados), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
