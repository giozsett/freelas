import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPasswordStrength } from './validacaoSenha.js';

// Requisitos avaliados: minimo 8 caracteres, 1 maiuscula, 1 numero, 1 caractere especial.
// A funcao so retorna 'Forte' quando os 4 requisitos completos sao atendidos;
// o teste de minimo de 8 caracteres nao existe na funcao atual (ver Relatorio_autenticacao.md).

test('recusa (nao "Forte") senha com menos de 8 caracteres mesmo tendo maiuscula, numero e especial', () => {
  assert.notEqual(checkPasswordStrength('Ab1@xyz'), 'Forte'); // 7 caracteres
});

test('recusa (nao "Forte") senha sem letra maiuscula', () => {
  assert.notEqual(checkPasswordStrength('abcdef1@'), 'Forte');
});

test('recusa (nao "Forte") senha sem numero', () => {
  assert.notEqual(checkPasswordStrength('Abcdefg@'), 'Forte');
});

test('recusa (nao "Forte") senha sem caractere especial', () => {
  assert.notEqual(checkPasswordStrength('Abcdefg1'), 'Forte');
});

test('classifica como "Forte" uma senha que atende aos 4 requisitos', () => {
  assert.equal(checkPasswordStrength('Abcdef1@'), 'Forte');
});

test('senha vazia nao recebe classificacao', () => {
  assert.equal(checkPasswordStrength(''), '');
});
