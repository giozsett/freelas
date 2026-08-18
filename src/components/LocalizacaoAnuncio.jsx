import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const IBGE_API = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export default function LocalizacaoAnuncio({ value, onChange, cidadeObrigatoria = false }) {
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const atualizar = (campo, novoValor) => onChange({ ...value, [campo]: novoValor });

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

  return (
    <div className="location-fields">
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <label>Estado{cidadeObrigatoria ? ' *' : ''}</label>
          <select
            className="input"
            value={value.estado}
            onChange={(event) => onChange({ ...value, estado: event.target.value, cidade: '' })}
            required={cidadeObrigatoria}
          >
            <option value="">Selecione o estado</option>
            {estados.map((estado) => <option key={estado.id} value={estado.sigla}>{estado.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label>Cidade{cidadeObrigatoria ? ' *' : ''}</label>
          <select
            className="input"
            value={value.cidade}
            onChange={(event) => atualizar('cidade', event.target.value)}
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
          <label>Bairro</label>
          <input className="input" value={value.bairro} onChange={(event) => atualizar('bairro', event.target.value)} placeholder="Ex: Centro" />
        </div>
        <div className="location-field">
          <label>Rua ou logradouro</label>
          <input className="input" value={value.address} onChange={(event) => atualizar('address', event.target.value)} placeholder="Ex: Rua das Flores" />
        </div>
        <div className="location-field location-number-field">
          <label>Número</label>
          <input className="input" value={value.addressNumber} onChange={(event) => atualizar('addressNumber', event.target.value)} placeholder="123" />
        </div>
      </div>
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
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  cidadeObrigatoria: PropTypes.bool,
};
