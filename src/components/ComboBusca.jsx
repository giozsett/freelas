import { useState, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

// Escolha única com busca: quem digita filtra a lista, mas o valor só muda ao
// clicar numa opção. Usado nos filtros da página inicial e no formulário de
// anúncio, para que os dois ofereçam as mesmas opções do mesmo jeito.
export default function ComboBusca({ label, placeholder, valor, opcoes, onSelecionar, hint, obrigatorio = false }) {
  const id = useId();
  const [query, setQuery] = useState(valor);
  const [aberto, setAberto] = useState(false);

  useEffect(() => { setQuery(valor); }, [valor]);

  // Com uma opção já escolhida, focar no campo mostra a lista inteira (rolável)
  const opcoesFiltradas = query.trim() && query !== valor
    ? opcoes.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : opcoes;

  const escolher = (opcao) => {
    setQuery(opcao);
    setAberto(false);
    onSelecionar(opcao);
  };

  return (
    <div className="combo">
      <label className="combo__label" htmlFor={id}>
        {label} {obrigatorio && <span style={{ color: 'var(--danger-color)' }}>*</span>}
      </label>
      <div className="combo__field">
        <input
          id={id}
          type="text"
          className="input combo__input"
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setQuery(e.target.value); setAberto(true); }}
          // Texto digitado sem escolher uma opção não vale: volta ao valor atual
          onBlur={() => setTimeout(() => { setAberto(false); setQuery(valor); }, 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (aberto && opcoesFiltradas.length) escolher(opcoesFiltradas[0]);
            } else if (e.key === 'Escape') {
              setAberto(false);
            }
          }}
        />
        {valor && (
          <button
            type="button"
            className="combo__clear"
            aria-label={`Limpar ${label.toLowerCase()}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(''); onSelecionar(''); }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {aberto && (
        <ul className="combo__list">
          {opcoesFiltradas.length ? opcoesFiltradas.map(opcao => (
            <li
              key={opcao}
              className="combo__option"
              style={opcao === valor ? { fontWeight: 600 } : undefined}
              onMouseDown={(e) => { e.preventDefault(); escolher(opcao); }}
            >
              {opcao}
            </li>
          )) : <li className="combo__empty">Nenhuma opção encontrada</li>}
        </ul>
      )}
      {hint && <p className="combo__hint">{hint}</p>}
    </div>
  );
}

ComboBusca.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  valor: PropTypes.string.isRequired,
  opcoes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelecionar: PropTypes.func.isRequired,
  hint: PropTypes.string,
  obrigatorio: PropTypes.bool,
};
