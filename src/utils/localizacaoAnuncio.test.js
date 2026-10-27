import test from 'node:test';
import assert from 'node:assert/strict';
import { camposDeLocalizacao, erroDeLocalizacao, localizacaoDoAnuncio } from './localizacaoAnuncio.js';

const LOCAL = {
  estado: 'RS', cidade: 'Porto Alegre', bairro: 'Centro', address: 'Rua A', addressNumber: '10',
  latitude: -30.0346, longitude: -51.2177, localConfirmado: true,
};

test('vaga presencial envia endereço e coordenadas', () => {
  assert.deepEqual(camposDeLocalizacao('presencial', LOCAL), {
    location_type: 'presencial',
    address: 'Rua A',
    address_number: '10',
    estado: 'RS',
    cidade: 'Porto Alegre',
    bairro: 'Centro',
    latitude: -30.0346,
    longitude: -51.2177,
  });
});

test('vaga remota apaga endereço e coordenadas', () => {
  const campos = camposDeLocalizacao('remoto', LOCAL);
  assert.equal(campos.cidade, '');
  assert.equal(campos.latitude, null);
  assert.equal(campos.longitude, null);
});

test('pino no mapa sem confirmação impede publicar', () => {
  assert.match(erroDeLocalizacao('presencial', { ...LOCAL, localConfirmado: false }), /Confirme o local/);
  assert.equal(erroDeLocalizacao('presencial', LOCAL), '');
});

test('sem pino (mapa fora do ar) a vaga presencial ainda pode ser publicada', () => {
  assert.equal(erroDeLocalizacao('presencial', { ...LOCAL, latitude: null, longitude: null, localConfirmado: false }), '');
  assert.equal(erroDeLocalizacao('remoto', { ...LOCAL, localConfirmado: false }), '');
});

test('anúncio salvo vira o estado do formulário, com coordenadas da API em número', () => {
  const local = localizacaoDoAnuncio({
    estado: 'RS', cidade: 'Porto Alegre', bairro: null, address: 'Rua A', address_number: '10',
    latitude: '-30.034600', longitude: '-51.217700',
  });

  assert.equal(local.bairro, '');
  assert.equal(local.latitude, -30.0346);
  assert.equal(local.longitude, -51.2177);
  assert.equal(local.localConfirmado, true);
  assert.equal(localizacaoDoAnuncio({ latitude: null, longitude: null }).localConfirmado, false);
});
