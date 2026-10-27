// Cálculos de distância e formas para o mapa de vagas, separados da tela
// para serem testados. Pontos usam { lat, lng }; o MapLibre usa [lng, lat].

const RAIO_TERRA_KM = 6371;
const radianos = (graus) => (graus * Math.PI) / 180;
const graus = (rad) => (rad * 180) / Math.PI;

// A API devolve latitude/longitude como texto ("-30.034600")
export function temCoordenadas(ponto) {
  if (!ponto || ponto.lat === null || ponto.lng === null || ponto.lat === '' || ponto.lng === '') return false;
  return Number.isFinite(Number(ponto.lat)) && Number.isFinite(Number(ponto.lng));
}

// Distância em linha reta (fórmula de Haversine)
export function distanciaKm(a, b) {
  const dLat = radianos(Number(b.lat) - Number(a.lat));
  const dLng = radianos(Number(b.lng) - Number(a.lng));
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(radianos(Number(a.lat))) * Math.cos(radianos(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// O banco guarda 6 casas decimais (cerca de 10 cm)
export function arredondarCoordenada(valor) {
  return Math.round(Number(valor) * 1e6) / 1e6;
}

export function formatarDistancia(km) {
  if (km < 1) return `a ${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `a ${km.toFixed(1).replace('.', ',')} km`;
  return `a ${Math.round(km)} km`;
}

// Anúncios a menos de ~100 m um do outro (ex.: vários no centro da mesma
// cidade) viram um marcador só, com a lista no balão
export function agruparPorLocal(itens) {
  const grupos = new Map();
  for (const item of itens) {
    const chave = `${Number(item.lat).toFixed(3)}|${Number(item.lng).toFixed(3)}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  }
  return [...grupos.values()].map((doGrupo) => ({
    lat: doGrupo.reduce((soma, i) => soma + Number(i.lat), 0) / doGrupo.length,
    lng: doGrupo.reduce((soma, i) => soma + Number(i.lng), 0) / doGrupo.length,
    itens: doGrupo,
  }));
}

// [[oeste, sul], [leste, norte]], no formato do fitBounds do MapLibre
export function limitesDosPontos(pontos) {
  if (!pontos.length) return null;
  const lngs = pontos.map((p) => Number(p.lng));
  const lats = pontos.map((p) => Number(p.lat));
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

// Polígono GeoJSON aproximando o círculo do raio de busca
export function circuloGeoJSON(centro, raioKm, passos = 64) {
  const lat1 = radianos(Number(centro.lat));
  const lng1 = radianos(Number(centro.lng));
  const angular = raioKm / RAIO_TERRA_KM;
  const anel = [];
  for (let i = 0; i < passos; i += 1) {
    const direcao = (2 * Math.PI * i) / passos;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(direcao),
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(direcao) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
    anel.push([graus(lng2), graus(lat2)]);
  }
  anel.push(anel[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anel] } };
}
