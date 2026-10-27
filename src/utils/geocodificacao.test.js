import test from 'node:test';
import assert from 'node:assert/strict';
import { enderecoDoNominatim, textoDoEndereco } from './geocodificacao.js';

test('lê rua, número, bairro, cidade e UF da resposta do Nominatim', () => {
  const endereco = enderecoDoNominatim({
    address: {
      road: 'Avenida Setembrina',
      house_number: '120',
      suburb: 'Farroupilha',
      city: 'Porto Alegre',
      state: 'Rio Grande do Sul',
      'ISO3166-2-lvl4': 'BR-RS',
    },
  });

  assert.deepEqual(endereco, {
    address: 'Avenida Setembrina',
    addressNumber: '120',
    bairro: 'Farroupilha',
    cidade: 'Porto Alegre',
    estado: 'RS',
  });
});

test('cidade pequena vem como town ou village e bairro como neighbourhood', () => {
  const endereco = enderecoDoNominatim({
    address: { road: 'Rua A', neighbourhood: 'Centro', town: 'Gramado', 'ISO3166-2-lvl4': 'BR-RS' },
  });

  assert.equal(endereco.cidade, 'Gramado');
  assert.equal(endereco.bairro, 'Centro');
  assert.equal(endereco.addressNumber, '');
});

test('resposta sem endereço vira nulo', () => {
  assert.equal(enderecoDoNominatim({ error: 'Unable to geocode' }), null);
  assert.equal(enderecoDoNominatim(null), null);
});

test('texto do endereço junta só as partes preenchidas', () => {
  assert.equal(
    textoDoEndereco({ address: 'Rua A', addressNumber: '10', bairro: 'Centro' }),
    'Rua A, 10 · Centro',
  );
  assert.equal(textoDoEndereco({ address: '', addressNumber: '', bairro: 'Centro' }), 'Centro');
});
