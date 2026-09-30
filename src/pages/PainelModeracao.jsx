/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import DashboardModeracao from './DashboardModeracao';
import { useDialogo } from '../context/ContextoDialogo';
import useScrollEdges from '../hooks/useScrollEdges';
import { ROTULO_MOTIVO_PROBLEMA } from '../constants/acordos';

const API = 'http://localhost:8000';
const PAGE_SIZE = 10;
const LIMITE_PONTOS_BANIMENTO = 3;

// Sugestão de quem recebe o ponto de infração, conforme o motivo relatado
const INFRATOR_SUGERIDO = {
  nao_compareceu: 'freelancer',
  nao_entregou: 'freelancer',
  fora_do_combinado: 'freelancer',
};

const ROTULO_PARTE = { freelancer: 'Freelancer', contratante: 'Contratante' };

const statusStyle = (status) => {
  if (status === 'aprovada' || status === 'procedente') {
    return { color: 'var(--success-color)', background: 'var(--success-soft)' };
  }
  if (status === 'recusada' || status === 'improcedente') {
    return { color: 'var(--danger-color)', background: 'var(--danger-soft)' };
  }
  return { color: 'var(--warning-color)', background: 'var(--warning-soft)' };
};

const formatDate = (value) => (
  value ? new Date(value).toLocaleString('pt-BR') : '—'
);

const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const requestStatusLabel = (status) => {
  if (status === 'aprovada') return 'Aprovado';
  if (status === 'recusada') return 'Rejeitado';
  return 'Pendente';
};

function StatusBadge({ status, label = status }) {
  const statusLabel = status === 'pending' ? 'Pendente' : label;
  return (
    <span
      className="badge"
      style={{
        ...statusStyle(status),
        display: 'inline-flex',
        textTransform: 'capitalize',
        fontWeight: 700,
      }}
    >
      {statusLabel}
    </span>
  );
}

function Pagination({ page, count, onChange }) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Página anterior"
        style={{ padding: '0.45rem 0.65rem' }}
      >
        <ChevronLeft size={17} />
      </button>
      <span style={{ fontSize: '0.9rem' }}>
        Página <strong>{page}</strong> de <strong>{totalPages}</strong> · {count} registros
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Próxima página"
        style={{ padding: '0.45rem 0.65rem' }}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function ReportTable({
  data,
  page,
  loading,
  expanded,
  onToggle,
  onPageChange,
  onDecision,
}) {
  const rows = data.results || [];
  const scrollRef = useScrollEdges();

  return (
    <>
      <div ref={scrollRef} className="scroll-fade" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
          <thead style={{ background: 'var(--surface-color)', textAlign: 'left' }}>
            <tr>
              {['ID', 'Alvo', 'Tipo', 'Status', 'Data', 'Detalhes'].map((label) => (
                <th key={label} style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="stagger">
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Carregando denúncias...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>Nenhuma denúncia encontrada.</td></tr>
            ) : rows.map((report) => (
              <ReportRows
                key={report.id}
                report={report}
                isExpanded={Boolean(expanded[report.id])}
                onToggle={() => onToggle(report.id)}
                onDecision={onDecision}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} count={data.count || 0} onChange={onPageChange} />
    </>
  );
}

function ReportRows({ report, isExpanded, onToggle, onDecision }) {
  const typeLabel = report.type === 'ad' ? 'Anúncio' : 'Usuário';

  return (
    <>
      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)' }}>
        <td style={{ padding: '0.75rem' }}>#{report.id}</td>
        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{report.target_name || `Registro ${report.target_id}`}</td>
        <td style={{ padding: '0.75rem' }}>{typeLabel}</td>
        <td style={{ padding: '0.75rem' }}><StatusBadge status={report.status} /></td>
        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatDate(report.created_at)}</td>
        <td style={{ padding: '0.75rem' }}>
          <button
            type="button"
            onClick={onToggle}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Ver <ChevronDown size={17} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="moderation-expanded-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td colSpan="6" style={{ padding: '0 1rem 1rem' }}>
            <div className="moderation-expanded-content" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.8rem', fontSize: '0.9rem' }}>
                <div><strong>Categoria:</strong><br />{report.category || 'Não informada'}</div>
                <div><strong>Tipo do alvo:</strong><br />{typeLabel}</div>
                <div><strong>ID do alvo:</strong><br />{report.target_id || '—'}</div>
                <div><strong>Denunciado por:</strong><br />{report.reporter_name || 'Anônimo'}</div>
                <div>
                  <strong>Pontos de infração do denunciado:</strong><br />
                  {report.denunciado
                    ? `${report.denunciado.pontos_infracao} de ${LIMITE_PONTOS_BANIMENTO}${report.denunciado.banido ? ' · conta banida' : ''}`
                    : '—'}
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <strong>Descrição da denúncia:</strong>
                <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{report.comment || 'Sem comentário adicional.'}</p>
              </div>

              {report.status === 'pending' && (
                <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
                  Aprovar a denúncia soma 1 ponto de infração ao denunciado; com {LIMITE_PONTOS_BANIMENTO} pontos a conta é banida. O denunciante é avisado do resultado.
                </p>
              )}
              {report.status === 'pending' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => onDecision(report, 'improcedente')}>
                    <XCircle size={16} /> Recusar denúncia
                  </button>
                  <button type="button" className="btn" onClick={() => onDecision(report, 'procedente')} style={{ background: 'var(--success-color)', color: 'var(--success-contrast)' }}>
                    <CheckCircle size={16} /> Aprovar denúncia
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function RequestTable({
  kind,
  data,
  page,
  loading,
  expanded,
  onToggle,
  onPageChange,
  onDecision,
}) {
  const isCancellation = kind === 'cancelamentos';
  const rows = data.results || [];
  const scrollRef = useScrollEdges();

  return (
    <>
      <div ref={scrollRef} className="scroll-fade" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
          <thead style={{ background: 'var(--surface-color)', textAlign: 'left' }}>
            <tr>
              {['ID', 'Acordo', 'Solicitante', 'Status', 'Data', 'Detalhes'].map((label) => (
                <th key={label} style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="stagger">
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Carregando registros...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>Nenhum registro encontrado.</td></tr>
            ) : rows.map((item) => (
              <RequestRows
                key={item.id}
                item={item}
                isCancellation={isCancellation}
                isExpanded={Boolean(expanded[item.id])}
                onToggle={() => onToggle(item.id)}
                onDecision={onDecision}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} count={data.count || 0} onChange={onPageChange} />
    </>
  );
}

function RequestRows({ item, isCancellation, isExpanded, onToggle, onDecision }) {
  return (
    <>
      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)' }}>
        <td style={{ padding: '0.75rem' }}>#{item.id}</td>
        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.acordo_titulo || `Acordo ${item.acordo}`}</td>
        <td style={{ padding: '0.75rem' }}>
          {item.solicitante_nome}
          <div style={{ fontSize: '0.75rem', opacity: 0.65, textTransform: 'capitalize' }}>{item.papel_solicitante}</div>
        </td>
        <td style={{ padding: '0.75rem' }}>
          <StatusBadge status={item.status} label={requestStatusLabel(item.status)} />
        </td>
        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatDate(item.criado_em)}</td>
        <td style={{ padding: '0.75rem' }}>
          <button
            type="button"
            onClick={onToggle}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Ver <ChevronDown size={17} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="moderation-expanded-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td colSpan="6" style={{ padding: '0 1rem 1rem' }}>
            <div className="moderation-expanded-content" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.8rem', fontSize: '0.9rem' }}>
                <div><strong>Contratante:</strong><br />{item.nome_contratante || '—'}</div>
                <div><strong>Freelancer:</strong><br />{item.nome_prestador || '—'}</div>
                <div><strong>Status do acordo:</strong><br />{item.status_acordo || '—'}</div>
                {isCancellation && <div><strong>Valor:</strong><br />{formatMoney(item.valor_acordado)}</div>}
                {isCancellation && <div><strong>Motivo relatado:</strong><br />{ROTULO_MOTIVO_PROBLEMA[item.motivo] || '—'}</div>}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <strong>Justificativa:</strong>
                <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{item.justificativa}</p>
              </div>

              {!isCancellation && (
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.8rem' }}>
                  <div>
                    <strong>Valor:</strong><br />
                    {formatMoney(item.valor_anterior)} → {formatMoney(item.valor_proposto)}
                  </div>
                  <div>
                    <strong>Conclusão:</strong><br />
                    {item.conclusao_anterior || '—'} → {item.conclusao_proposta || '—'}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Descrição proposta:</strong>
                    <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{item.descricao_proposta || 'Sem alteração.'}</p>
                  </div>
                </div>
              )}

              {isCancellation && item.resposta_admin && (
                <p style={{ margin: '1rem 0 0' }}><strong>Resposta do administrador:</strong> {item.resposta_admin}</p>
              )}

              {isCancellation && item.status !== 'pendente' && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem' }}>
                  <strong>Ponto de infração:</strong> {ROTULO_PARTE[item.parte_infratora] || 'Nenhuma parte'}
                  {' · '}<strong>Estorno:</strong> {item.estornado ? 'realizado' : 'não realizado'}
                </p>
              )}

              {item.status !== 'pendente' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  background: statusStyle(item.status).background,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <strong>Resultado:</strong>{' '}
                    <StatusBadge status={item.status} label={requestStatusLabel(item.status)} />
                  </div>
                  <div>
                    <strong>Avaliado em:</strong>{' '}
                    {formatDate(isCancellation ? item.analisado_em : item.decidido_em)}
                  </div>
                  <div>
                    <strong>Avaliado por:</strong>{' '}
                    {(isCancellation ? item.analisado_por_nome : item.decidido_por_nome) || '—'}
                  </div>
                </div>
              )}

              {isCancellation && item.status === 'pendente' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => onDecision(item, 'recusar')}>
                    <XCircle size={16} /> Manter acordo
                  </button>
                  <button type="button" className="btn" onClick={() => onDecision(item, 'aprovar')} style={{ background: 'var(--danger-color)', color: 'var(--danger-contrast)' }}>
                    <CheckCircle size={16} /> Cancelar acordo e estornar
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DecisaoDisputaModal({ item, decisaoInicial, enviando, onClose, onConfirm }) {
  const [decisao, setDecisao] = useState(decisaoInicial);
  const [parteInfratora, setParteInfratora] = useState(INFRATOR_SUGERIDO[item.motivo] || '');
  const [resposta, setResposta] = useState('');

  const opcaoDecisao = (valor, titulo, descricao) => (
    <label style={{
      display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
      border: decisao === valor ? '2px solid var(--holo-purple-real)' : '1px solid var(--border-color)',
    }}>
      <input type="radio" name="decisao" checked={decisao === valor} onChange={() => setDecisao(valor)} style={{ marginTop: '0.2rem' }} />
      <span><strong>{titulo}</strong><br /><span style={{ fontSize: '0.85rem', opacity: 0.75 }}>{descricao}</span></span>
    </label>
  );

  return (
    <div className="mf-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !enviando) onClose(); }}>
      <div className="mf-modal" style={{ width: '100%', maxWidth: '520px' }}>
        <button type="button" onClick={onClose} disabled={enviando} aria-label="Fechar"
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
          <X size={22} />
        </button>
        <h2 style={{ marginTop: 0 }}>Decidir disputa</h2>
        <p style={{ opacity: 0.75, fontSize: '0.9rem', lineHeight: 1.5 }}>
          <strong>{item.acordo_titulo}</strong> · Motivo relatado: {ROTULO_MOTIVO_PROBLEMA[item.motivo] || '—'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          {opcaoDecisao('aprovar', 'Cancelar acordo e estornar', 'Se o acordo já foi pago, o valor é estornado ao contratante pelo Stripe.')}
          {opcaoDecisao('recusar', 'Manter acordo', 'O acordo continua; se o serviço já foi entregue, ele é concluído.')}
        </div>

        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Ponto de infração</label>
        <select className="input" value={parteInfratora} onChange={(e) => setParteInfratora(e.target.value)} style={{ marginBottom: '1rem' }}>
          <option value="">Nenhuma parte</option>
          <option value="freelancer">Freelancer ({item.nome_prestador || '—'})</option>
          <option value="contratante">Contratante ({item.nome_contratante || '—'})</option>
        </select>

        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Observação administrativa (opcional)</label>
        <textarea className="input" rows="3" value={resposta} onChange={(e) => setResposta(e.target.value)} style={{ resize: 'vertical' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>Voltar</button>
          <button type="button" className="btn" disabled={enviando}
            onClick={() => onConfirm({ decisao, parte_infratora: parteInfratora, resposta_admin: resposta })}>
            {enviando ? 'Registrando...' : 'Registrar decisão'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModerationPanel() {
  const { confirmar } = useDialogo();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const tabsScrollRef = useScrollEdges();
  const [reports, setReports] = useState({ count: 0, results: [] });
  const [cancelamentos, setCancelamentos] = useState({ count: 0, results: [] });
  const [alteracoes, setAlteracoes] = useState({ count: 0, results: [] });
  const [pages, setPages] = useState({ denuncias: 1, cancelamentos: 1, alteracoes: 1 });
  const [filters, setFilters] = useState({ denuncias: '', cancelamentos: '', alteracoes: '' });
  const [expanded, setExpanded] = useState({ denuncias: {}, cancelamentos: {}, alteracoes: {} });
  const [loading, setLoading] = useState({ denuncias: false, cancelamentos: false, alteracoes: false });
  const [error, setError] = useState('');
  const [disputaEmDecisao, setDisputaEmDecisao] = useState(null); // { item, decisao }
  const [registrandoDisputa, setRegistrandoDisputa] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!localStorage.getItem('isModerator') || !token) {
      navigate('/moderator-login');
    }
  }, [navigate, token]);

  const fetchReports = useCallback(async (page, statusFilter) => {
    setLoading((prev) => ({ ...prev, denuncias: true }));
    setError('');
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (statusFilter) params.set('status', statusFilter);

    try {
      const response = await fetch(`${API}/api/reports/?${params}`, {
        headers: { Authorization: `Token ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Não foi possível carregar as denúncias.');
      }
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, denuncias: false }));
    }
  }, [token]);

  const fetchRequests = useCallback(async (kind, page, statusFilter, silent = false) => {
    if (!silent) {
      setLoading((prev) => ({ ...prev, [kind]: true }));
    }
    setError('');
    const endpoint = kind === 'cancelamentos'
      ? '/api/admin/cancelamentos-acordo/'
      : '/api/admin/alteracoes-acordo/';
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (statusFilter) params.set('status', statusFilter);

    try {
      const response = await fetch(`${API}${endpoint}?${params}`, {
        headers: { Authorization: `Token ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Não foi possível carregar os registros.');
      }
      const normalizedData = Array.isArray(data)
        ? { count: data.length, results: data }
        : {
            count: Number(data.count || 0),
            results: Array.isArray(data.results) ? data.results : [],
          };
      if (kind === 'cancelamentos') setCancelamentos(normalizedData);
      else setAlteracoes(normalizedData);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading((prev) => ({ ...prev, [kind]: false }));
      }
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'denuncias') {
      fetchReports(pages.denuncias, filters.denuncias);
    } else if (activeTab === 'cancelamentos' || activeTab === 'alteracoes') {
      fetchRequests(activeTab, pages[activeTab], filters[activeTab]);
    }
  }, [activeTab, pages, filters, fetchReports, fetchRequests]);

  useEffect(() => {
    if (activeTab !== 'cancelamentos' && activeTab !== 'alteracoes') return undefined;

    const refreshRequests = () => {
      fetchRequests(
        activeTab,
        pages[activeTab],
        filters[activeTab],
        true,
      );
    };
    const refreshInterval = window.setInterval(refreshRequests, 10000);
    window.addEventListener('focus', refreshRequests);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshRequests);
    };
  }, [activeTab, fetchRequests, filters, pages]);

  const changePage = (kind, page) => {
    setPages((prev) => ({ ...prev, [kind]: page }));
  };

  const changeFilter = (kind, value) => {
    setFilters((prev) => ({ ...prev, [kind]: value }));
    setPages((prev) => ({ ...prev, [kind]: 1 }));
  };

  const toggleExpanded = (kind, id) => {
    setExpanded((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [id]: !prev[kind][id] },
    }));
  };

  const handleCancellationDecision = (item, decisao) => {
    setDisputaEmDecisao({ item, decisao });
  };

  const registrarDecisaoDisputa = async (dados) => {
    const { item } = disputaEmDecisao;
    setRegistrandoDisputa(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/admin/cancelamentos-acordo/${item.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(dados),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível registrar a decisão.');
      setDisputaEmDecisao(null);
      await fetchRequests('cancelamentos', pages.cancelamentos, filters.cancelamentos);
    } catch (err) {
      setDisputaEmDecisao(null);
      setError(err.message);
    } finally {
      setRegistrandoDisputa(false);
    }
  };

  const handleReportDecision = async (report, newStatus) => {
    const action = newStatus === 'procedente' ? 'aprovar' : 'recusar';
    if (!await confirmar(`Deseja ${action} a denúncia contra "${report.target_name || report.target_id}"?`, { titulo: 'Decisão sobre denúncia', confirmarTexto: action === 'aprovar' ? 'Aprovar' : 'Recusar' })) return;

    setError('');
    try {
      const response = await fetch(`${API}/api/reports/${report.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.detail || 'Não foi possível atualizar a denúncia.');
      await fetchReports(pages.denuncias, filters.denuncias);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isModerator');
    logout();
    navigate('/moderator-login');
  };

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['denuncias', 'Denúncias'],
    ['alteracoes', 'Alterações'],
    ['cancelamentos', 'Disputas'],
    ['admin', 'Django Admin'],
  ];

  const currentData = activeTab === 'cancelamentos' ? cancelamentos : alteracoes;

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 1rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldAlert size={36} color="var(--holo-purple-real)" />
          <h1 style={{ margin: 0 }}>Painel de Moderação</h1>
        </div>
        <button type="button" onClick={handleLogout} className="btn btn-secondary">Sair</button>
      </div>

      <div ref={tabsScrollRef} className="scroll-fade scroll-fade--bg" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === id ? '3px solid var(--holo-purple-real)' : '3px solid transparent',
              color: activeTab === id ? 'var(--holo-purple-real)' : 'inherit',
              padding: '0.8rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === id ? 700 : 500,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardModeracao />
      )}

      {activeTab === 'denuncias' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>Denúncias</h2>
              <p style={{ margin: '0.35rem 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                Registros resumidos; expanda uma linha para analisar e tomar uma decisão.
              </p>
            </div>
            <select
              className="input"
              value={filters.denuncias}
              onChange={(event) => changeFilter('denuncias', event.target.value)}
              style={{ width: 'auto', minWidth: '190px' }}
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="procedente">Procedentes</option>
              <option value="improcedente">Improcedentes</option>
            </select>
          </div>

          <ReportTable
            data={reports}
            page={pages.denuncias}
            loading={loading.denuncias}
            expanded={expanded.denuncias}
            onToggle={(id) => toggleExpanded('denuncias', id)}
            onPageChange={(page) => changePage('denuncias', page)}
            onDecision={handleReportDecision}
          />
        </div>
      )}

      {(activeTab === 'cancelamentos' || activeTab === 'alteracoes') && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>
                {activeTab === 'cancelamentos' ? 'Problemas relatados (disputas)' : 'Solicitações de alteração'}
              </h2>
              <p style={{ margin: '0.35rem 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                Histórico completo; expanda uma linha para visualizar os dados e o resultado da avaliação.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fetchRequests(
                  activeTab,
                  pages[activeTab],
                  filters[activeTab],
                )}
                disabled={loading[activeTab]}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={16} />
                {loading[activeTab] ? 'Atualizando...' : 'Atualizar registros'}
              </button>
              <select
                className="input"
                value={filters[activeTab]}
                onChange={(event) => changeFilter(activeTab, event.target.value)}
                style={{ width: 'auto', minWidth: '170px' }}
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovada">Aprovados</option>
                <option value="recusada">Rejeitados</option>
              </select>
            </div>
          </div>

          <RequestTable
            kind={activeTab}
            data={currentData}
            page={pages[activeTab]}
            loading={loading[activeTab]}
            expanded={expanded[activeTab]}
            onToggle={(id) => toggleExpanded(activeTab, id)}
            onPageChange={(page) => changePage(activeTab, page)}
            onDecision={handleCancellationDecision}
          />
        </div>
      )}

      {disputaEmDecisao && (
        <DecisaoDisputaModal
          item={disputaEmDecisao.item}
          decisaoInicial={disputaEmDecisao.decisao}
          enviando={registrandoDisputa}
          onClose={() => setDisputaEmDecisao(null)}
          onConfirm={registrarDecisaoDisputa}
        />
      )}

      {activeTab === 'admin' && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText size={38} color="var(--holo-purple-real)" />
          <h2>Painel de Administração do Django</h2>
          <p style={{ opacity: 0.75 }}>Gerencie usuários, acordos e registros diretamente no Django Admin.</p>
          <a href={`${API}/admin/`} target="_blank" rel="noopener noreferrer" className="btn">
            Abrir Django Admin
          </a>
        </div>
      )}
    </div>
  );
}
