// Regras dos filtros da página inicial, separadas da tela para serem testadas.
import { distanciaKm, temCoordenadas } from './geo.js';

// Sem acentos e em minúsculas: "Edição" e "edicao" combinam na busca
export function normalizarTexto(texto) {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const STATUS_VISIVEIS = ['', 'Em aberto', 'Ativo'];

export function anuncioPassaNosFiltros(ad, filtros) {
  const {
    categoria, habilidades, busca, modalidade, estado, cidade, precoMinimo, precoMaximo,
    habilidadesRelacionadas = [], origem = null, raioKm = 0,
  } = filtros;
  const habilidadesDoAnuncio = (Array.isArray(ad.skills) ? ad.skills : []).map(normalizarTexto);

  // Anúncios aprovados/finalizados não aparecem na página inicial
  if (ad.status && !STATUS_VISIVEIS.includes(ad.status)) return false;

  if (categoria && normalizarTexto(ad.category) !== normalizarTexto(categoria)) return false;

  // Várias habilidades escolhidas: basta o anúncio pedir uma delas
  if (habilidades.length && !habilidades.some((h) => habilidadesDoAnuncio.includes(normalizarTexto(h)))) return false;

  if (modalidade && ad.locationType !== modalidade) return false;
  // Com raio, vale a distância até a origem (cidade escolhida ou "minha
  // localização"), mesmo que a vaga fique na cidade vizinha
  if (modalidade === 'presencial' && raioKm > 0 && temCoordenadas(origem)) {
    const local = { lat: ad.latitude, lng: ad.longitude };
    if (!temCoordenadas(local) || distanciaKm(origem, local) > raioKm) return false;
  } else {
    if (modalidade === 'presencial' && estado && ad.estado !== estado) return false;
    if (modalidade === 'presencial' && cidade && ad.city !== cidade) return false;
  }

  // 1000 no máximo significa "sem limite"
  const preco = parseFloat(ad.price) || 0;
  if (preco < Number(precoMinimo)) return false;
  if (Number(precoMaximo) < 1000 && preco > Number(precoMaximo)) return false;

  // Busca: todas as palavras no texto do anúncio, ou o anúncio pede uma das
  // habilidades que a busca semântica achou parecidas com o que foi digitado
  const palavras = normalizarTexto(busca).split(/\s+/).filter(Boolean);
  if (palavras.length) {
    const texto = normalizarTexto(`${ad.title} ${ad.description} ${ad.category} ${habilidadesDoAnuncio.join(' ')}`);
    const achouPeloTexto = palavras.every((p) => texto.includes(p));
    const achouPeloSignificado = habilidadesRelacionadas.some((h) => habilidadesDoAnuncio.includes(normalizarTexto(h)));
    if (!achouPeloTexto && !achouPeloSignificado) return false;
  }
  return true;
}
