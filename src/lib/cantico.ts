import { z } from 'astro/zod';

/** Tom na cifra brasileira: nota de A a G, sustenido ou bemol opcional, `m` para menor. */
const tom = z.string().regex(/^[A-G](#|b)?m?$/, 'tom inválido: use a cifra, como G, Em, F# ou Bb');

/** Fórmula de compasso, como 4/4, 3/4 ou 6/8. */
const compasso = z.string().regex(/^[1-9]\d*\/[1-9]\d*$/, 'compasso inválido: use o formato 4/4');

/** Endereço https de um arquivo com uma das extensões dadas (ex.: no R2). */
function arquivoHttps(extensoes: string[], mensagem: string) {
  const final = new RegExp(`\\.(${extensoes.join('|')})$`, 'i');
  return z
    .url({ protocol: /^https$/, error: mensagem })
    // O Zod roda o refine mesmo quando a URL já foi recusada; sem o canParse, new URL quebraria.
    .refine((url) => URL.canParse(url) && final.test(new URL(url).pathname), mensagem);
}

/** Áudio de referência da versão, usado para a rolagem (não é tocado para o usuário). */
const audio = arquivoHttps(['mp3', 'm4a', 'ogg', 'opus'], 'áudio inválido: use um endereço https terminado em .mp3, .m4a, .ogg ou .opus');

const pdf = arquivoHttps(['pdf'], 'PDF inválido: use um endereço https terminado em .pdf');

/** Etiquetas para filtrar a lista, como "ceia" ou "natal". */
const tags = z
  .array(z.string().trim().min(1, 'tag vazia'))
  .refine((lista) => new Set(lista).size === lista.length, 'tag repetida')
  .default([]);

/** De onde vieram a letra e a cifra. Só informativo: não bloqueia nada. */
const direitosSchema = z.object({
  origemLetra: z.string().trim().min(1).optional(),
  origemCifra: z.string().trim().min(1).optional(),
});

const versaoSchema = z.object({
  tom,
  compasso,
  /** Em branco quando ninguém informou; a autorolagem então usa BPM_PADRAO (lib/rolagem). */
  bpm: z.number().int().min(30).max(300).optional(),
  /** Letra com os acordes entre colchetes, no formato ChordPro. */
  chordpro: z.string().trim().min(1, 'a versão precisa da letra com cifra'),
  audio: audio.optional(),
  pdf: pdf.optional(),
  direitos: direitosSchema.optional(),
});

export const canticoSchema = z.object({
  numero: z.number().int().positive().optional(),
  titulo: z.string().trim().min(1, 'o cântico precisa de título'),
  historia: z.string().trim().min(1).optional(),
  pessoas: z.array(z.string().trim().min(1)).default([]),
  tags,
  versoes: z.array(versaoSchema).min(1, 'o cântico precisa de pelo menos uma versão'),
});

export type Cantico = z.infer<typeof canticoSchema>;
export type Versao = z.infer<typeof versaoSchema>;
