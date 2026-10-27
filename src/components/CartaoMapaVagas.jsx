import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp, LocateFixed, MapPin } from 'lucide-react';
import MapaVagas from './MapaVagas';

// Cartão do mapa na página inicial. O mapa fica desligado até a pessoa
// permitir o acesso à localização no navegador (vale para visitantes também:
// a permissão é do navegador, não da conta).
export default function CartaoMapaVagas({ habilitado, localizando, erro, onPermitir, ...mapa }) {
  const [aberto, setAberto] = useState(true);

  return (
    <section className="card mapa-card" aria-labelledby="mapa-card-titulo">
      <header className="mapa-card__cabecalho">
        <span className="mapa-card__icone"><MapPin size={20} aria-hidden="true" /></span>
        <div className="mapa-card__titulos">
          <h3 id="mapa-card-titulo">Vagas perto de você</h3>
          <p>
            {habilitado
              ? `Buscando a partir de: ${mapa.origem?.rotulo || 'todas as vagas presenciais'}`
              : 'Veja no mapa as vagas presenciais da sua região.'}
          </p>
        </div>
        {habilitado && (
          <button
            type="button"
            className="btn btn-secondary mapa-card__alternar"
            aria-expanded={aberto}
            onClick={() => setAberto((atual) => !atual)}
          >
            {aberto ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {aberto ? 'Ocultar mapa' : 'Mostrar mapa'}
          </button>
        )}
      </header>

      {!habilitado && (
        <div className="mapa-card__convite">
          <p>
            Permita o acesso à sua localização para ver as vagas presenciais próximas e filtrar por distância.
            Ela fica só neste navegador e não é salva no Freelas.
          </p>
          <button type="button" className="btn mapa-card__permitir" onClick={onPermitir} disabled={localizando}>
            <LocateFixed size={17} aria-hidden="true" />
            {localizando ? 'Aguardando a permissão do navegador...' : 'Permitir acesso à minha localização'}
          </button>
          {erro && <p className="form-error mapa-card__erro" role="alert">{erro}</p>}
        </div>
      )}

      {habilitado && aberto && <MapaVagas {...mapa} />}
    </section>
  );
}

CartaoMapaVagas.propTypes = {
  habilitado: PropTypes.bool.isRequired,
  localizando: PropTypes.bool,
  erro: PropTypes.string,
  onPermitir: PropTypes.func.isRequired,
  // Repassados ao MapaVagas
  anuncios: PropTypes.arrayOf(PropTypes.object).isRequired,
  origem: PropTypes.object,
  raioKm: PropTypes.number,
  foco: PropTypes.object,
  semLocal: PropTypes.number,
};
