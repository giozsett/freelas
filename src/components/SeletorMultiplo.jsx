import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

// Campo de texto que só aceita opções de uma lista fixa: quem digita filtra as
// opções e precisa escolher uma delas (até `maximo`). As escolhidas viram chips.
export default function SeletorMultiplo({ valor, onChange, opcoes, maximo, singular, plural }) {
  const [query, setQuery] = useState('');
  const [aberto, setAberto] = useState(false);

  const limiteAtingido = valor.length >= maximo;
  const termo = query.trim().toLowerCase();
  const disponiveis = opcoes.filter(
    (opcao) => !valor.includes(opcao) && (!termo || opcao.toLowerCase().includes(termo)),
  );

  const adicionar = (opcao) => {
    if (limiteAtingido || valor.includes(opcao)) return;
    onChange([...valor, opcao]);
    setQuery('');
    setAberto(false);
  };

  const remover = (opcao) => onChange(valor.filter((o) => o !== opcao));

  return (
    <div>
      <div className="combo">
        <div className="combo__field">
          <input
            type="text"
            className="input combo__input"
            style={{ width: '100%' }}
            placeholder={limiteAtingido ? `Limite de ${maximo} ${plural} atingido` : `Digite para buscar um ${singular}...`}
            aria-label={singular}
            autoComplete="off"
            disabled={limiteAtingido}
            value={query}
            onFocus={() => setAberto(true)}
            onChange={(e) => { setQuery(e.target.value); setAberto(true); }}
            onBlur={() => setTimeout(() => setAberto(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (disponiveis.length) adicionar(disponiveis[0]);
              } else if (e.key === 'Escape') {
                setAberto(false);
              }
            }}
          />
        </div>
        {aberto && !limiteAtingido && (
          <ul className="combo__list">
            {disponiveis.length ? disponiveis.map((opcao) => (
              <li
                key={opcao}
                className="combo__option"
                onMouseDown={(e) => { e.preventDefault(); adicionar(opcao); }}
              >
                {opcao}
              </li>
            )) : <li className="combo__empty">Nenhum {singular} encontrado — escolha um da lista</li>}
          </ul>
        )}
      </div>

      {valor.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.6rem' }}>
          {valor.map((opcao) => (
            <span key={opcao} className="badge purple" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {opcao}
              <button
                type="button"
                aria-label={`Remover ${opcao}`}
                onClick={() => remover(opcao)}
                style={{ display: 'grid', placeItems: 'center', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'inherit' }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="combo__hint">
        {valor.length} de {maximo} {plural} escolhidos. Só é possível escolher {plural} da lista.
      </p>
    </div>
  );
}

SeletorMultiplo.propTypes = {
  valor: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  opcoes: PropTypes.arrayOf(PropTypes.string).isRequired,
  maximo: PropTypes.number.isRequired,
  singular: PropTypes.string.isRequired,
  plural: PropTypes.string.isRequired,
};
