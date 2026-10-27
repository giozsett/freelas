// Endereço → coordenadas e coordenadas → endereço, só com serviços gratuitos
// e sem chave: IBGE (centro de cada município) e Nominatim (OpenStreetMap).
// O Nominatim aceita no máximo 1 requisição por segundo e proíbe busca a cada
// tecla: as chamadas passam por uma fila e só acontecem depois que a pessoa
// para de digitar ou de arrastar o mapa.

const IBGE_MALHAS = 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const INTERVALO_NOMINATIM_MS = 1100;

const cache = new Map();
let filaNominatim = Promise.resolve();

async function buscarJson(url) {
  if (cache.has(url)) return cache.get(url);
  const resposta = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const dados = await resposta.json();
  cache.set(url, dados);
  return dados;
}

function buscarNoNominatim(url) {
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  const vez = filaNominatim.then(() => buscarJson(url));
  // A próxima chamada espera esta terminar e mais o intervalo mínimo
  filaNominatim = vez
    .catch(() => null)
    .then(() => new Promise((resolve) => setTimeout(resolve, INTERVALO_NOMINATIM_MS)));
  return vez;
}

// Centro do município pelo código do IBGE (o mesmo id da lista de cidades)
export async function centroDaCidade(codigoIbge) {
  const dados = await buscarJson(`${IBGE_MALHAS}/${codigoIbge}/metadados`);
  const centroide = dados?.[0]?.centroide;
  return centroide ? { lat: centroide.latitude, lng: centroide.longitude } : null;
}

export async function buscarEndereco({ address, addressNumber, bairro, cidade, estado }) {
  const params = new URLSearchParams({
    format: 'jsonv2', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR',
  });
  if (address) {
    params.set('street', [addressNumber, address].filter(Boolean).join(' '));
    params.set('city', cidade);
    params.set('state', estado);
    params.set('country', 'Brasil');
  } else {
    // O Nominatim não tem campo estruturado para bairro
    params.set('q', [bairro, cidade, estado, 'Brasil'].filter(Boolean).join(', '));
  }
  const resultados = await buscarNoNominatim(`${NOMINATIM}/search?${params}`);
  const primeiro = resultados?.[0];
  return primeiro ? { lat: Number(primeiro.lat), lng: Number(primeiro.lon) } : null;
}

export async function enderecoDoPonto({ lat, lng }) {
  const params = new URLSearchParams({
    format: 'jsonv2', lat: lat.toFixed(6), lon: lng.toFixed(6), zoom: '18', 'accept-language': 'pt-BR',
  });
  return enderecoDoNominatim(await buscarNoNominatim(`${NOMINATIM}/reverse?${params}`));
}

export function enderecoDoNominatim(resposta) {
  const partes = resposta?.address;
  if (!partes) return null;
  const uf = (partes['ISO3166-2-lvl4'] || '').replace(/^BR-/, '');
  return {
    address: partes.road || partes.pedestrian || '',
    addressNumber: partes.house_number || '',
    bairro: partes.suburb || partes.neighbourhood || partes.quarter || partes.city_district || '',
    cidade: partes.city || partes.town || partes.village || partes.municipality || '',
    estado: uf,
  };
}

export function textoDoEndereco({ address, addressNumber, bairro }) {
  const rua = [address, addressNumber].filter(Boolean).join(', ');
  return [rua, bairro].filter(Boolean).join(' · ');
}
