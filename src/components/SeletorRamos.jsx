import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { RAMOS_EMPRESA, MAX_RAMOS_EMPRESA } from '../constants/options';

// Campo de texto que só aceita ramos da lista fixa: quem digita filtra as
// opções e precisa escolher uma delas (até MAX_RAMOS_EMPRESA).
export default function SeletorRamos({ valor, onChange }) {
  const [query, setQuery] = useState('');
  const [aberto, setAberto] = useState(false);

  const limiteAtingido = valor.length >= MAX_RAMOS_EMPRESA;
  const termo = query.trim().toLowerCase();
  const opcoes = RAMOS_EMPRESA.filter(
    (ramo) => !valor.includes(ramo) && (!termo || ramo.toLowerCase().includes(termo)),
  );

  const adicionar = (ramo) => {
    if (limiteAtingido || valor.includes(ramo)) return;
    onChange([...valor, ramo]);
    setQuery('');
    setAberto(false);
  };

  const remover = (ramo) => onChange(valor.filter((r) => r !== ramo));

  return (
    <div>
      <div className="combo">
        <div className="combo__field">
          <input
            type="text"
            className="input combo__input"
            style={{ width: '100%' }}
            placeholder={limiteAtingido ? `Limite de ${MAX_RAMOS_EMPRESA} ramos atingido` : 'Digite para buscar um ramo...'}
            aria-label="Ramo de atuação"
            autoComplete="off"
            disabled={limiteAtingido}
            value={query}
            onFocus={() => setAberto(true)}
            onChange={(e) => { setQuery(e.target.value); setAberto(true); }}
            onBlur={() => setTimeout(() => setAberto(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (opcoes.length) adicionar(opcoes[0]);
              } else if (e.key === 'Escape') {
                setAberto(false);
              }
            }}
          />
        </div>
        {aberto && !limiteAtingido && (
          <ul className="combo__list">
            {opcoes.length ? opcoes.map((ramo) => (
              <li
                key={ramo}
                className="combo__option"
                onMouseDown={(e) => { e.preventDefault(); adicionar(ramo); }}
              >
                {ramo}
              </li>
            )) : <li className="combo__empty">Nenhum ramo encontrado — escolha um da lista</li>}
          </ul>
        )}
      </div>

      {valor.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.6rem' }}>
          {valor.map((ramo) => (
            <span key={ramo} className="badge purple" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {ramo}
              <button
                type="button"
                aria-label={`Remover ${ramo}`}
                onClick={() => remover(ramo)}
                style={{ display: 'grid', placeItems: 'center', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'inherit' }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="combo__hint">
        {valor.length} de {MAX_RAMOS_EMPRESA} ramos escolhidos. Só é possível escolher ramos da lista.
      </p>
    </div>
  );
}

SeletorRamos.propTypes = {
  valor: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
};
