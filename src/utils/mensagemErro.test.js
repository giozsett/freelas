import test from 'node:test';
import assert from 'node:assert/strict';
import { primeiraMensagemDeErro } from './mensagemErro.js';

test('mensagem de erro: usa detail, depois o primeiro erro de campo', () => {
  assert.equal(primeiraMensagemDeErro({ detail: 'Limite atingido.' }, 'padrão'), 'Limite atingido.');
  assert.equal(primeiraMensagemDeErro({ skills: ['Há habilidades repetidas.'] }, 'padrão'), 'Há habilidades repetidas.');
  assert.equal(primeiraMensagemDeErro(['Erro geral.'], 'padrão'), 'Erro geral.');
  assert.equal(primeiraMensagemDeErro(null, 'padrão'), 'padrão');
});
