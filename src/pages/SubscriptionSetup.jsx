import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Star, Gem } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionSetup() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState('gold'); // Default is 'gold'
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    
    try {
      if (token) {
        await fetch('http://localhost:8000/api/auth/profile/', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          },
          body: JSON.stringify({ subscription_plan: selectedPlan.name })
        });
      }
      navigate('/');
    } catch (err) {
      console.error('Error saving subscription plan', err);
      // Even if it fails, let's let the user into the app
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Quase lá!</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Escolha um plano para finalizar seu cadastro.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {plans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <div 
              key={plan.id} 
              className="card card-hover" 
              onClick={() => setSelectedPlanId(plan.id)}
              style={{ 
                background: plan.color, 
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', textAlign: 'center',
                cursor: 'pointer',
                border: isSelected ? '4px solid var(--text-color)' : '4px solid transparent',
                transform: isSelected ? 'scale(1.02)' : 'none',
                boxShadow: isSelected ? '0 8px 20px var(--shadow-color)' : 'none'
              }}>
              {plan.badge && (
                <div className="badge" style={{ position: 'absolute', top: '-12px', right: '20px', background: 'var(--text-color)', color: 'var(--bg-color) !important', border: 'none' }}>
                  {plan.badge}
                </div>
              )}
              
              <div className="dark-text" style={{ marginBottom: '1rem', color: plan.id === 'free' ? 'var(--text-color) !important' : '#1a1a1a' }}>
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
              </ul>
              
              <div style={{ 
                marginTop: 'auto', 
                width: '100%', 
                padding: '0.8rem', 
                borderRadius: '8px',
                background: isSelected ? 'var(--text-color)' : 'rgba(0,0,0,0.1)',
                color: isSelected ? 'var(--bg-color)' : 'inherit',
                fontWeight: 'bold'
              }}>
                {isSelected ? 'Selecionado' : 'Selecionar'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--surface-color)' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Finalizar Cadastro</h2>
        <form onSubmit={handleCompleteSetup}>
          {selectedPlanId !== 'free' && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', opacity: 0.8 }}>Método de Pagamento (Fictício)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nome no Cartão</label>
                  <input type="text" className="input" placeholder="João da Silva" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Número do Cartão</label>
                  <input type="text" className="input" placeholder="**** **** **** 1234" required />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Validade</label>
                    <input type="text" className="input" placeholder="MM/AA" required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>CVV</label>
                    <input type="text" className="input" placeholder="123" required />
                  </div>
                </div>
              </div>
            </div>
          )}
          <button type="submit" className="btn dark-text" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Processando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
