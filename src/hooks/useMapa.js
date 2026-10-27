import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ContextoTema';

// Mapas do OpenFreeMap: gratuitos, sem chave e sem cadastro. O estilo
// acompanha o tema do Freelas (claro/escuro).
const ESTILOS = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export const CENTRO_BRASIL = { lat: -14.24, lng: -51.93 };

const TEXTOS_DO_MAPA = {
  'AttributionControl.ToggleAttribution': 'Mostrar créditos do mapa',
  'GeolocateControl.FindMyLocation': 'Usar minha localização',
  'GeolocateControl.LocationNotAvailable': 'Localização indisponível',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Marcador',
  'NavigationControl.ResetBearing': 'Apontar para o norte',
  'NavigationControl.ZoomIn': 'Aproximar',
  'NavigationControl.ZoomOut': 'Afastar',
  'Popup.Close': 'Fechar',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
};

// Os estilos mostram os nomes em inglês ("Brazil"): troca pelo nome em
// português do OpenStreetMap, ou pelo nome local quando não houver
const NOME_EM_PORTUGUES = ['coalesce', ['get', 'name:pt'], ['get', 'name']];

function traduzirRotulos(mapa) {
  for (const camada of mapa.getStyle().layers) {
    const texto = camada.layout?.['text-field'];
    // Números de casa e placas de rodovia (ex.: BR-116) continuam como estão
    if (camada.type === 'symbol' && texto && JSON.stringify(texto).includes('name')) {
      mapa.setLayoutProperty(camada.id, 'text-field', NOME_EM_PORTUGUES);
    }
  }
}

// As camadas desenhadas pelo MapLibre (ex.: círculo do raio) não leem
// variáveis CSS: copia os tokens do tema depois da transição de cor do papel
// (0.8s em index.css)
function lerCores() {
  const estilo = getComputedStyle(document.documentElement);
  const ler = (nome) => estilo.getPropertyValue(nome).trim();
  return { primaria: ler('--primary'), superficie: ler('--surface-color'), texto: ler('--text-color') };
}

function useCoresDoTema() {
  const [cores, setCores] = useState(lerCores);
  useEffect(() => {
    let espera;
    const observador = new MutationObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(() => setCores(lerCores()), 850);
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-role', 'data-theme'] });
    return () => {
      observador.disconnect();
      clearTimeout(espera);
    };
  }, []);
  return cores;
}

// Cria o mapa dentro de `containerRef`. `versaoEstilo` muda sempre que o
// estilo termina de carregar (inclusive ao trocar o tema), para quem desenha
// camadas próprias desenhá-las de novo.
// - cooperativo: rolagem só aproxima com Ctrl e, no celular, move com dois dedos
// - zoomPelaRolagem: false deixa a rolagem do mouse sempre para a página
//   (zoom pelos botões, duplo clique ou pinça)
export default function useMapa(containerRef, {
  centro = CENTRO_BRASIL, zoom = 3.4, cooperativo = false, zoomPelaRolagem = true,
} = {}) {
  const { theme } = useTheme();
  const cores = useCoresDoTema();
  const mapaRef = useRef(null);
  const [biblioteca, setBiblioteca] = useState(null);
  const [versaoEstilo, setVersaoEstilo] = useState(0);
  const [erro, setErro] = useState(false);
  const temaInicial = useRef(theme);
  const opcoesIniciais = useRef({ centro, zoom, cooperativo, zoomPelaRolagem });

  useEffect(() => {
    let cancelado = false;
    let mapa;
    // Carregado só quando o mapa aparece: a biblioteca é grande
    Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
      .then(([modulo]) => {
        if (cancelado || !containerRef.current) return;
        const maplibregl = modulo.default;
        const { centro: c, zoom: z, cooperativo: coop, zoomPelaRolagem: rolagem } = opcoesIniciais.current;
        mapa = new maplibregl.Map({
          container: containerRef.current,
          style: ESTILOS[temaInicial.current] || ESTILOS.light,
          center: [c.lng, c.lat],
          zoom: z,
          attributionControl: { compact: true },
          cooperativeGestures: coop,
          scrollZoom: rolagem,
          dragRotate: false,
          pitchWithRotate: false,
          locale: TEXTOS_DO_MAPA,
        });
        mapa.touchZoomRotate.disableRotation();
        mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapa.on('style.load', () => {
          traduzirRotulos(mapa);
          setVersaoEstilo((v) => v + 1);
        });
        mapa.on('error', (evento) => console.error('Mapa:', evento.error));
        mapaRef.current = mapa;
        setBiblioteca(maplibregl);
      })
      .catch((falha) => {
        // Sem WebGL ou sem internet: a página continua funcionando sem o mapa
        console.error('Não foi possível carregar o mapa:', falha);
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
      mapa?.remove();
      mapaRef.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || temaInicial.current === theme) return;
    temaInicial.current = theme;
    mapa.setStyle(ESTILOS[theme] || ESTILOS.light);
  }, [theme, biblioteca]);

  return { mapa: biblioteca ? mapaRef.current : null, maplibregl: biblioteca, versaoEstilo, cores, erro };
}
