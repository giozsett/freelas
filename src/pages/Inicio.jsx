import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRole } from '../context/ContextoPapel';
import AdCard from '../components/CardAnuncio';
import ComboBusca from '../components/ComboBusca';
import SeletorMultiplo from '../components/SeletorMultiplo';
import {
  CATEGORIAS_SERVICO,
  HABILIDADES_POR_CATEGORIA,
  HABILIDADES_PROFISSIONAIS,
} from '../constants/options';
import { anuncioPassaNosFiltros } from '../utils/filtrarAnuncios';
import useSugestoesCatalogo from '../hooks/useSugestoesCatalogo';

const PAGE_SIZE = 9;
const MAX_HABILIDADES_FILTRO = 5;

// Só contratantes publicam anúncios: a página lista vagas para todo mundo,
// muda apenas a chamada conforme quem está vendo.
const SUBTITULO_POR_PAPEL = {
  freelancer: 'Encontre vagas publicadas por contratantes e envie sua candidatura.',
  contractor: 'Vagas publicadas por pessoas e empresas contratantes. Publique a sua em "Criar anúncio".',
};
const SUBTITULO_VISITANTE = 'Vagas publicadas por pessoas e empresas contratantes. Crie sua conta para se candidatar ou contratar.';

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
  const [skillsFilter, setSkillsFilter] = useState([]);
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
            title: ad.title || ad.titulo || '',
            description: ad.description || ad.descricao || '',
            author_id: ad.author,
            author: ad.author_name || 'Usuário Desconhecido',
            authorPlan: ad.author_plan,
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
  }, [categoryFilter, skillsFilter, locationTypeFilter, estadoFilter, cidadeFilter, searchQuery, minPriceFilter, maxPriceFilter]);

  // Habilidades parecidas com o texto pesquisado ("cuidar do meu filho" → Babá)
  const habilidadesRelacionadas = useSugestoesCatalogo(searchQuery, { tipo: 'habilidade' }).map((r) => r.nome);

  const filteredAds = ads.filter((ad) => anuncioPassaNosFiltros(ad, {
    categoria: categoryFilter,
    habilidades: skillsFilter,
    busca: searchQuery,
    modalidade: locationTypeFilter,
    estado: estadoFilter,
    cidade: cidadeFilter,
    precoMinimo: minPriceFilter,
    precoMaximo: maxPriceFilter,
    habilidadesRelacionadas,
  }));

  const trocarCategoria = (categoria) => {
    setCategoryFilter(categoria);
    // Mantém só as habilidades que existem na nova categoria
    if (categoria) {
      const permitidas = HABILIDADES_POR_CATEGORIA[categoria] || [];
      setSkillsFilter((atuais) => atuais.filter((h) => permitidas.includes(h)));
    }
  };

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
            <ComboBusca
              label="Categoria"
              placeholder="Buscar categoria..."
              valor={categoryFilter}
              opcoes={CATEGORIAS_SERVICO}
              sugestoes={{ tipo: 'categoria' }}
              onSelecionar={trocarCategoria}
            />
            <div>
              <span className="combo__label">Habilidades</span>
              <SeletorMultiplo
                valor={skillsFilter}
                onChange={setSkillsFilter}
                opcoes={habilidadesDoFiltro}
                maximo={MAX_HABILIDADES_FILTRO}
                singular="habilidade"
                plural="habilidades"
                feminino
                sugestoes={{ tipo: 'habilidade', categoria: categoryFilter || undefined }}
                dica={skillsFilter.length > 1
                  ? 'Mostra anúncios que pedem pelo menos uma delas.'
                  : `${habilidadesDoFiltro.length} habilidades${categoryFilter ? ` em "${categoryFilter}"` : ''}. Escolha até ${MAX_HABILIDADES_FILTRO}.`}
              />
            </div>
          </section>
          <section className="filter-group">
            <h3>Pesquisar anúncio</h3>
            <div className="filter-search">
              <Search size={17} aria-hidden="true" />
              <input type="text" className="input" aria-label="Pesquisar no título e na descrição" placeholder="Título ou descrição" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
          <div>
            <h2>Vagas</h2>
            <p className="ads-toolbar__subtitulo">{SUBTITULO_POR_PAPEL[role] || SUBTITULO_VISITANTE}</p>
          </div>
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
            <div className="ads-grid stagger" key={`${categoryFilter}-${skillsFilter.join(',')}-${locationTypeFilter}-${estadoFilter}-${cidadeFilter}-${searchQuery}-${minPriceFilter}-${maxPriceFilter}-${paginaAtual}`}>
              {adsDaPagina.map(ad => <AdCard key={ad.id} ad={ad} />)}
              {filteredAds.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <h3>Ops! Nenhum anúncio encontrado.</h3>
                  <p>Tente ajustar seus filtros.</p>
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
