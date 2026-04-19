import { Link } from 'react-router-dom';
import { CheckCircle, Zap, Star, Gem } from 'lucide-react';

export default function Plans() {
  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0/mês',
      ads: 2,
      color: 'var(--surface-color)',
      badge: null,
      icon: <Zap size={32} />
    },
    {
      id: 'gold',
      name: 'Gold',
      price: 'R$ 29,90/mês',
      ads: 10,
      color: 'var(--holo-gradient-salmon)',
      badge: 'Mais Popular',
      icon: <Star size={32} />
    },
    {
      id: 'platinum',
      name: 'Platinum',
      price: 'R$ 79,90/mês',
      ads: 'Ilimitados',
      color: 'var(--holo-gradient-purple)',
      badge: 'Profissional',
      icon: <Gem size={32} />
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Planos e Assinaturas</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Escolha o plano ideal para alavancar sua carreira ou negócio.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {plans.map((plan) => (
          <div key={plan.id} className="card card-hover" style={{ 
            background: plan.color, 
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative', textAlign: 'center'
          }}>
            {plan.badge && (
              <div className="badge" style={{ position: 'absolute', top: '-12px', right: '20px', background: 'var(--text-color)', color: 'var(--bg-color) !important', border: 'none' }}>
                {plan.badge}
              </div>
            )}
            
            <div className="dark-text" style={{ marginBottom: '1rem', color: plan.id === 'free' ? 'var(--text-color) !important' : '#1a1a1a' }}>
              {/* If it's the free plan, we don't force dark text natively, we let it be var(--text-color) */}
              <div style={{ color: plan.id === 'free' ? 'var(--text-color)' : 'inherit' }}>
                {plan.icon}
              </div>
            </div>

            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: plan.id === 'free' ? 'var(--text-color)' : '#1a1a1a' }}>
              {plan.name}
            </h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem', color: plan.id === 'free' ? 'var(--text-color)' : '#1a1a1a' }}>
              {plan.price}
            </div>

            <ul style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, textAlign: 'left', width: '100%' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: plan.id === 'free' ? 'var(--text-color)' : '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: '500' }}>{plan.ads} anúncios por mês</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: plan.id === 'free' ? 'var(--text-color)' : '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span>Acesso a todos os freelancers e contratantes</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: plan.id === 'free' ? 'var(--text-color)' : '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span>Chat integrado</span>
              </li>
            </ul>

            <Link to="/" className="btn" style={{ 
              width: '100%', 
              background: plan.id === 'free' ? 'transparent' : 'var(--surface-color)',
              color: 'var(--text-color)',
              border: plan.id === 'free' ? '1px solid var(--border-color)' : 'none'
            }}>
              Assinar {plan.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
