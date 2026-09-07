import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRole } from '../context/ContextoPapel';
import AdCard from '../components/CardAnuncio';
import {
  CATEGORIAS_SERVICO,
  HABILIDADES_POR_CATEGORIA,
  HABILIDADES_PROFISSIONAIS,
} from '../constants/options';

const PAGE_SIZE = 9;

function ComboFiltro({ label, placeholder, valor, opcoes, onSelecionar, hint }) {
  const [query, setQuery] = useState(valor);
  const [aberto, setAberto] = useState(false);

  useEffect(() => { setQuery(valor); }, [valor]);

  const opcoesFiltradas = (query.trim()
    ? opcoes.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : opcoes
  ).slice(0, 8);

  return (
    <div className="combo">
      <label className="combo__label">{label}</label>
      <div className="combo__field">
        <input
          type="text"
          className="input combo__input"
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setQuery(e.target.value); setAberto(true); }}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
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
              onMouseDown={(e) => { e.preventDefault(); setQuery(opcao); setAberto(false); onSelecionar(opcao); }}
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

ComboFiltro.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  valor: PropTypes.string.isRequired,
  opcoes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelecionar: PropTypes.func.isRequired,
  hint: PropTypes.string,
};

function Pagination({ page, count, onChange }) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (count === 0) return null;
  return (
    <div className="ads-pagination">
      <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeft size={17} />
      </button>
      <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong> · {count} anúncios</span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Próxima página">
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function Home() {
  const { role } = useRole();
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [minPriceFilter, setMinPriceFilter] = useState(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState(1000);
  const [pagina, setPagina] = useState(1);
  const habilidadesDoFiltro = categoryFilter
    ? HABILIDADES_POR_CATEGORIA[categoryFilter] || HABILIDADES_PROFISSIONAIS
    : HABILIDADES_PROFISSIONAIS;

  useEffect(() => {
    fetch('http://localhost:8000/api/ads/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Normalize backend data to match frontend expectations
          const normalizedAds = data.map(ad => ({
            id: ad.id,
            type: ad.role, // 'freelancer' or 'contractor'
            title: ad.title || ad.titulo || '',
            author_id: ad.author,
            author: ad.author_name || 'Usuário Desconhecido',
            rating: ad.author_rating || 4.5,
            reviews: 10, // Mock reviews
            category: ad.category || '',
            skills: ad.skills || [],
            distance: 5, // Mock distance
            locationType: ad.location_type,
            address: ad.address,
            estado: ad.estado || '',
            city: ad.cidade || '',
            price: ad.price || (ad.valor ? String(ad.valor) : '0'),
            priceUnit: ad.price_unit,
            createdAt: ad.created_at,
            status: ad.status_anuncio // Map status
          }));
          setAds(normalizedAds);
        } else {
          setAds([]);
        }
        setAdsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ads:', err);
        setAds([]);
        setAdsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json()).then(setEstados).catch(() => setEstados([]));
  }, []);

  useEffect(() => {
    if (!estadoFilter) {
      setCidades([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoFilter}/municipios?orderBy=nome`)
      .then(res => res.json()).then(setCidades).catch(() => setCidades([]));
  }, [estadoFilter]);

  useEffect(() => {
    setPagina(1);
  }, [role, categoryFilter, skillFilter, locationTypeFilter, estadoFilter, cidadeFilter, searchQuery, minPriceFilter, maxPriceFilter]);

  const filteredAds = ads.filter((ad) => {
    // Show opposite ads: if I am freelancer, I want to see contractor ads
    const targetAdType = role === 'freelancer' ? 'contractor' : 'freelancer';
    if (ad.type !== targetAdType) return false;

    // Hide approved/finalized ads from the main page
    if (ad.status && ad.status !== 'Em aberto' && ad.status !== 'Ativo' && ad.status !== '') return false;

    if (categoryFilter && ad.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (skillFilter && (!Array.isArray(ad.skills) || !ad.skills.some(skill => skill.toLowerCase() === skillFilter.toLowerCase()))) return false;
    if (locationTypeFilter && ad.locationType !== locationTypeFilter) return false;
    if (locationTypeFilter === 'presencial' && estadoFilter && ad.estado !== estadoFilter) return false;
    if (locationTypeFilter === 'presencial' && cidadeFilter && ad.city !== cidadeFilter) return false;

    // Price filter (numerical, with 1000 representing 'No limit')
    const adPrice = parseFloat(ad.price) || 0;
    if (adPrice < Number(minPriceFilter)) return false;
    if (Number(maxPriceFilter) < 1000 && adPrice > Number(maxPriceFilter)) return false;

    if (searchQuery && ad.title) {
      const matchTitle = ad.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTitle) return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filteredAds.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaAtual - 1) * PAGE_SIZE;
  const adsDaPagina = filteredAds.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  return (
    <div className="sidebar-layout ads-page-layout">
      {/* Sidebar Filters */}
      <aside className="card filters-sidebar">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Filtros</h2>

        <div className="filter-groups">
          <section className="filter-group">
            <h3>Categoria e habilidades</h3>
            <ComboFiltro
              label="Categoria"
              placeholder="Buscar categoria..."
              valor={categoryFilter}
              opcoes={CATEGORIAS_SERVICO}
              onSelecionar={(valor) => { setCategoryFilter(valor); setSkillFilter(''); }}
            />
            <ComboFiltro
              label="Habilidade"
              placeholder="Buscar habilidade..."
              valor={skillFilter}
              opcoes={habilidadesDoFiltro}
              onSelecionar={setSkillFilter}
              hint={categoryFilter
                ? `${habilidadesDoFiltro.length} habilidades em "${categoryFilter}".`
                : `${habilidadesDoFiltro.length} habilidades — digite para buscar.`}
            />
          </section>
          <section className="filter-group">
            <h3>Pesquisar anúncio</h3>
            <div className="filter-search">
              <Search size={17} aria-hidden="true" />
              <input type="text" className="input" aria-label="Pesquisar pelo título" placeholder="Digite parte do título" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </section>
          <section className="filter-group">
            <h3>Modalidade</h3>
            <div className="work-mode-toggle">
              <button type="button" className={`work-mode-option${locationTypeFilter === '' ? ' selected' : ''}`} onClick={() => setLocationTypeFilter('')}>Todos</button>
              <button type="button" className={`work-mode-option${locationTypeFilter === 'remoto' ? ' selected' : ''}`} onClick={() => setLocationTypeFilter('remoto')}>Remoto</button>
              <button type="button" className={`work-mode-option${locationTypeFilter === 'presencial' ? ' selected' : ''}`} onClick={() => setLocationTypeFilter('presencial')}>Presencial</button>
            </div>
          </section>
          <section className="filter-group">
            <h3>Localização</h3>
            <select className="input filter-select" value={estadoFilter} disabled={locationTypeFilter !== 'presencial'} onChange={(e) => { setEstadoFilter(e.target.value); setCidadeFilter(''); }}>
              <option value="">Todos os estados</option>
              {estados.map(estado => <option key={estado.id} value={estado.sigla}>{estado.nome}</option>)}
            </select>
            <select className="input filter-select" value={cidadeFilter} disabled={locationTypeFilter !== 'presencial' || !estadoFilter} onChange={(e) => setCidadeFilter(e.target.value)}>
              <option value="">Todas as cidades</option>
              {cidades.map(cidade => <option key={cidade.id} value={cidade.nome}>{cidade.nome}</option>)}
            </select>
          </section>
          <section className="filter-group">
            <h3>Faixa de valor</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>R$ {minPriceFilter}</span>
              <span>{Number(maxPriceFilter) === 1000 ? 'Sem máximo' : `R$ ${maxPriceFilter}`}</span>
            </div>
            <label className="range-label">Mínimo</label>
            <input type="range" min="0" max="1000" step="10" className="slider" value={minPriceFilter} onChange={(e) => setMinPriceFilter(Math.min(Number(e.target.value), Number(maxPriceFilter)))} />
            <label className="range-label">Máximo</label>
            <input type="range" min="0" max="1000" step="10" className="slider" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(Math.max(Number(e.target.value), Number(minPriceFilter)))} />
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="fade-in">
        <div className="ads-toolbar">
          <h2>{role === 'freelancer' ? 'Vagas de Contratantes' : 'Serviços Freelancers'}</h2>
          {!adsLoading && filteredAds.length > 0 && (
            <span className="ads-toolbar__count">
              Mostrando {inicioPagina + 1}–{Math.min(inicioPagina + PAGE_SIZE, filteredAds.length)} de {filteredAds.length} anúncios
            </span>
          )}
        </div>

        {adsLoading ? (
          <div className="ads-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card ad-list-card">
                <div className="skeleton skeleton-text" style={{ width: '70%', height: '1.2rem' }} />
                <div className="skeleton skeleton-text" style={{ width: '45%' }} />
                <div className="skeleton skeleton-text" style={{ width: '90%' }} />
                <div className="skeleton" style={{ height: '2rem', width: '40%', marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="ads-grid stagger" key={`${categoryFilter}-${skillFilter}-${locationTypeFilter}-${estadoFilter}-${cidadeFilter}-${searchQuery}-${minPriceFilter}-${maxPriceFilter}-${paginaAtual}`}>
              {adsDaPagina.map(ad => <AdCard key={ad.id} ad={ad} />)}
              {filteredAds.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <h3>Ops! Nenhum anúncio encontrado.</h3>
                  <p>Tente ajustar seus filtros ou mude de aba.</p>
                </div>
              )}
            </div>
            <Pagination page={paginaAtual} count={filteredAds.length} onChange={setPagina} />
          </>
        )}
      </main>
    </div>
  );
}
