import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { LocateFixed, MapPinOff } from 'lucide-react';
import useMapa from '../hooks/useMapa';

const ZOOM_ENDERECO = 17;
const ZOOM_CIDADE = 13;
// Abaixo disso (~1 m) o ponto recebido é o mesmo que o mapa já mostra
const MESMO_PONTO = 0.00001;

// Mapa para confirmar o local da vaga, como nos apps de entrega: o pino fica
// parado no centro e a pessoa arrasta o mapa até o lugar certo.
export default function MapaConfirmarLocal({ ponto, aproximado, onMover, onUsarMinhaLocalizacao, localizando }) {
  const containerRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const { mapa, erro } = useMapa(containerRef, {
    centro: ponto || undefined,
    zoom: ponto ? (aproximado ? ZOOM_CIDADE : ZOOM_ENDERECO) : undefined,
  });
  const onMoverRef = useRef(onMover);
  onMoverRef.current = onMover;

  // Só os movimentos feitos pela pessoa mudam o ponto; os do código
  // (flyTo abaixo) levam a marca `programatico`
  useEffect(() => {
    if (!mapa) return undefined;
    const aoComecar = (evento) => { if (!evento.programatico) setArrastando(true); };
    const aoTerminar = (evento) => {
      setArrastando(false);
      if (evento.programatico) return;
      const { lat, lng } = mapa.getCenter();
      onMoverRef.current({ lat, lng });
    };
    mapa.on('movestart', aoComecar);
    mapa.on('moveend', aoTerminar);
    return () => {
      mapa.off('movestart', aoComecar);
      mapa.off('moveend', aoTerminar);
    };
  }, [mapa]);

  // Ponto novo vindo de fora (endereço digitado, GPS): leva o mapa até ele
  useEffect(() => {
    if (!mapa || !ponto) return;
    const atual = mapa.getCenter();
    if (Math.abs(atual.lat - ponto.lat) < MESMO_PONTO && Math.abs(atual.lng - ponto.lng) < MESMO_PONTO) return;
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mapa.flyTo(
      { center: [ponto.lng, ponto.lat], zoom: aproximado ? ZOOM_CIDADE : ZOOM_ENDERECO, animate: animar },
      { programatico: true },
    );
  }, [mapa, ponto, aproximado]);

  if (erro) {
    return (
      <div className="mapa-confirmar mapa-confirmar--erro">
        <MapPinOff size={22} aria-hidden="true" />
        <p>Não foi possível carregar o mapa. A vaga será publicada com a localização do centro da cidade.</p>
      </div>
    );
  }

  return (
    <div className="mapa-confirmar">
      <div ref={containerRef} className="mapa-confirmar__mapa" />
      <div className={`mapa-confirmar__pino${arrastando ? ' mapa-confirmar__pino--erguido' : ''}`} aria-hidden="true">
        <span className="mapa-confirmar__pino-cabeca" />
        <span className="mapa-confirmar__pino-sombra" />
      </div>
      <button
        type="button"
        className="mapa-confirmar__gps"
        onClick={onUsarMinhaLocalizacao}
        disabled={localizando}
      >
        <LocateFixed size={16} aria-hidden="true" />
        {localizando ? 'Localizando...' : 'Estou no local'}
      </button>
    </div>
  );
}

MapaConfirmarLocal.propTypes = {
  ponto: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  // Ponto no centro da cidade (endereço não encontrado): zoom mais aberto
  aproximado: PropTypes.bool,
  onMover: PropTypes.func.isRequired,
  onUsarMinhaLocalizacao: PropTypes.func.isRequired,
  localizando: PropTypes.bool,
};
