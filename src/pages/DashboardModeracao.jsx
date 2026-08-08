/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Flag,
  Gem,
  Package,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

const API = 'http://localhost:8000';

const CORES = {
  salmao: '#FF826E',
  roxo: '#7C3AED',
  roxoSuave: '#C4B5FD',
  azul: '#8CD6FF',
  dourado: '#F5B301',
  verde: '#2ed573',
};

const formatBRL = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatVariacao = (value) => {
  if (value === null || value === undefined) return '—';
  const signal = value > 0 ? '+' : '';
  return `${signal}${value}%`;
};

function VariacaoBadge({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: up ? CORES.verde : '#ff4757',
        background: up ? 'rgba(46,213,115,0.12)' : 'rgba(255,71,87,0.1)',
        borderRadius: '999px',
        padding: '0.2rem 0.6rem',
      }}
    >
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {formatVariacao(value)}
    </span>
  );
}

function KpiCard({ icon: Icon, color, bg, title, value, item, rodape, dark }) {
  const texto = dark ? '#fff' : '#1a1a1a';
  return (
    <div
      className="card"
      style={{
        background: bg,
        color: texto,
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.25,
          background: `radial-gradient(circle at top right, ${color}44, transparent 60%)`,
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: dark ? 'rgba(255,255,255,0.2)' : `${color}26`,
            color: dark ? '#fff' : color,
          }}>
            <Icon size={20} />
          </span>
          <span style={{ opacity: 0.75, fontSize: '0.95rem', fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>
            Mês atual <strong>{item?.mes_atual ?? 0}</strong> · Mês anterior{' '}
            <strong>{item?.mes_anterior ?? 0}</strong>
          </span>
          <VariacaoBadge value={item?.variacao} />
        </div>
        {rodape}
      </div>
    </div>
  );
}

function BarraComparativa({ data }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.atual, item.anterior]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {data.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
            <strong style={{ fontSize: '0.95rem' }}>{item.label}</strong>
            <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>
              <span style={{ color: CORES.salmao, fontWeight: 700 }}>{item.atual}</span>
              {' · '}
              <span style={{ color: CORES.roxoSuave, fontWeight: 700 }}>{item.anterior}</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }}>
              <div style={{
                width: `${(item.atual / max) * 100}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'var(--holo-gradient-salmon)',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }}>
              <div style={{
                width: `${(item.anterior / max) * 100}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'var(--holo-gradient-purple)',
                opacity: 0.55,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutPlanos({ planos }) {
  const total = planos.reduce((soma, p) => soma + p.total, 0);
  const [tooltip, setTooltip] = useState(null);
  const fundo = (item) => {
    if (item.nome === 'Gold') return CORES.dourado;
    if (item.nome === 'Platinum') return CORES.roxo;
    return CORES.azul;
  };

  const raio = 70;
  const espessura = 26;
  const circ = 2 * Math.PI * raio;

  let acumulado = 0;
  const segmentos = planos.map((p) => {
    const inicio = total ? (acumulado / total) * 360 : 0;
    acumulado += p.total;
    const fim = total ? (acumulado / total) * 360 : 0;
    return {
      ...p,
      conic: `${fundo(p)} ${inicio}deg ${fim}deg`,
      offset: (inicio / 360) * circ,
      len: total ? ((fim - inicio) / 360) * circ : 0,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px', minWidth: '160px', flex: '0 0 160px', aspectRatio: '1 / 1' }}>
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: total ? `conic-gradient(${segmentos.map((s) => s.conic).join(', ')})` : 'rgba(0,0,0,0.08)',
          }}
        />
        <svg style={{ position: 'absolute', inset: 0 }} width="160" height="160" viewBox="0 0 160 160">
          <g transform="rotate(-90 80 80)">
            {segmentos.filter((s) => s.total > 0).map((s) => (
              <circle
                key={s.nome}
                cx="80"
                cy="80"
                r={raio}
                fill="none"
                stroke={fundo(s)}
                strokeWidth={tooltip?.nome === s.nome ? espessura + 5 : espessura}
                strokeDasharray={`${s.len + 0.5} ${circ - s.len}`}
                strokeDashoffset={-s.offset}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                onMouseMove={(e) => {
                  const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                    nome: s.nome,
                    pct: ((s.total / total) * 100).toFixed(0),
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </g>
        </svg>
        <div style={{
          position: 'absolute',
          inset: '23px',
          borderRadius: '50%',
          background: 'var(--surface-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}>
          <strong style={{ fontSize: '1.6rem', lineHeight: 1 }}>{total}</strong>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>assinantes</span>
        </div>
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -130%)',
            background: '#1a1a1a',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}>
            <strong>{tooltip.nome}</strong> · {tooltip.pct}%
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '160px' }}>
        {planos.map((p) => (
          <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: fundo(p) }} />
            <span style={{ flex: 1 }}>{p.nome}</span>
            <strong>{p.total}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarraReceita({ receita }) {
  const itens = [
    { label: 'Assinaturas', atual: receita.assinatura.mes_atual, anterior: receita.assinatura.mes_anterior },
    { label: 'Serviços freelancer', atual: receita.acordo.mes_atual, anterior: receita.acordo.mes_anterior },
  ];
  const max = Math.max(1, ...itens.flatMap((i) => [Number(i.atual), Number(i.anterior)]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {itens.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <strong style={{ fontSize: '0.95rem' }}>{item.label}</strong>
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              <strong style={{ color: CORES.salmao }}>{formatBRL(item.atual)}</strong>
              {' · '}
              <span style={{ color: CORES.roxoSuave }}>{formatBRL(item.anterior)}</span>
              {' (mês anterior)'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }}>
              <div style={{
                width: `${(Number(item.atual) / max) * 100}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'var(--holo-gradient-salmon)',
              }} />
            </div>
            <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }}>
              <div style={{
                width: `${(Number(item.anterior) / max) * 100}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'var(--holo-gradient-purple)',
                opacity: 0.55,
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusLista({ itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {itens.map((item) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
            {item.label}
          </span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function SecaoCard({ titulo, itens }) {
  return (
    <div>
      <h4 style={{ margin: '0 0 0.7rem', fontSize: '0.95rem' }}>{titulo}</h4>
      <StatusLista itens={itens} />
    </div>
  );
}

function CardTitulo({ icon: Icon, children, acao }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
        <Icon size={20} color={CORES.roxo} />
        {children}
      </h3>
      {acao}
    </div>
  );
}

export default function DashboardModeracao() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/admin/dashboard/`, {
        headers: { Authorization: `Token ${token}` },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.detail || json.error || 'Não foi possível carregar o dashboard.');
      }
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        Carregando dados do dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#ff4757', background: 'rgba(255,71,87,.1)', borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const comparativo = [
    { label: 'Novos usuários', atual: data.geral.usuarios.mes_atual, anterior: data.geral.usuarios.mes_anterior },
    { label: 'Freelancers', atual: data.geral.freelancers.mes_atual, anterior: data.geral.freelancers.mes_anterior },
    { label: 'Contratantes', atual: data.geral.contratantes.mes_atual, anterior: data.geral.contratantes.mes_anterior },
    { label: 'Denúncias', atual: data.geral.denuncias.mes_atual, anterior: data.geral.denuncias.mes_anterior },
    { label: 'Cancelamentos de planos', atual: data.geral.cancelamentos_planos.mes_atual, anterior: data.geral.cancelamentos_planos.mes_anterior },
  ];

  const grid = (min = '280px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))`,
    gap: '1rem',
    marginBottom: '1rem',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Visão geral</h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
            Comparação do mês atual com o mês anterior em toda a plataforma.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={carregar}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <div style={grid()}>
        <KpiCard
          icon={Users}
          color={CORES.azul}
          bg="linear-gradient(135deg, #39758F 0%, #294E68 100%)"
          dark
          title="Usuários"
          value={data.geral.usuarios.total}
          item={data.geral.usuarios}
        />
        <KpiCard
          icon={UserPlus}
          color={CORES.roxo}
          bg="linear-gradient(135deg, #665A86 0%, #4C4268 100%)"
          dark
          title="Freelas"
          value={data.geral.freelas.total}
          item={data.geral.freelas}
          rodape={
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              <strong style={{ color: '#9be8c0' }}>{data.geral.freelas.fecharam_acordo_mes}</strong>{' '}
              pessoa(s) fecharam acordo no mês
            </div>
          }
        />
        <KpiCard
          icon={Flag}
          color="#ff4757"
          bg="linear-gradient(135deg, #9B5D63 0%, #6F3F49 100%)"
          dark
          title="Denúncias"
          value={data.denuncias.total}
          item={data.geral.denuncias}
        />
      </div>

      <div style={grid()}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <CardTitulo icon={Package}>
            Mês atual × mês anterior
            <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 500 }}>
              <span style={{ color: CORES.salmao }}>■ atual</span> <span style={{ color: CORES.roxo }}>■ anterior</span>
            </span>
          </CardTitulo>
          <BarraComparativa data={comparativo} />
        </div>

        <div className="card">
          <CardTitulo icon={Gem}>Distribuição de planos</CardTitulo>
          <DonutPlanos planos={data.planos} />
          <div style={{
            marginTop: '1rem',
            padding: '0.8rem',
            borderRadius: '8px',
            background: 'var(--holo-gradient-gold)',
            color: '#1a1a1a',
            textAlign: 'center',
            fontWeight: 700,
          }}>
            {data.assinaturas_ativas} assinatura(s) ativa(s)
          </div>
        </div>
      </div>

      <div style={grid()}>
        <div className="card">
          <CardTitulo icon={CreditCard}>Receita do mês</CardTitulo>
          <BarraReceita receita={data.receita} />
        </div>

        <div className="card">
          <CardTitulo icon={Flag}>Moderação</CardTitulo>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <SecaoCard
              titulo="Denúncias"
              itens={[
                { label: 'Total', value: data.denuncias.total, color: CORES.roxo },
                { label: 'Pendentes', value: data.denuncias.pendentes, color: CORES.dourado },
                { label: 'Procedentes', value: data.denuncias.procedentes, color: CORES.verde },
                { label: 'Improcedentes', value: data.denuncias.improcedentes, color: '#ff4757' },
              ]}
            />
            <SecaoCard
              titulo="Cancelamentos de acordos"
              itens={[
                { label: 'Total', value: data.cancelamentos.total, color: CORES.roxo },
                { label: 'Pendentes', value: data.cancelamentos.pendentes, color: CORES.dourado },
                { label: 'Aprovados', value: data.cancelamentos.aprovados, color: CORES.verde },
                { label: 'Recusados', value: data.cancelamentos.recusados, color: '#ff4757' },
              ]}
            />
            <SecaoCard
              titulo="Alterações de acordos"
              itens={[
                { label: 'Total', value: data.alteracoes.total, color: CORES.roxo },
                { label: 'Pendentes', value: data.alteracoes.pendentes, color: CORES.dourado },
                { label: 'Aprovadas', value: data.alteracoes.aprovadas, color: CORES.verde },
                { label: 'Recusadas', value: data.alteracoes.recusadas, color: '#ff4757' },
              ]}
            />
          </div>
        </div>

        <div className="card">
          <CardTitulo icon={Package}>Plataforma</CardTitulo>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <SecaoCard
              titulo="Anúncios"
              itens={[
                { label: 'Total', value: data.anuncios.total, color: CORES.roxo },
                { label: 'Ativos', value: data.anuncios.ativos, color: CORES.verde },
                { label: 'Finalizados', value: data.anuncios.finalizados, color: CORES.azul },
              ]}
            />
            <SecaoCard
              titulo="Acordos de serviço"
              itens={[
                { label: 'Total', value: data.acordos.total, color: CORES.roxo },
                { label: 'Ativos', value: data.acordos.ativos, color: CORES.verde },
                { label: 'Pendentes de pagamento', value: data.acordos.pendentes_pagamento, color: CORES.dourado },
                { label: 'Concluídos', value: data.acordos.concluidos, color: CORES.azul },
                { label: 'Cancelados', value: data.acordos.cancelados, color: '#ff4757' },
              ]}
            />
            <SecaoCard
              titulo="Movimentação"
              itens={[
                { label: 'Candidaturas', value: data.candidaturas, color: CORES.roxoSuave },
                { label: 'Avaliações', value: data.avaliacoes, color: CORES.salmao },
                { label: 'Cancelamentos de planos (mês)', value: data.geral.cancelamentos_planos.mes_atual, color: '#ff4757' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
