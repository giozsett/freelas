import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import useSugestoesCatalogo from '../hooks/useSugestoesCatalogo';
import { normalizarTexto } from '../utils/filtrarAnuncios';

// Campo de texto que só aceita opções de uma lista fixa: quem digita filtra as
// opções e precisa escolher uma delas (até `maximo`). As escolhidas viram chips.
// Com `sugestoes`, também mostra opções parecidas pelo significado.
export default function SeletorMultiplo({ valor, onChange, opcoes, maximo, singular, plural, feminino = false, dica, sugestoes }) {
  const [query, setQuery] = useState('');
  const [aberto, setAberto] = useState(false);
  const [um, nenhum, encontrado, escolhidos] = feminino
    ? ['uma', 'Nenhuma', 'encontrada', 'escolhidas']
    : ['um', 'Nenhum', 'encontrado', 'escolhidos'];

  const limiteAtingido = valor.length >= maximo;
  const termo = normalizarTexto(query);
  const disponiveis = opcoes.filter(
    (opcao) => !valor.includes(opcao) && (!termo || normalizarTexto(opcao).includes(termo)),
  );
  const semanticas = useSugestoesCatalogo(query, { ...sugestoes, ativo: Boolean(sugestoes) && aberto && !limiteAtingido });
  const disponiveisSemanticas = semanticas
    .map((r) => r.nome)
    .filter((nome) => opcoes.includes(nome) && !valor.includes(nome) && !disponiveis.includes(nome));

  const adicionar = (opcao) => {
    if (limiteAtingido || valor.includes(opcao)) return;
    onChange([...valor, opcao]);
    setQuery('');
    setAberto(false);
  };

  const remover = (opcao) => onChange(valor.filter((o) => o !== opcao));

  return (
    <div style={{ position: 'relative', zIndex: 20 }}>
      <div className="combo">
        <div className="combo__field">
          <input
            type="text"
            className="input combo__input"
            style={{ width: '100%' }}
            placeholder={limiteAtingido ? `Limite de ${maximo} ${plural} atingido` : `Digite para buscar ${um} ${singular}...`}
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
                const primeira = disponiveis[0] || disponiveisSemanticas[0];
                if (primeira) adicionar(primeira);
              } else if (e.key === 'Escape') {
                setAberto(false);
              }
            }}
          />
        </div>
        {aberto && !limiteAtingido && (
          <ul className="combo__list">
            {disponiveis.map((opcao) => (
              <li
                key={opcao}
                className="combo__option"
                onMouseDown={(e) => { e.preventDefault(); adicionar(opcao); }}
              >
                {opcao}
              </li>
            ))}
            {disponiveisSemanticas.length > 0 && <li className="combo__secao">Pelo significado</li>}
            {disponiveisSemanticas.map((opcao) => (
              <li
                key={`sugestao-${opcao}`}
                className="combo__option"
                onMouseDown={(e) => { e.preventDefault(); adicionar(opcao); }}
              >
                {opcao}
              </li>
            ))}
            {!disponiveis.length && !disponiveisSemanticas.length && (
              <li className="combo__empty">{nenhum} {singular} {encontrado} — escolha {um} da lista</li>
            )}
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
        {dica || `${valor.length} de ${maximo} ${plural} ${escolhidos}. Só é possível escolher ${plural} da lista.`}
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
  feminino: PropTypes.bool,
  dica: PropTypes.string,
  // Liga as sugestões pelo significado (busca semântica do catálogo)
  sugestoes: PropTypes.shape({
    tipo: PropTypes.oneOf(['categoria', 'habilidade']),
    categoria: PropTypes.string,
  }),
};
