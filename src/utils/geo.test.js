import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparPorLocal,
  arredondarCoordenada,
  circuloGeoJSON,
  distanciaKm,
  formatarDistancia,
  limitesDosPontos,
  temCoordenadas,
} from './geo.js';

const PORTO_ALEGRE = { lat: -30.0346, lng: -51.2177 };
const CANOAS = { lat: -29.9178, lng: -51.1839 };
const SAO_PAULO = { lat: -23.5505, lng: -46.6333 };

test('distância entre Porto Alegre e Canoas fica perto de 13 km', () => {
  const km = distanciaKm(PORTO_ALEGRE, CANOAS);
  assert.ok(km > 12 && km < 14, `veio ${km}`);
});

test('distância entre Porto Alegre e São Paulo fica perto de 850 km', () => {
  const km = distanciaKm(PORTO_ALEGRE, SAO_PAULO);
  assert.ok(km > 840 && km < 860, `veio ${km}`);
});

test('distância de um ponto até ele mesmo é zero', () => {
  assert.equal(distanciaKm(PORTO_ALEGRE, PORTO_ALEGRE), 0);
});

test('temCoordenadas aceita números e textos numéricos da API, recusa vazios', () => {
  assert.equal(temCoordenadas({ lat: -30.03, lng: -51.2 }), true);
  assert.equal(temCoordenadas({ lat: '-30.034600', lng: '-51.217700' }), true);
  assert.equal(temCoordenadas({ lat: null, lng: -51.2 }), false);
  assert.equal(temCoordenadas({ lat: '', lng: '' }), false);
  assert.equal(temCoordenadas(null), false);
});

test('arredonda coordenadas para as 6 casas que o banco guarda', () => {
  assert.equal(arredondarCoordenada(-30.03461234567), -30.034612);
  assert.equal(arredondarCoordenada(-51.2177449), -51.217745);
});

test('formata distância em metros abaixo de 1 km e com vírgula decimal até 10 km', () => {
  assert.equal(formatarDistancia(0.42), 'a 420 m');
  assert.equal(formatarDistancia(3.46), 'a 3,5 km');
  assert.equal(formatarDistancia(12.6), 'a 13 km');
});

test('agrupa anúncios no mesmo ponto num único marcador', () => {
  const grupos = agruparPorLocal([
    { id: 1, lat: -30.0346, lng: -51.2177 },
    { id: 2, lat: -30.03461, lng: -51.21771 },
    { id: 3, lat: -29.9178, lng: -51.1839 },
  ]);

  assert.equal(grupos.length, 2);
  const centro = grupos.find((g) => g.itens.length === 2);
  assert.deepEqual(centro.itens.map((i) => i.id), [1, 2]);
});

test('limites cobrem todos os pontos e são nulos sem pontos', () => {
  assert.deepEqual(limitesDosPontos([PORTO_ALEGRE, CANOAS]), [[-51.2177, -30.0346], [-51.1839, -29.9178]]);
  assert.equal(limitesDosPontos([]), null);
});

test('círculo do raio de busca é um polígono fechado com o raio certo', () => {
  const circulo = circuloGeoJSON(PORTO_ALEGRE, 10, 32);
  const anel = circulo.geometry.coordinates[0];

  assert.equal(circulo.geometry.type, 'Polygon');
  assert.equal(anel.length, 33);
  assert.deepEqual(anel[0], anel[anel.length - 1]);
  for (const [lng, lat] of anel) {
    const km = distanciaKm(PORTO_ALEGRE, { lat, lng });
    assert.ok(Math.abs(km - 10) < 0.05, `ponto a ${km} km`);
  }
});
