import { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import AdCard from '../components/AdCard';

const DUMMY_ADS = [
  // Freelancers
  { id: 1, type: 'freelancer', title: 'Adestrador de Cães Avançado', author: 'João Silva', rating: 4.8, category: 'Animais', skills: ['Adestramento', 'Passeio'], distance: 3, locationType: 'presencial', city: 'São Paulo', price: 80 },
  { id: 2, type: 'freelancer', title: 'Faxina Completa Residencial', author: 'Maria Souza', rating: 4.9, category: 'Serviços Domésticos', skills: ['Limpeza Pesada', 'Organização'], distance: 5, locationType: 'presencial', city: 'Rio de Janeiro', price: 150 },
  { id: 5, type: 'freelancer', title: 'Desenvolvedor React / Node.js', author: 'Carlos Mendes', rating: 5.0, category: 'Tecnologia', skills: ['Frontend', 'Backend', 'APIs'], distance: 25, locationType: 'remoto', city: '', price: 120 },
  { id: 6, type: 'freelancer', title: 'Aulas de Inglês - Todos os Níveis', author: 'Camila Ferreira', rating: 4.7, category: 'Educação', skills: ['Inglês', 'Conversação'], distance: 8, locationType: 'remoto', city: '', price: 60 },
  { id: 7, type: 'freelancer', title: 'Design de Marcas / Identidade Visual', author: 'Lucas Braga', rating: 4.9, category: 'Design', skills: ['Illustrator', 'Branding'], distance: 45, locationType: 'remoto', city: '', price: 450 },

  // Contractors
  { id: 3, type: 'contractor', title: 'Preciso de Pet Sitter para Fim de Semana', author: 'Ana Clara', rating: 5.0, category: 'Animais', skills: ['Pet Sitter'], distance: 2, locationType: 'presencial', address: 'Rua C, 400', city: 'Curitiba', price: 200 },
  { id: 4, type: 'contractor', title: 'Procuro diarista para sexta-feira', author: 'Roberto', rating: 4.5, category: 'Serviços Domésticos', skills: ['Limpeza Padrão'], distance: 10, locationType: 'presencial', address: 'Av. Paulista, 1000', city: 'São Paulo', price: 130 },
  { id: 8, type: 'contractor', title: 'Freelancer para manutenção de app mobile', author: 'Tech Startup XP', rating: 4.2, category: 'Tecnologia', skills: ['React Native', 'Bugs'], distance: 1, locationType: 'remoto', address: '', city: 'Digital', price: 300 },
  { id: 9, type: 'contractor', title: 'Preciso de reforço escolar em Matemática', author: 'Vitor S.', rating: 4.8, category: 'Educação', skills: ['Matemática', 'Ensino Fundamental'], distance: 12, locationType: 'presencial', address: 'Rua das Flores, 12', city: 'Belo Horizonte', price: 50 },
  { id: 10, type: 'contractor', title: 'Procuro criador de logos urgênte', author: 'Loja da Esquina', rating: 4.0, category: 'Design', skills: ['Logo', 'Canva', 'Photoshop'], distance: 30, locationType: 'remoto', address: '', city: 'Digital', price: 100 }
];

export default function Home() {
  const { role } = useRole();
  const [ads, setAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState(500);
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
            title: ad.title,
            author: ad.author_name || 'Usuário Desconhecido',
            rating: ad.author_rating || 4.5,
            reviews: 10, // Mock reviews
            category: ad.category,
            skills: ad.skills || [],
            distance: 5, // Mock distance
            locationType: ad.location_type,
            address: ad.address,
            city: 'Digital', // Mock city
            price: ad.price
          }));
          setAds(normalizedAds);
        } else {
          setAds(DUMMY_ADS);
        }
      })
      .catch(err => {
        console.error('Error fetching ads:', err);
        setAds(DUMMY_ADS);
      });
  }, []);

  const filteredAds = ads.filter((ad) => {
    // Show opposite ads: if I am freelancer, I want to see contractor ads
    const targetAdType = role === 'freelancer' ? 'contractor' : 'freelancer';
    if (ad.type !== targetAdType) return false;
    if (categoryFilter && ad.category.toLowerCase() !== categoryFilter) return false;
    if (ad.price > priceFilter) return false;
    if (ad.distance > distanceFilter) return false;
    if (searchQuery) {
      const matchTitle = ad.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSkill = ad.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchTitle && !matchSkill) return false;
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
              <option value="">Todas</option>
              <option value="animais">Animais</option>
              <option value="serviços domésticos">Serviços Domésticos</option>
              <option value="tecnologia">Tecnologia</option>
              <option value="educação">Educação</option>
              <option value="design">Design</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Pesquisa</label>
            <input type="text" className="input" placeholder="Ex: Título ou habilidade" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Valor Máx.</label>
              <span>R$ {priceFilter}</span>
            </div>
            <input type="range" min="0" max="1000" step="10" className="slider" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Distância Máx.</label>
              <span>{distanceFilter} km</span>
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
