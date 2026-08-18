import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useRole } from '../context/ContextoPapel';
import AdCard from '../components/CardAnuncio';
import {
  CATEGORIAS_SERVICO,
  HABILIDADES_POR_CATEGORIA,
  HABILIDADES_PROFISSIONAIS,
} from '../constants/options';

export default function Home() {
  const { role } = useRole();
  const [ads, setAds] = useState([]);
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
            status: ad.status_anuncio // Map status
          }));
          setAds(normalizedAds);
        } else {
          setAds([]);
        }
      })
      .catch(err => {
        console.error('Error fetching ads:', err);
        setAds([]);
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

  return (
    <div className="sidebar-layout ads-page-layout">
      {/* Sidebar Filters */}
      <aside className="card filters-sidebar" style={{ position: 'sticky', top: '6rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Filtros</h2>
        
        <div className="filter-groups">
          <section className="filter-group">
            <h3>Categoria e habilidades</h3>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Categoria</label>
            <select className="input filter-select" value={categoryFilter} onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSkillFilter('');
            }}>
              <option value="">Todas as Categorias</option>
              {CATEGORIAS_SERVICO.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Habilidade</label>
            <select className="input filter-select" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
              <option value="">Todas as Habilidades</option>
              {habilidadesDoFiltro.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>
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
      <main>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--primary)' }}>
          {role === 'freelancer' ? 'Vagas de Contratantes' : 'Serviços Freelancers'}
        </h2>

        <div className="ads-grid">
          {filteredAds.map(ad => <AdCard key={ad.id} ad={{...ad, price: `R$ ${ad.price}` }} />)}
          {filteredAds.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Ops! Nenhum anúncio encontrado.</h3>
              <p>Tente ajustar seus filtros ou mude de aba.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
