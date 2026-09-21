import professionalOptions from '../data/professional-options.json';
import ramosEmpresa from '../data/ramos-empresa.json';

export const RAMOS_EMPRESA = ramosEmpresa.ramos;
export const MAX_RAMOS_EMPRESA = ramosEmpresa.maxSelecionados;

export const PORTES_EMPRESA = [
  { valor: 'autonomo', rotulo: 'Autônomo' },
  { valor: 'micro', rotulo: 'Micro (até 9 funcionários)' },
  { valor: 'pequena', rotulo: 'Pequena (10 a 49)' },
  { valor: 'media', rotulo: 'Média (50 a 249)' },
  { valor: 'grande', rotulo: 'Grande (250+)' },
];

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
