import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Star, Gem } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

export default function Plans() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0/mês',
      ads: 2,
      color: 'var(--holo-gradient-free)',
      badge: null,
      icon: <Zap size={32} />
    },
    {
      id: 'gold',
      name: 'Gold',
      price: 'R$ 29,90/mês',
      ads: 10,
      color: 'var(--holo-gradient-gold)',
      badge: 'Mais Popular',
      icon: <Star size={32} />
    },
    {
      id: 'platinum',
      name: 'Platinum',
      price: 'R$ 79,90/mês',
      ads: 'Ilimitados',
      color: 'var(--holo-gradient-platinum)',
      badge: 'Profissional',
      icon: <Gem size={32} />
    }
  ];

  const handleSubscribe = async (planId) => {
    const checkoutWindow = planId === 'free' ? null : window.open('', '_blank');
    if (planId !== 'free' && !checkoutWindow) {
      alert('Permita pop-ups para abrir o checkout do Mercado Pago em uma nova aba.');
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch('http://localhost:8000/api/pagamentos/assinatura/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ plano: planId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível alterar o plano.');
      }
      if (data.checkout_required && data.init_point) {
        checkoutWindow.opener = null;
        checkoutWindow.location.href = data.init_point;
        if (data.test_approved) {
          navigate('/my-payments?checkout=academic-approved');
        } else {
          setLoadingPlan(null);
        }
      } else if (!data.checkout_required) {
        navigate('/my-payments');
      } else {
        throw new Error('O Mercado Pago não retornou o endereço do checkout.');
      }
    } catch (err) {
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      console.error(err);
      alert(err.message || 'Erro na comunicação com o servidor.');
      setLoadingPlan(null);
    }
  };

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

            <div className="dark-text" style={{ marginBottom: '1rem', color: '#1a1a1a' }}>
              <div style={{ color: 'inherit' }}>
                {plan.icon}
              </div>
            </div>

            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }}>
              {plan.name}
            </h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1a1a1a' }}>
              {plan.price}
            </div>

            <ul style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, textAlign: 'left', width: '100%' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: '500' }}>{plan.ads} anúncios por mês</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span>Acesso a todos os freelancers e contratantes</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a1a1a' }}>
                <CheckCircle size={20} />
                <span>Chat integrado</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              className="btn"
              disabled={loadingPlan !== null}
              style={{
                width: '100%',
                background: 'var(--surface-color)',
                color: '#1a1a1a',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {loadingPlan === plan.id ? 'Carregando...' : `Assinar ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
