import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, MapPin } from 'lucide-react';
import Opcional from './Opcional';
import MapaConfirmarLocal from './MapaConfirmarLocal';
import { arredondarCoordenada, distanciaKm } from '../utils/geo';
import { buscarEndereco, centroDaCidade, enderecoDoPonto, textoDoEndereco } from '../utils/geocodificacao';

const IBGE_API = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const ESPERA_DIGITACAO_MS = 900;
// Endereço achado a mais que isso do centro da cidade é de outro lugar com o mesmo nome
const DISTANCIA_MAXIMA_DA_CIDADE_KM = 60;

const MENSAGENS_ORIGEM = {
  buscando: 'Procurando o endereço no mapa...',
  endereco: 'Pino colocado pelo endereço digitado. Arraste o mapa se ele não estiver no lugar certo.',
  cidade: 'Pino no centro da cidade. Arraste o mapa até o local do trabalho ou preencha o endereço.',
  'cidade-sem-endereco': 'Não encontramos esse endereço no mapa: o pino está no centro da cidade. Arraste o mapa até o local certo.',
  manual: 'Pino ajustado por você.',
  gps: 'Pino colocado pela localização do seu aparelho.',
  salvo: 'Local salvo neste anúncio.',
  erro: 'Não foi possível localizar a cidade no mapa agora. A vaga pode ser publicada mesmo assim.',
};

// `onChange` recebe um objeto ou uma função (prev) => novo, como o setState:
// as buscas de endereço terminam depois e não podem apagar o que foi digitado.
export default function LocalizacaoAnuncio({ value, onChange, cidadeObrigatoria = false }) {
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [origemPonto, setOrigemPonto] = useState(value.latitude != null ? 'salvo' : '');
  const [sugestao, setSugestao] = useState(null);
  const [localizando, setLocalizando] = useState(false);
  const esperaDigitacao = useRef(null);
  const ultimaBusca = useRef(0);

  const atualizar = (campos) => onChange((anterior) => ({ ...anterior, ...campos }));

  useEffect(() => {
    fetch(`${IBGE_API}/estados?orderBy=nome`)
      .then((res) => res.json())
      .then(setEstados)
      .catch(() => setEstados([]));
  }, []);

  useEffect(() => {
    if (!value.estado) {
      setCidades([]);
      return;
    }
    setCarregandoCidades(true);
    fetch(`${IBGE_API}/estados/${value.estado}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then(setCidades)
      .catch(() => setCidades([]))
      .finally(() => setCarregandoCidades(false));
  }, [value.estado]);

  // A edição carrega o anúncio depois da primeira renderização
  useEffect(() => {
    if (value.latitude != null && !origemPonto) setOrigemPonto('salvo');
  }, [value.latitude, origemPonto]);

  useEffect(() => () => clearTimeout(esperaDigitacao.current), []);

  // Anúncio antigo, salvo antes do mapa: localiza assim que a lista de cidades chega
  useEffect(() => {
    if (value.cidade && value.latitude == null && !origemPonto && cidades.length) localizar(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando a lista de cidades carrega
  }, [cidades]);

  const localizar = async (local) => {
    const busca = ++ultimaBusca.current;
    const cidade = cidades.find((c) => c.nome === local.cidade);
    if (!cidade) return;
    setOrigemPonto('buscando');
    setSugestao(null);

    let centro = null;
    let ponto = null;
    try {
      centro = await centroDaCidade(cidade.id);
      if (local.address || local.bairro) {
        const achado = await buscarEndereco(local);
        if (achado && (!centro || distanciaKm(centro, achado) <= DISTANCIA_MAXIMA_DA_CIDADE_KM)) ponto = achado;
      }
    } catch (falha) {
      console.error('Busca de endereço:', falha);
    }
    if (busca !== ultimaBusca.current) return; // a pessoa já mudou o endereço

    const final = ponto || centro;
    if (!final) {
      setOrigemPonto('erro');
      atualizar({ latitude: null, longitude: null, localConfirmado: false });
      return;
    }
    setOrigemPonto(ponto ? 'endereco' : (local.address || local.bairro ? 'cidade-sem-endereco' : 'cidade'));
    atualizar({
      latitude: arredondarCoordenada(final.lat),
      longitude: arredondarCoordenada(final.lng),
      localConfirmado: false,
    });
  };

  // Campo de endereço mudou: espera a pessoa parar de digitar para buscar
  const mudarEndereco = (campos) => {
    const novo = { ...value, ...campos };
    atualizar({ ...campos, localConfirmado: false });
    clearTimeout(esperaDigitacao.current);
    if (!novo.cidade) {
      ultimaBusca.current += 1;
      setOrigemPonto('');
      setSugestao(null);
      atualizar({ latitude: null, longitude: null });
      return;
    }
    esperaDigitacao.current = setTimeout(() => localizar(novo), ESPERA_DIGITACAO_MS);
  };

  // Endereço mais próximo do pino, para a pessoa corrigir o texto se quiser
  const sugerirEndereco = async (ponto) => {
    const busca = ++ultimaBusca.current;
    try {
      const endereco = await enderecoDoPonto(ponto);
      if (busca === ultimaBusca.current && endereco && (endereco.address || endereco.bairro)) setSugestao(endereco);
    } catch {
      // Sem sugestão: o pino continua valendo
    }
  };

  const moverPino = (ponto, origem = 'manual') => {
    const latitude = arredondarCoordenada(ponto.lat);
    const longitude = arredondarCoordenada(ponto.lng);
    // Zoom pelos botões + e − também dispara o fim do movimento, sem mudar o centro
    if (latitude === value.latitude && longitude === value.longitude) return;
    clearTimeout(esperaDigitacao.current);
    setOrigemPonto(origem);
    setSugestao(null);
    atualizar({ latitude, longitude, localConfirmado: false });
    sugerirEndereco(ponto);
  };

  const usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) return;
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        moverPino({ lat: coords.latitude, lng: coords.longitude }, 'gps');
        setLocalizando(false);
      },
      () => setLocalizando(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const usarSugestao = () => {
    atualizar({
      address: sugestao.address,
      addressNumber: sugestao.addressNumber || value.addressNumber,
      bairro: sugestao.bairro || value.bairro,
    });
    setSugestao(null);
  };

  const temPonto = value.latitude != null && value.longitude != null;
  const sugestaoEmOutraCidade = sugestao?.cidade && value.cidade && sugestao.cidade !== value.cidade;

  return (
    <div className="location-fields">
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <label>Estado{cidadeObrigatoria && <> <span style={{ color: 'var(--danger-color)' }}>*</span></>}</label>
          <select
            className="input"
            value={value.estado}
            onChange={(event) => mudarEndereco({ estado: event.target.value, cidade: '' })}
            required={cidadeObrigatoria}
          >
            <option value="">Selecione o estado</option>
            {estados.map((estado) => <option key={estado.id} value={estado.sigla}>{estado.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label>Cidade{cidadeObrigatoria && <> <span style={{ color: 'var(--danger-color)' }}>*</span></>}</label>
          <select
            className="input"
            value={value.cidade}
            onChange={(event) => mudarEndereco({ cidade: event.target.value })}
            disabled={!value.estado || carregandoCidades}
            required={cidadeObrigatoria}
          >
            <option value="">{carregandoCidades ? 'Carregando...' : 'Selecione a cidade'}</option>
            {cidades.map((cidade) => <option key={cidade.id} value={cidade.nome}>{cidade.nome}</option>)}
          </select>
        </div>
      </div>
      <div className="location-address-grid">
        <div className="location-field">
          <label>Bairro <Opcional /></label>
          <input className="input" value={value.bairro} onChange={(event) => mudarEndereco({ bairro: event.target.value })} placeholder="Ex: Centro" />
        </div>
        <div className="location-field">
          <label>Rua ou logradouro <Opcional /></label>
          <input className="input" value={value.address} onChange={(event) => mudarEndereco({ address: event.target.value })} placeholder="Ex: Rua das Flores" />
        </div>
        <div className="location-field location-number-field">
          <label>Número <Opcional /></label>
          <input className="input" value={value.addressNumber} onChange={(event) => mudarEndereco({ addressNumber: event.target.value })} placeholder="123" />
        </div>
      </div>

      {value.cidade && (
        <div className="confirmar-local">
          <div className="confirmar-local__cabecalho">
            <span className="confirmar-local__icone"><MapPin size={18} aria-hidden="true" /></span>
            <div>
              <h4>Confira o local no mapa</h4>
              <p className="confirmar-local__status" aria-live="polite">{MENSAGENS_ORIGEM[origemPonto] || MENSAGENS_ORIGEM.buscando}</p>
            </div>
          </div>

          <MapaConfirmarLocal
            ponto={temPonto ? { lat: Number(value.latitude), lng: Number(value.longitude) } : null}
            aproximado={origemPonto === 'cidade' || origemPonto === 'cidade-sem-endereco'}
            onMover={moverPino}
            onUsarMinhaLocalizacao={usarMinhaLocalizacao}
            localizando={localizando}
          />

          {sugestao && (
            <div className="confirmar-local__sugestao">
              <p>
                <span>Perto do pino:</span> {textoDoEndereco(sugestao)}
                {sugestaoEmOutraCidade && <em> (fica em {sugestao.cidade}, não em {value.cidade})</em>}
              </p>
              <button type="button" className="btn btn-secondary" onClick={usarSugestao}>Usar este endereço</button>
            </div>
          )}

          {temPonto && (value.localConfirmado ? (
            <p className="confirmar-local__confirmado">
              <CheckCircle size={16} aria-hidden="true" /> Local confirmado
            </p>
          ) : (
            <button type="button" className="btn confirmar-local__botao" onClick={() => atualizar({ localConfirmado: true })}>
              <CheckCircle size={17} aria-hidden="true" /> Confirmar local
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

LocalizacaoAnuncio.propTypes = {
  value: PropTypes.shape({
    estado: PropTypes.string,
    cidade: PropTypes.string,
    bairro: PropTypes.string,
    address: PropTypes.string,
    addressNumber: PropTypes.string,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    localConfirmado: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  cidadeObrigatoria: PropTypes.bool,
};
