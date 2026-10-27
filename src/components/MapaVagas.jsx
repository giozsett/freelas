import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import useMapa from '../hooks/useMapa';
import {
  agruparPorLocal,
  circuloGeoJSON,
  distanciaKm,
  formatarDistancia,
  limitesDosPontos,
  temCoordenadas,
} from '../utils/geo';

const FONTE_RAIO = 'raio-busca';
const MAXIMO_NO_BALAO = 6;

// Balão de um marcador. Montado com textContent: título e preço são texto
// digitado pelos usuários e nunca viram HTML.
function criarBalao(itens, origem, navegar) {
  const raiz = document.createElement('div');
  raiz.className = 'mapa-balao';

  const cabecalho = document.createElement('p');
  cabecalho.className = 'mapa-balao__cabecalho';
  const local = [itens[0].bairro, itens[0].city].filter(Boolean).join(', ');
  cabecalho.textContent = itens.length > 1 ? `${itens.length} vagas${local ? ` · ${local}` : ''}` : local;
  raiz.appendChild(cabecalho);

  const lista = document.createElement('ul');
  for (const ad of itens.slice(0, MAXIMO_NO_BALAO)) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `/ad/${ad.id}`;
    link.className = 'mapa-balao__titulo';
    link.textContent = ad.title;
    link.addEventListener('click', (evento) => {
      evento.preventDefault();
      navegar(`/ad/${ad.id}`);
    });
    const detalhe = document.createElement('span');
    detalhe.className = 'mapa-balao__detalhe';
    const unidade = ad.priceUnit && ad.priceUnit !== 'total' ? ad.priceUnit : '';
    const distancia = origem ? ` · ${formatarDistancia(distanciaKm(origem, ad))}` : '';
    detalhe.textContent = `R$ ${ad.price}${unidade}${distancia}`;
    item.append(link, detalhe);
    lista.appendChild(item);
  }
  raiz.appendChild(lista);

  if (itens.length > MAXIMO_NO_BALAO) {
    const mais = document.createElement('p');
    mais.className = 'mapa-balao__mais';
    mais.textContent = `+${itens.length - MAXIMO_NO_BALAO} na lista de vagas`;
    raiz.appendChild(mais);
  }
  return raiz;
}

// O MapLibre posiciona o marcador com `transform` no próprio elemento: a gota
// girada fica num elemento de dentro, senão o giro some
function criarPino(quantidade) {
  const pino = document.createElement('button');
  pino.type = 'button';
  pino.className = 'mapa-pino';
  pino.setAttribute('aria-label', quantidade > 1 ? `${quantidade} vagas neste local` : 'Vaga neste local');
  const gota = document.createElement('span');
  gota.className = 'mapa-pino__gota';
  pino.appendChild(gota);
  if (quantidade > 1) {
    const contador = document.createElement('span');
    contador.className = 'mapa-pino__contador';
    contador.textContent = String(quantidade);
    pino.appendChild(contador);
  }
  return pino;
}

// Mapa das vagas presenciais da página inicial: um pino por local, o ponto
// de origem da busca e o círculo do raio escolhido nos filtros.
export default function MapaVagas({ anuncios, origem, raioKm, foco, semLocal }) {
  const containerRef = useRef(null);
  const navegar = useNavigate();
  const { mapa, maplibregl, versaoEstilo, cores, erro } = useMapa(containerRef, { cooperativo: true });

  // A página inicial recalcula a lista a cada render: os pinos só são
  // refeitos quando mudam as vagas ou seus locais
  const chaveAnuncios = anuncios.map((ad) => `${ad.id}:${ad.latitude}:${ad.longitude}`).join('|');
  const pontos = useMemo(
    () => anuncios
      .map((ad) => ({ ...ad, lat: Number(ad.latitude), lng: Number(ad.longitude) }))
      .filter((ad) => temCoordenadas({ lat: ad.latitude, lng: ad.longitude })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chaveAnuncios resume `anuncios`
    [chaveAnuncios],
  );

  // Pinos das vagas
  useEffect(() => {
    if (!mapa || !maplibregl) return undefined;
    const marcadores = agruparPorLocal(pontos).map((grupo) => {
      const popup = new maplibregl.Popup({ offset: 28, maxWidth: '280px', className: 'mapa-popup' })
        .setDOMContent(criarBalao(grupo.itens, origem, navegar));
      return new maplibregl.Marker({ element: criarPino(grupo.itens.length), anchor: 'bottom' })
        .setLngLat([grupo.lng, grupo.lat])
        .setPopup(popup)
        .addTo(mapa);
    });
    return () => marcadores.forEach((m) => m.remove());
  }, [mapa, maplibregl, pontos, origem, navegar]);

  // Ponto de origem da busca ("minha localização" ou centro da cidade)
  useEffect(() => {
    if (!mapa || !maplibregl || !temCoordenadas(origem)) return undefined;
    const elemento = document.createElement('div');
    elemento.className = 'mapa-origem';
    elemento.title = origem.rotulo || 'Origem da busca';
    const marcador = new maplibregl.Marker({ element: elemento }).setLngLat([origem.lng, origem.lat]).addTo(mapa);
    return () => marcador.remove();
  }, [mapa, maplibregl, origem]);

  // Círculo do raio: camada do próprio mapa, refeita a cada troca de estilo/cor
  useEffect(() => {
    if (!mapa || !versaoEstilo) return undefined;
    const temRaio = raioKm > 0 && temCoordenadas(origem);
    if (temRaio) {
      mapa.addSource(FONTE_RAIO, { type: 'geojson', data: circuloGeoJSON(origem, raioKm) });
      mapa.addLayer({
        id: `${FONTE_RAIO}-area`, type: 'fill', source: FONTE_RAIO,
        paint: { 'fill-color': cores.primaria, 'fill-opacity': 0.1 },
      });
      mapa.addLayer({
        id: `${FONTE_RAIO}-borda`, type: 'line', source: FONTE_RAIO,
        paint: { 'line-color': cores.primaria, 'line-width': 2, 'line-dasharray': [2, 1.5] },
      });
    }
    return () => {
      // O mapa pode ter sido desmontado ou o estilo trocado antes da limpeza
      if (!temRaio || !mapa.getStyle()) return;
      if (mapa.getLayer(`${FONTE_RAIO}-borda`)) mapa.removeLayer(`${FONTE_RAIO}-borda`);
      if (mapa.getLayer(`${FONTE_RAIO}-area`)) mapa.removeLayer(`${FONTE_RAIO}-area`);
      if (mapa.getSource(FONTE_RAIO)) mapa.removeSource(FONTE_RAIO);
    };
  }, [mapa, versaoEstilo, origem, raioKm, cores.primaria]);

  // Enquadramento: raio > cidade escolhida > todas as vagas > Brasil.
  // Só muda quando muda o que deve aparecer, não a cada tecla da busca.
  const idsVisiveis = pontos.map((p) => p.id).join(',');
  useEffect(() => {
    if (!mapa) return;
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const margem = { top: 40, bottom: 40, left: 40, right: 40 };
    if (raioKm > 0 && temCoordenadas(origem)) {
      const anel = circuloGeoJSON(origem, raioKm).geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
      mapa.fitBounds(limitesDosPontos(anel), { padding: margem, animate: animar });
    } else if (temCoordenadas(foco)) {
      mapa.flyTo({ center: [foco.lng, foco.lat], zoom: 11, animate: animar });
    } else if (temCoordenadas(origem)) {
      mapa.flyTo({ center: [origem.lng, origem.lat], zoom: 11, animate: animar });
    } else if (pontos.length) {
      mapa.fitBounds(limitesDosPontos(pontos), { padding: margem, maxZoom: 12, animate: animar });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsVisiveis resume `pontos`
  }, [mapa, origem, raioKm, foco, idsVisiveis]);

  if (erro) {
    return (
      <div className="mapa-vagas mapa-vagas--erro">
        <MapPinOff size={22} aria-hidden="true" />
        <p>Não foi possível carregar o mapa agora. Os filtros e a lista de vagas continuam funcionando.</p>
      </div>
    );
  }

  return (
    <div className="mapa-vagas">
      <div ref={containerRef} className="mapa-vagas__mapa" />
      <p className="mapa-vagas__legenda">
        {pontos.length === 0
          ? 'Nenhuma vaga presencial com local no mapa para estes filtros.'
          : `${pontos.length} ${pontos.length === 1 ? 'vaga presencial' : 'vagas presenciais'} no mapa`}
        {semLocal > 0 && ` · ${semLocal} sem local definido ${semLocal === 1 ? 'aparece' : 'aparecem'} só na lista`}
      </p>
    </div>
  );
}

const pontoPropType = PropTypes.shape({
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  rotulo: PropTypes.string,
});

MapaVagas.propTypes = {
  anuncios: PropTypes.arrayOf(PropTypes.object).isRequired,
  origem: pontoPropType,
  raioKm: PropTypes.number,
  foco: pontoPropType,
  semLocal: PropTypes.number,
};
