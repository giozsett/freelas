import professionalOptions from '../data/professional-options.json';

export const CATEGORIAS_COM_HABILIDADES = professionalOptions.categories;

export const CATEGORIAS_SERVICO = CATEGORIAS_COM_HABILIDADES.map(
  (categoria) => categoria.name,
);

export const HABILIDADES_POR_CATEGORIA = Object.fromEntries(
  CATEGORIAS_COM_HABILIDADES.map((categoria) => [categoria.name, categoria.skills]),
);

export const HABILIDADES_PROFISSIONAIS = [
  ...new Set(CATEGORIAS_COM_HABILIDADES.flatMap((categoria) => categoria.skills)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'));
