import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gem,
  History,
  Shield,
  Star,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useNotificacoes } from '../context/ContextoNotificacao';

const API = 'http://localhost:8000';
const PAGE_SIZE = 15;

export default function MyPayments() {
  const { token } = useAuth();
  const { marcarLidas } = useNotificacoes();
  const [subscriptionPlan, setSubscriptionPlan] = useState('Gratuito');
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    marcarLidas(['pagamento']);
  }, [marcarLidas]);

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
        const [profileResponse, historyResponse] = await Promise.all([
          fetch(`${API}/api/auth/profile/`, { headers }),
          fetch(`${API}/api/pagamentos/historico/?page=${page}`, { headers }),
        ]);

        if (!profileResponse.ok || !historyResponse.ok) {
          throw new Error('Não foi possível carregar os dados de pagamento.');
        }

        const [profileData, historyData] = await Promise.all([
          profileResponse.json(),
          historyResponse.json(),
        ]);
        setSubscriptionPlan(profileData.subscription_plan || 'Gratuito');
        setHistory(Array.isArray(historyData.results) ? historyData.results : []);
        setTotalCount(Number(historyData.count) || 0);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [token, page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'subscription') return;

    const paymentStatus = params.get('status');
    if (paymentStatus === 'approved') {
      setCheckoutMessage('Pagamento enviado. Seu plano será atualizado após a confirmação do Stripe.');
    } else if (paymentStatus === 'pending') {
      setCheckoutMessage('O pagamento da assinatura está em análise no Stripe.');
    } else if (paymentStatus) {
      setCheckoutMessage('A assinatura não foi concluída. Você pode tentar novamente.');
    } else {
      setCheckoutMessage('Checkout finalizado. Aguardando a confirmação do Stripe.');
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
      stripe: 'Stripe',
    };
    const key = String(brand).toLowerCase();
    if (brands[key]) return brands[key];
    // Fallback para valores internos antigos (ex.: "registro_legado"): mostra
    // um texto legível em vez do identificador cru salvo no banco.
    return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
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
        <div role="alert" className="form-error" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--danger-color)', background: 'var(--danger-soft)' }}>
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ height: '6rem' }}><div className="skeleton" style={{ height: '100%' }} /></div>
          <div className="card" style={{ height: '5rem' }}><div className="skeleton" style={{ height: '100%' }} /></div>
          <div className="card" style={{ height: '12rem' }}><div className="skeleton" style={{ height: '100%' }} /></div>
        </div>
      ) : (
        <div className="fade-in stagger" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Plano de Assinatura Atual</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', fontWeight: 'bold' }}>
                {subscriptionPlan.toLowerCase().includes('gold') ? (
                  <Star color="var(--warning-color)" fill="var(--warning-color)" size={32} />
                ) : subscriptionPlan.toLowerCase().includes('plat') ? (
                  <Gem color="var(--holo-purple-real)" fill="var(--holo-purple-real)" size={32} />
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
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Pagamento protegido pelo Stripe</h2>
              <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8, lineHeight: '1.5' }}>
                O checkout acontece direto na página do Stripe. O Freelas nunca recebe nem armazena o número do cartão, validade ou código de segurança.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="tab-content-animation">
                <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={20} /> Histórico de Transações
                </h2>
                {history.length > 0 ? (
                  <>
                    <table className="responsive-table">
                      <thead>
                        <tr>
                          <th>Data da aprovação</th>
                          <th>Tipo</th>
                          <th>Valor</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody className="stagger">
                        {history.map((payment) => (
                          <tr key={payment.id}>
                            <td data-label="Data da aprovação">
                              {formatDate(payment.aprovado_em || payment.criado_em)}
                            </td>
                            <td data-label="Tipo">
                              <span>
                                {payment.tipo === 'assinatura' ? `Assinatura ${payment.plano || ''}` : 'Serviço freelancer'}
                                <span className="responsive-table__secondary">
                                  via {payment.forma_pagamento ? formatBrand(payment.forma_pagamento) : 'Stripe'}
                                </span>
                              </span>
                            </td>
                            <td data-label="Valor" style={{ fontWeight: 'bold' }}>
                              {formatCurrency(payment.valor)}
                            </td>
                            <td data-label="Status">
                              <span className="badge" style={{ background: 'var(--success-soft)', color: 'var(--success-color)', border: 'none' }}>
                                Aprovado
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalCount > PAGE_SIZE && (
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          <ChevronLeft size={16} /> Anterior
                        </button>
                        <span>
                          Página {page} de {Math.ceil(totalCount / PAGE_SIZE)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                          disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                        >
                          Próxima <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                    Nenhuma transação aprovada ainda. Pagamentos pendentes só aparecem após a confirmação do Stripe.
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
