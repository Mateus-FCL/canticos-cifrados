/**
 * Lista de todos os cânticos (id, número e título), gerada no build (/indice-canticos.json).
 * O painel do admin usa para sugerir o próximo número e não repetir número nem nome de arquivo.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const lista = (await getCollection('canticos')).map(({ id, data }) => ({
    id,
    titulo: data.titulo,
    ...(data.numero === undefined ? {} : { numero: data.numero }),
  }));
  return new Response(JSON.stringify(lista), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
