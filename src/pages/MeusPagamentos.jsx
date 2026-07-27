import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Gem,
  History,
  Shield,
  Star,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

const API = 'http://localhost:8000';

export default function MyPayments() {
  const { token } = useAuth();
  const [subscriptionPlan, setSubscriptionPlan] = useState('Gratuito');
  const [history, setHistory] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeSection, setActiveSection] = useState('history');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const headers = { Authorization: `Token ${token}` };
    const loadPayments = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [profileResponse, historyResponse, cardsResponse] = await Promise.all([
          fetch(`${API}/api/auth/profile/`, { headers }),
          fetch(`${API}/api/pagamentos/historico/`, { headers }),
          fetch(`${API}/api/pagamentos/cartoes/`, { headers }),
        ]);

        if (!profileResponse.ok || !historyResponse.ok || !cardsResponse.ok) {
          throw new Error('Não foi possível carregar os dados de pagamento.');
        }

        const [profileData, historyData, cardsData] = await Promise.all([
          profileResponse.json(),
          historyResponse.json(),
          cardsResponse.json(),
        ]);
        setSubscriptionPlan(profileData.subscription_plan || 'Gratuito');
        setHistory(Array.isArray(historyData) ? historyData : []);
        setCards(Array.isArray(cardsData) ? cardsData : []);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'subscription') return;

    const paymentStatus = params.get('status');
    if (paymentStatus === 'approved') {
      setCheckoutMessage('Pagamento enviado. Seu plano será atualizado após a confirmação do Mercado Pago.');
    } else if (paymentStatus === 'pending') {
      setCheckoutMessage('O pagamento da assinatura está em análise no Mercado Pago.');
    } else if (paymentStatus) {
      setCheckoutMessage('A assinatura não foi concluída. Você pode tentar novamente.');
    } else {
      setCheckoutMessage('Checkout finalizado. Aguardando a confirmação do Mercado Pago.');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formatBrand = (brand) => {
    const brands = {
      amex: 'American Express',
      master: 'Mastercard',
      mastercard: 'Mastercard',
      visa: 'Visa',
      elo: 'Elo',
      hipercard: 'Hipercard',
    };
    return brands[String(brand).toLowerCase()] || brand;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CreditCard size={36} color="var(--primary)" /> Meus Pagamentos
      </h1>

      {checkoutMessage && (
        <div role="status" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--primary)', background: 'rgba(124, 58, 237, 0.08)' }}>
          {checkoutMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #ff4757', background: 'rgba(255, 71, 87, 0.08)' }}>
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.8 }}>Carregando dados...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Plano de Assinatura Atual</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', fontWeight: 'bold' }}>
                {subscriptionPlan.toLowerCase().includes('gold') ? (
                  <Star color="#ffc107" fill="#ffc107" size={32} />
                ) : subscriptionPlan.toLowerCase().includes('plat') ? (
                  <Gem color="#7C3AED" fill="#7C3AED" size={32} />
                ) : (
                  <Zap color="var(--text-color)" size={32} />
                )}
                {subscriptionPlan}
              </div>
            </div>
            <Link to="/plans" className="btn" style={{ padding: '0.6rem 1.2rem' }}>
              Alterar Plano
            </Link>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(12, 140, 233, 0.03)', border: '1px dashed var(--border-color)' }}>
            <Shield size={36} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Pagamento protegido pelo Mercado Pago</h2>
              <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8, lineHeight: '1.5' }}>
                O checkout acontece no Mercado Pago. O Freelas guarda somente bandeira, final e validade para você reconhecer seus cartões — nunca o número completo ou o código de segurança.
              </p>
            </div>
          </div>

          <div className="card">
            <div role="tablist" aria-label="Dados de pagamento" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'history'}
                onClick={() => setActiveSection('history')}
                className={activeSection === 'history' ? 'btn' : 'btn btn-secondary'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <History size={18} /> Histórico de Transações
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'cards'}
                onClick={() => setActiveSection('cards')}
                className={activeSection === 'cards' ? 'btn' : 'btn btn-secondary'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <WalletCards size={18} /> Meus cartões
              </button>
            </div>

            {activeSection === 'history' ? (
              <div role="tabpanel">
                <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Histórico de Transações</h2>
                {history.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', opacity: 0.8 }}>
                          <th style={{ padding: '1rem 0.5rem' }}>Data da aprovação</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Tipo</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Pagamento</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Valor</th>
                          <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((payment) => (
                          <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
                              {formatDate(payment.aprovado_em || payment.criado_em)}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>
                              {payment.tipo === 'assinatura' ? `Assinatura ${payment.plano || ''}` : 'Serviço freelancer'}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
                              {payment.forma_pagamento ? formatBrand(payment.forma_pagamento) : 'Mercado Pago'}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>
                              {formatCurrency(payment.valor)}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                              <span className="badge" style={{ background: 'rgba(46, 213, 115, 0.15)', color: '#1f9d55', border: 'none' }}>
                                Aprovado
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                    Nenhuma transação aprovada ainda. Pagamentos pendentes só aparecem após a confirmação do Mercado Pago.
                  </div>
                )}
              </div>
            ) : (
              <div role="tabpanel">
                <h2 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>Meus cartões</h2>
                <p style={{ marginTop: 0, marginBottom: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
                  Cartões identificados em pagamentos aprovados pelo Mercado Pago.
                </p>
                {cards.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', opacity: 0.8 }}>
                          <th style={{ padding: '1rem 0.5rem' }}>Bandeira</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Cartão</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Titular</th>
                          <th style={{ padding: '1rem 0.5rem' }}>Validade</th>
                          <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cards.map((card) => (
                          <tr key={card.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{formatBrand(card.bandeira)}</td>
                            <td style={{ padding: '1rem 0.5rem', letterSpacing: '0.08em' }}>•••• {card.ultimos_quatro}</td>
                            <td style={{ padding: '1rem 0.5rem' }}>{card.nome_titular || 'Não informado'}</td>
                            <td style={{ padding: '1rem 0.5rem' }}>
                              {card.mes_expiracao && card.ano_expiracao
                                ? `${String(card.mes_expiracao).padStart(2, '0')}/${String(card.ano_expiracao).slice(-2)}`
                                : '—'}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                              <span className="badge" style={{ background: 'rgba(46, 213, 115, 0.15)', color: '#1f9d55', border: 'none' }}>
                                Ativo
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                    Nenhum cartão identificado. Ele aparecerá aqui após um pagamento aprovado com cartão.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
