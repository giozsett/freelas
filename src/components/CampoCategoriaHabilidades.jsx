import PropTypes from 'prop-types';
import ComboBusca from './ComboBusca';
import SeletorMultiplo from './SeletorMultiplo';
import Opcional from './Opcional';
import {
  CATEGORIAS_SERVICO,
  HABILIDADES_POR_CATEGORIA,
  MAX_HABILIDADES_ANUNCIO,
} from '../constants/options';

// Categoria + habilidades do anúncio. Usa as mesmas listas e o mesmo campo de
// busca dos filtros da página inicial: o que dá para publicar é exatamente o
// que dá para filtrar.
export default function CampoCategoriaHabilidades({ categoria, habilidades, onChange, categoriaAnterior }) {
  const habilidadesDaCategoria = HABILIDADES_POR_CATEGORIA[categoria] || [];

  const trocarCategoria = (novaCategoria) => {
    // Habilidades de outra categoria não aparecem no filtro desta: descarta
    const permitidas = HABILIDADES_POR_CATEGORIA[novaCategoria] || [];
    onChange({
      categoria: novaCategoria,
      habilidades: habilidades.filter((h) => permitidas.includes(h)),
    });
  };

  return (
    <>
      <ComboBusca
        label="Categoria"
        placeholder="Buscar categoria..."
        valor={categoria}
        opcoes={CATEGORIAS_SERVICO}
        sugestoes={{ tipo: 'categoria' }}
        onSelecionar={trocarCategoria}
        obrigatorio
        hint={categoriaAnterior && !categoria
          ? `A categoria "${categoriaAnterior}" não existe mais. Escolha uma da lista.`
          : 'Trocar a categoria remove as habilidades que não fazem parte dela.'}
      />
      <div>
        <label className="combo__label">
          Habilidades (máximo {MAX_HABILIDADES_ANUNCIO}) <Opcional />
        </label>
        {categoria ? (
          <SeletorMultiplo
            valor={habilidades}
            onChange={(novas) => onChange({ categoria, habilidades: novas })}
            opcoes={habilidadesDaCategoria}
            maximo={MAX_HABILIDADES_ANUNCIO}
            singular="habilidade"
            plural="habilidades"
            feminino
            sugestoes={{ tipo: 'habilidade', categoria }}
          />
        ) : (
          <p className="combo__hint">Escolha uma categoria para ver as habilidades.</p>
        )}
      </div>
    </>
  );
}

CampoCategoriaHabilidades.propTypes = {
  categoria: PropTypes.string.isRequired,
  habilidades: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  categoriaAnterior: PropTypes.string,
};
