import { z } from 'astro/zod';

/** Tom na cifra brasileira: nota de A a G, sustenido ou bemol opcional, `m` para menor. */
const tom = z.string().regex(/^[A-G](#|b)?m?$/, 'tom inválido: use a cifra, como G, Em, F# ou Bb');

/** Fórmula de compasso, como 4/4, 3/4 ou 6/8. */
const compasso = z.string().regex(/^[1-9]\d*\/[1-9]\d*$/, 'compasso inválido: use o formato 4/4');

/** De onde vieram a letra e a cifra. Só informativo: não bloqueia nada. */
const direitosSchema = z.object({
  origemLetra: z.string().trim().min(1).optional(),
  origemCifra: z.string().trim().min(1).optional(),
});

const versaoSchema = z.object({
  tom,
  compasso,
  bpm: z.number().int().min(30).max(300),
  /** Letra com os acordes entre colchetes, no formato ChordPro. */
  chordpro: z.string().trim().min(1, 'a versão precisa da letra com cifra'),
  direitos: direitosSchema.optional(),
});

export const canticoSchema = z.object({
  numero: z.number().int().positive().optional(),
  titulo: z.string().trim().min(1, 'o cântico precisa de título'),
  historia: z.string().trim().min(1).optional(),
  pessoas: z.array(z.string().trim().min(1)).default([]),
  versoes: z.array(versaoSchema).min(1, 'o cântico precisa de pelo menos uma versão'),
});

export type Cantico = z.infer<typeof canticoSchema>;
export type Versao = z.infer<typeof versaoSchema>;
