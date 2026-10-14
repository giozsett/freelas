import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

// Escolha única com o mesmo visual do campo de ramo (.combo): campo + lista
// flutuante. Não aceita digitação — é um select, só que estilizado.
export default function SeletorUnico({ valor, opcoes, onChange, placeholder = 'Selecione...', ariaLabel }) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  // A primeira opção (valor vazio) permite voltar a "não informado"
  const todas = [{ valor: '', rotulo: placeholder }, ...opcoes];
  const selecionada = opcoes.find((o) => o.valor === valor);

  const abrir = () => {
    setAtivo(Math.max(0, todas.findIndex((o) => o.valor === valor)));
    setAberto(true);
  };

  const escolher = (opcao) => {
    onChange(opcao.valor);
    setAberto(false);
  };

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      setAberto(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!aberto) { abrir(); return; }
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setAtivo((i) => (i + passo + todas.length) % todas.length);
    } else if ((e.key === 'Enter' || e.key === ' ') && aberto) {
      e.preventDefault();
      escolher(todas[ativo]);
    }
  };

  return (
    <div className="combo">
      <div className="combo__field">
        <button
          type="button"
          className="input combo__input"
          style={{ textAlign: 'left', cursor: 'pointer', color: selecionada ? 'var(--text-color)' : 'var(--text-secondary)' }}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => (aberto ? setAberto(false) : abrir())}
          onKeyDown={aoTeclar}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
        >
          {selecionada ? selecionada.rotulo : placeholder}
        </button>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{ position: 'absolute', right: '0.75rem', pointerEvents: 'none', color: 'var(--text-secondary)' }}
        />
      </div>
      {aberto && (
        <ul className="combo__list" role="listbox">
          {todas.map((opcao, indice) => {
            const escolhida = opcao.valor === valor;
            return (
              <li
                key={opcao.valor || 'vazio'}
                role="option"
                aria-selected={escolhida}
                className="combo__option"
                style={{
                  ...(indice === ativo ? { background: 'var(--secondary)', color: 'var(--primary)' } : null),
                  ...(escolhida ? { fontWeight: 600 } : null),
                }}
                onMouseEnter={() => setAtivo(indice)}
                onMouseDown={(e) => { e.preventDefault(); escolher(opcao); }}
              >
                {opcao.rotulo}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

SeletorUnico.propTypes = {
  valor: PropTypes.string.isRequired,
  opcoes: PropTypes.arrayOf(PropTypes.shape({
    valor: PropTypes.string.isRequired,
    rotulo: PropTypes.string.isRequired,
  })).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
};
