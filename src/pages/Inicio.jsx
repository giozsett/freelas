import { useState, useEffect } from 'react';
import { useRole } from '../context/ContextoPapel';
import AdCard from '../components/CardAnuncio';
import { CATEGORIAS_SERVICO, HABILIDADES_PROFISSIONAIS } from '../constants/options';

export default function Home() {
  const { role } = useRole();
  const [ads, setAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState(1000);
  const [distanceFilter, setDistanceFilter] = useState(50);

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
            city: 'Digital', // Mock city
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

  const filteredAds = ads.filter((ad) => {
    // Show opposite ads: if I am freelancer, I want to see contractor ads
    const targetAdType = role === 'freelancer' ? 'contractor' : 'freelancer';
    if (ad.type !== targetAdType) return false;
    
    // Hide approved/finalized ads from the main page
    if (ad.status && ad.status !== 'Em aberto' && ad.status !== 'Ativo' && ad.status !== '') return false;
    
    if (categoryFilter && ad.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (skillFilter && (!Array.isArray(ad.skills) || !ad.skills.some(skill => skill.toLowerCase() === skillFilter.toLowerCase()))) return false;
    
    // Price filter (numerical, with 1000 representing 'No limit')
    const adPrice = parseFloat(ad.price) || 0;
    const maxPrice = parseFloat(priceFilter) || 1000;
    if (maxPrice < 1000 && adPrice > maxPrice) return false;

    // Distance filter (with 50 representing 'No limit')
    const maxDistance = parseFloat(distanceFilter) || 50;
    if (maxDistance < 50 && ad.distance > maxDistance) return false;

    if (searchQuery && ad.title) {
      const matchTitle = ad.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="sidebar-layout">
      {/* Sidebar Filters */}
      <aside className="card" style={{ position: 'sticky', top: '6rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Filtros</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Categoria</label>
            <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas as Categorias</option>
              {CATEGORIAS_SERVICO.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Habilidade</label>
            <select className="input" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
              <option value="">Todas as Habilidades</option>
              {HABILIDADES_PROFISSIONAIS.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Pesquisa</label>
            <input type="text" className="input" placeholder="Ex: Título" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Valor Máx.</label>
              <span>{parseInt(priceFilter) === 1000 ? 'Sem limite' : `R$ ${priceFilter}`}</span>
            </div>
            <input type="range" min="0" max="1000" step="10" className="slider" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Distância Máx.</label>
              <span>{parseInt(distanceFilter) === 50 ? 'Sem limite' : `${distanceFilter} km`}</span>
            </div>
            <input type="range" min="1" max="50" step="1" className="slider" value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)} />
          </div>
          <button className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>Aplicar Filtros</button>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--holo-salmon)' }}>
          {role === 'freelancer' ? 'Vagas de Contratantes' : 'Serviços Freelancers'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
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
