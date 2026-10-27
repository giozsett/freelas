import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, ChevronLeft, ChevronRight, LocateFixed, X } from 'lucide-react';
import { useRole } from '../context/ContextoPapel';
import AdCard from '../components/CardAnuncio';
import ComboBusca from '../components/ComboBusca';
import CartaoMapaVagas from '../components/CartaoMapaVagas';
import SeletorMultiplo from '../components/SeletorMultiplo';
import {
  CATEGORIAS_SERVICO,
  HABILIDADES_POR_CATEGORIA,
  HABILIDADES_PROFISSIONAIS,
} from '../constants/options';
import { anuncioPassaNosFiltros } from '../utils/filtrarAnuncios';
import useSugestoesCatalogo from '../hooks/useSugestoesCatalogo';
import { distanciaKm, formatarDistancia, temCoordenadas } from '../utils/geo';
import { centroDaCidade } from '../utils/geocodificacao';

const PAGE_SIZE = 9;
const MAX_HABILIDADES_FILTRO = 5;
const RAIOS_KM = [5, 10, 25, 50, 100];
const RAIO_PADRAO_KM = 25;

// Códigos de erro da Geolocation API do navegador
const ERROS_LOCALIZACAO = {
  1: 'O navegador bloqueou o acesso à sua localização. Para liberar, clique no ícone ao lado do endereço do site, permita "Localização" e tente de novo.',
  2: 'Não foi possível descobrir sua localização agora. Tente de novo em instantes.',
  3: 'A localização demorou demais para responder. Tente de novo.',
};

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
  const [raioKm, setRaioKm] = useState(0);
  // Coordenadas liberadas pelo navegador: habilitam o mapa
  const [minhaLocalizacao, setMinhaLocalizacao] = useState(null);
  // A busca parte de você (e não da cidade escolhida)
  const [pertoDeMim, setPertoDeMim] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [centroCidade, setCentroCidade] = useState(null);
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
            locationType: ad.location_type,
            address: ad.address,
            bairro: ad.bairro || '',
            estado: ad.estado || '',
            city: ad.cidade || '',
            latitude: ad.latitude,
            longitude: ad.longitude,
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

  // Centro da cidade escolhida: enquadra o mapa e serve de origem do raio
  useEffect(() => {
    const cidade = cidades.find((c) => c.nome === cidadeFilter);
    if (!cidade) {
      setCentroCidade(null);
      return undefined;
    }
    let cancelado = false;
    centroDaCidade(cidade.id)
      .then((centro) => { if (!cancelado) setCentroCidade(centro); })
      .catch(() => { if (!cancelado) setCentroCidade(null); });
    return () => { cancelado = true; };
  }, [cidadeFilter, cidades]);

  useEffect(() => {
    setPagina(1);
  }, [categoryFilter, skillsFilter, locationTypeFilter, estadoFilter, cidadeFilter, searchQuery, minPriceFilter, maxPriceFilter, raioKm, pertoDeMim]);

  const origem = useMemo(() => {
    if (pertoDeMim && minhaLocalizacao) return { ...minhaLocalizacao, rotulo: 'Sua localização' };
    if (centroCidade) return { ...centroCidade, rotulo: cidadeFilter };
    return null;
  }, [pertoDeMim, minhaLocalizacao, centroCidade, cidadeFilter]);

  // Filtrar por local só faz sentido para vagas presenciais
  const filtrarPorLocal = () => setLocationTypeFilter('presencial');

  const buscarPertoDeMim = () => {
    setPertoDeMim(true);
    setEstadoFilter('');
    setCidadeFilter('');
    setRaioKm((atual) => atual || RAIO_PADRAO_KM);
    filtrarPorLocal();
  };

  // A primeira vez abre o pedido de permissão do navegador; depois de
  // permitido, o mapa fica habilitado e só troca a origem da busca
  const usarMinhaLocalizacao = () => {
    if (minhaLocalizacao) {
      buscarPertoDeMim();
      return;
    }
    if (!navigator.geolocation) {
      setErroLocalizacao('Este navegador não informa a localização.');
      return;
    }
    setLocalizando(true);
    setErroLocalizacao('');
    filtrarPorLocal(); // o cartão do mapa (e a mensagem de erro) só aparece fora do filtro "Remoto"
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMinhaLocalizacao({ lat: coords.latitude, lng: coords.longitude });
        buscarPertoDeMim();
        setLocalizando(false);
      },
      (falha) => {
        setErroLocalizacao(ERROS_LOCALIZACAO[falha.code] || ERROS_LOCALIZACAO[2]);
        setLocalizando(false);
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const deixarDeBuscarPertoDeMim = () => {
    setPertoDeMim(false);
    setRaioKm(0);
  };

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
    origem,
    raioKm,
  }));

  // Com uma origem, as vagas presenciais mais próximas vêm primeiro
  const distancias = new Map();
  if (origem && locationTypeFilter === 'presencial') {
    for (const ad of filteredAds) {
      const local = { lat: ad.latitude, lng: ad.longitude };
      if (temCoordenadas(local)) distancias.set(ad.id, distanciaKm(origem, local));
    }
    filteredAds.sort((a, b) => (distancias.get(a.id) ?? Infinity) - (distancias.get(b.id) ?? Infinity));
  }

  const presenciaisFiltrados = filteredAds.filter((ad) => ad.locationType === 'presencial');
  const presenciaisSemLocal = presenciaisFiltrados
    .filter((ad) => !temCoordenadas({ lat: ad.latitude, lng: ad.longitude })).length;

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
            {pertoDeMim ? (
              <div className="filtro-local__origem">
                <LocateFixed size={15} aria-hidden="true" />
                <span>Perto de você</span>
                <button type="button" onClick={deixarDeBuscarPertoDeMim} aria-label="Parar de buscar perto de você">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary filtro-local__botao" onClick={usarMinhaLocalizacao} disabled={localizando}>
                <LocateFixed size={15} aria-hidden="true" />
                {localizando ? 'Localizando...' : 'Usar minha localização'}
              </button>
            )}
            <select
              className="input filter-select"
              aria-label="Estado"
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                setCidadeFilter('');
                setPertoDeMim(false);
                setRaioKm(0);
                if (e.target.value) filtrarPorLocal();
              }}
            >
              <option value="">Todos os estados</option>
              {estados.map(estado => <option key={estado.id} value={estado.sigla}>{estado.nome}</option>)}
            </select>
            <select
              className="input filter-select"
              aria-label="Cidade"
              value={cidadeFilter}
              disabled={!estadoFilter}
              onChange={(e) => {
                setCidadeFilter(e.target.value);
                setPertoDeMim(false);
                if (!e.target.value) setRaioKm(0);
              }}
            >
              <option value="">Todas as cidades</option>
              {cidades.map(cidade => <option key={cidade.id} value={cidade.nome}>{cidade.nome}</option>)}
            </select>
            <select
              className="input filter-select"
              aria-label="Distância máxima"
              value={raioKm}
              disabled={!origem}
              onChange={(e) => { setRaioKm(Number(e.target.value)); filtrarPorLocal(); }}
            >
              <option value={0}>{origem ? (pertoDeMim ? 'Qualquer distância' : `Só em ${cidadeFilter}`) : 'Distância: escolha uma cidade'}</option>
              {RAIOS_KM.map((km) => <option key={km} value={km}>Até {km} km{pertoDeMim ? ' de você' : ` de ${cidadeFilter}`}</option>)}
            </select>
            <p className="filtro-local__dica">Filtrar por local mostra só as vagas presenciais.</p>
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

        {locationTypeFilter !== 'remoto' && !adsLoading && (
          <CartaoMapaVagas
            habilitado={Boolean(minhaLocalizacao)}
            localizando={localizando}
            erro={erroLocalizacao}
            onPermitir={usarMinhaLocalizacao}
            anuncios={presenciaisFiltrados}
            origem={origem}
            raioKm={locationTypeFilter === 'presencial' ? raioKm : 0}
            foco={raioKm > 0 ? null : centroCidade}
            semLocal={presenciaisSemLocal}
          />
        )}

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
            <div className="ads-grid stagger" key={`${categoryFilter}-${skillsFilter.join(',')}-${locationTypeFilter}-${estadoFilter}-${cidadeFilter}-${raioKm}-${pertoDeMim ? 'perto' : ''}-${searchQuery}-${minPriceFilter}-${maxPriceFilter}-${paginaAtual}`}>
              {adsDaPagina.map(ad => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  distancia={distancias.has(ad.id) ? formatarDistancia(distancias.get(ad.id)) : undefined}
                />
              ))}
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
