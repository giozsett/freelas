import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Zap, Star, Gem, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MyPayments() {
  const { token } = useAuth();
  const [subscriptionPlan, setSubscriptionPlan] = useState('Gratuito');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('http://localhost:8000/api/auth/profile/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setSubscriptionPlan(data.subscription_plan || 'Gratuito');
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const isPaid = subscriptionPlan !== 'Gratuito';

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Meus Pagamentos</h1>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', opacity: 0.8 }}>Plano Atual</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem', fontWeight: 'bold' }}>
                {subscriptionPlan === 'Gold' ? <Star color="var(--holo-salmon)" /> : subscriptionPlan === 'Platinum' ? <Gem color="var(--holo-purple-real)" /> : <Zap color="var(--text-color)" />}
                {subscriptionPlan}
              </div>
            </div>
            <div>
              <Link to="/plans" className="btn btn-secondary">Alterar Plano</Link>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard /> Método de Pagamento Principal
            </h2>
            
            {isPaid ? (
              <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--holo-gradient-salmon)', padding: '0.5rem', borderRadius: '4px', fontWeight: 'bold', color: '#1a1a1a' }}>VISA</div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px' }}>**** **** **** 1234</div>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Vencimento 12/28</div>
                  </div>
                </div>
                <div>
                  <CheckCircle color="var(--holo-green)" size={24} title="Cartão Verificado" />
                </div>
              </div>
            ) : (
              <div style={{ opacity: 0.7, padding: '1rem 0' }}>
                Você está no plano Gratuito. Nenhum método de pagamento está cadastrado.
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto' }}>
                Adicionar Novo Cartão
              </button>
            </div>
          </div>

          {isPaid && (
            <div className="card">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Histórico de Faturas</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 0' }}>Data</th>
                    <th style={{ padding: '1rem 0' }}>Valor</th>
                    <th style={{ padding: '1rem 0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0' }}>01/04/2026</td>
                    <td style={{ padding: '1rem 0' }}>{subscriptionPlan === 'Gold' ? 'R$ 29,90' : 'R$ 79,90'}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--holo-green)' }}>Pago</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '1rem 0' }}>01/03/2026</td>
                    <td style={{ padding: '1rem 0' }}>{subscriptionPlan === 'Gold' ? 'R$ 29,90' : 'R$ 79,90'}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--holo-green)' }}>Pago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
