import test from 'node:test';
import assert from 'node:assert/strict';
import { anuncioPassaNosFiltros } from './filtrarAnuncios.js';

const FILTROS_VAZIOS = {
  categoria: '',
  habilidades: [],
  busca: '',
  modalidade: '',
  estado: '',
  cidade: '',
  precoMinimo: 0,
  precoMaximo: 1000,
};

const anuncio = (extra = {}) => ({
  title: 'Edição de vídeo para YouTube',
  description: 'Cortes, legendas e trilha para vídeos semanais.',
  category: 'Vídeo, Áudio e Fotografia',
  skills: ['Edição de Vídeo', 'Motion Design'],
  locationType: 'remoto',
  estado: '',
  city: '',
  price: '300',
  status: 'Em aberto',
  ...extra,
});

const passa = (filtros, extra) => anuncioPassaNosFiltros(anuncio(extra), { ...FILTROS_VAZIOS, ...filtros });

test('sem filtros, anúncio em aberto aparece', () => {
  assert.equal(passa({}), true);
});

test('anúncio que não está em aberto nunca aparece', () => {
  assert.equal(passa({}, { status: 'Finalizado' }), false);
});

test('várias habilidades: basta o anúncio ter uma delas', () => {
  assert.equal(passa({ habilidades: ['React', 'Motion Design'] }), true);
  assert.equal(passa({ habilidades: ['React', 'Django'] }), false);
});

test('habilidade e categoria ignoram maiúsculas', () => {
  assert.equal(passa({ habilidades: ['motion design'], categoria: 'vídeo, áudio e fotografia' }), true);
});

test('busca encontra palavras na descrição, não só no título', () => {
  assert.equal(passa({ busca: 'legendas' }), true);
});

test('busca ignora acentos e maiúsculas', () => {
  assert.equal(passa({ busca: 'EDICAO video' }), true);
});

test('busca exige todas as palavras, em qualquer ordem', () => {
  assert.equal(passa({ busca: 'youtube cortes' }), true);
  assert.equal(passa({ busca: 'youtube podcast' }), false);
});

test('busca também olha a categoria e as habilidades do anúncio', () => {
  assert.equal(passa({ busca: 'motion' }), true);
  assert.equal(passa({ busca: 'fotografia' }), true);
});

test('busca encontra o anúncio por habilidade parecida pelo significado', () => {
  const babá = { title: 'Vaga noturna', description: 'Bebê de 8 meses.', category: 'Cuidados Pessoais', skills: ['Babá Noturna'] };
  assert.equal(passa({ busca: 'cuidar do meu filho', habilidadesRelacionadas: ['Babá Noturna', 'Babá'] }, babá), true);
  assert.equal(passa({ busca: 'cuidar do meu filho', habilidadesRelacionadas: ['Cuidador de Idosos'] }, babá), false);
});

test('anúncio sem descrição ainda é encontrado pelo título', () => {
  assert.equal(passa({ busca: 'youtube' }, { description: null }), true);
});

test('faixa de preço com 1000 significando sem máximo', () => {
  assert.equal(passa({ precoMinimo: 400 }), false);
  assert.equal(passa({ precoMaximo: 200 }), false);
  assert.equal(passa({ precoMinimo: 1000 }, { price: '5000' }), true);
});

test('estado e cidade só contam no filtro presencial', () => {
  assert.equal(passa({ estado: 'SP' }), true);
  assert.equal(
    passa({ modalidade: 'presencial', estado: 'SP', cidade: 'Campinas' }, { locationType: 'presencial', estado: 'SP', city: 'Santos' }),
    false,
  );
});
