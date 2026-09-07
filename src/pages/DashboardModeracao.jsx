/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarRange,
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
  verde: 'var(--success-color)',
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

const formatDateBR = (iso) => {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const PRESETS_PERIODO = [
  { chave: 'mes_atual', label: 'Mês atual' },
  { chave: '7d', label: '7 dias' },
  { chave: '30d', label: '30 dias' },
  { chave: '90d', label: '90 dias' },
  { chave: 'ano', label: '12 meses' },
  { chave: 'custom', label: 'Personalizado' },
];

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
        color: up ? CORES.verde : 'var(--danger-color)',
        background: up ? 'var(--success-soft)' : 'var(--danger-soft)',
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
            Período atual <strong>{item?.atual ?? 0}</strong> · Anterior{' '}
            <strong>{item?.anterior ?? 0}</strong>
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
  const [ativo, setAtivo] = useState(null);
  const fundo = (item) => {
    if (item.nome === 'Gold') return CORES.dourado;
    if (item.nome === 'Platinum') return CORES.roxo;
    return CORES.azul;
  };

  // raio/espessura em coordenadas do viewBox — o SVG escala via width:100% +
  // aspect-ratio:1/1, então o círculo nunca "achata", em qualquer largura.
  const raio = 62;
  const espessura = 22;
  const circ = 2 * Math.PI * raio;

  let acumulado = 0;
  const arcos = planos
    .filter((p) => p.total > 0)
    .map((p) => {
      const offset = (acumulado / total) * circ;
      const comprimento = (p.total / total) * circ;
      acumulado += p.total;
      return { ...p, offset, comprimento };
    });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '150px', aspectRatio: '1 / 1', flex: '0 1 150px' }}>
        <svg viewBox="0 0 150 150" style={{ width: '100%', height: '100%', display: 'block' }}>
          <g transform="rotate(-90 75 75)">
            <circle cx="75" cy="75" r={raio} fill="none" stroke="var(--bg-color)" strokeWidth={espessura} />
            {arcos.map((a) => (
              <circle
                key={a.nome}
                cx="75"
                cy="75"
                r={raio}
                fill="none"
                stroke={fundo(a)}
                strokeWidth={ativo === a.nome ? espessura + 5 : espessura}
                strokeDasharray={`${Math.max(a.comprimento - 1, 0)} ${circ}`}
                strokeDashoffset={-a.offset}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                onMouseEnter={() => setAtivo(a.nome)}
                onMouseLeave={() => setAtivo(null)}
              />
            ))}
          </g>
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}>
          <strong style={{ fontSize: '1.5rem', lineHeight: 1 }}>
            {ativo ? planos.find((p) => p.nome === ativo)?.total : total}
          </strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.7, textAlign: 'center' }}>
            {ativo || 'assinantes'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '160px' }}>
        {planos.map((p) => (
          <div
            key={p.nome}
            onMouseEnter={() => setAtivo(p.nome)}
            onMouseLeave={() => setAtivo(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', cursor: 'pointer',
              opacity: ativo && ativo !== p.nome ? 0.45 : 1, transition: 'opacity 0.15s ease',
            }}
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: fundo(p), flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{p.nome}</span>
            <strong>{p.total}</strong>
            <span style={{ fontSize: '0.78rem', opacity: 0.6, minWidth: '32px', textAlign: 'right' }}>
              {total ? Math.round((p.total / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarraReceita({ receita }) {
  const itens = [
    { label: 'Assinaturas', atual: receita.assinatura.atual, anterior: receita.assinatura.anterior },
    { label: 'Serviços freelancer', atual: receita.acordo.atual, anterior: receita.acordo.anterior },
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
              {' (período anterior)'}
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

function SeletorPeriodo({ periodo, mostrarCustom, customInicio, customFim, onPreset, onCustomInicio, onCustomFim, onAplicarCustom }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, opacity: 0.85 }}>
        <CalendarRange size={17} color={CORES.roxo} />
        Período de comparação
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {PRESETS_PERIODO.map((p) => {
          const selecionado = p.chave === 'custom' ? mostrarCustom : (periodo === p.chave && !mostrarCustom);
          return (
            <button
              key={p.chave}
              type="button"
              onClick={() => onPreset(p.chave)}
              style={{
                appearance: 'none', cursor: 'pointer', font: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                padding: '0.45rem 0.95rem', borderRadius: '999px',
                border: `1px solid ${selecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                background: selecionado ? 'var(--secondary)' : 'var(--bg-color)',
                color: selecionado ? 'var(--primary)' : 'var(--text-color)',
                transition: 'border-color 0.15s ease, background 0.15s ease, color 0.15s ease',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {mostrarCustom && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.8 }}>
            De
            <input
              type="date"
              className="input"
              value={customInicio}
              max={customFim || undefined}
              onChange={(e) => onCustomInicio(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Até
            <input
              type="date"
              className="input"
              value={customFim}
              min={customInicio || undefined}
              onChange={(e) => onCustomFim(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!customInicio || !customFim}
            onClick={onAplicarCustom}
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardModeracao() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState({ periodo: 'mes_atual', dataInicio: '', dataFim: '' });
  const [mostrarCustom, setMostrarCustom] = useState(false);
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ periodo: filtro.periodo });
      if (filtro.periodo === 'custom') {
        params.set('data_inicio', filtro.dataInicio);
        params.set('data_fim', filtro.dataFim);
      }
      const response = await fetch(`${API}/api/admin/dashboard/?${params}`, {
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
  }, [token, filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const selecionarPreset = (chave) => {
    if (chave === 'custom') {
      setMostrarCustom(true);
      return;
    }
    setMostrarCustom(false);
    setFiltro({ periodo: chave, dataInicio: '', dataFim: '' });
  };

  const aplicarCustom = () => {
    if (!customInicio || !customFim) return;
    setFiltro({ periodo: 'custom', dataInicio: customInicio, dataFim: customFim });
  };

  const seletor = (
    <SeletorPeriodo
      periodo={filtro.periodo}
      mostrarCustom={mostrarCustom}
      customInicio={customInicio}
      customFim={customFim}
      onPreset={selecionarPreset}
      onCustomInicio={setCustomInicio}
      onCustomFim={setCustomFim}
      onAplicarCustom={aplicarCustom}
    />
  );

  if (loading) {
    return (
      <div>
        {seletor}
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          Carregando dados do dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {seletor}
        <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const comparativo = [
    { label: 'Novos usuários', atual: data.geral.usuarios.atual, anterior: data.geral.usuarios.anterior },
    { label: 'Freelancers', atual: data.geral.freelancers.atual, anterior: data.geral.freelancers.anterior },
    { label: 'Contratantes', atual: data.geral.contratantes.atual, anterior: data.geral.contratantes.anterior },
    { label: 'Denúncias', atual: data.geral.denuncias.atual, anterior: data.geral.denuncias.anterior },
    { label: 'Cancelamentos de planos', atual: data.geral.cancelamentos_planos.atual, anterior: data.geral.cancelamentos_planos.anterior },
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
            {data.periodo.label} (<strong>{formatDateBR(data.periodo.inicio)}</strong> a <strong>{formatDateBR(data.periodo.fim)}</strong>) comparado ao período equivalente anterior.
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

      {seletor}

      <div style={grid()}>
        <KpiCard
          icon={Users}
          color={CORES.azul}
          bg="linear-gradient(135deg, #4E86A0 0%, #3A6A80 100%)"
          dark
          title="Usuários"
          value={data.geral.usuarios.total}
          item={data.geral.usuarios}
        />
        <KpiCard
          icon={UserPlus}
          color={CORES.roxo}
          bg="linear-gradient(135deg, #7B6F97 0%, #665C82 100%)"
          dark
          title="Freelas"
          value={data.geral.freelas.total}
          item={data.geral.freelas}
          rodape={
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              <strong style={{ color: '#9be8c0' }}>{data.geral.freelas.fecharam_acordo_periodo}</strong>{' '}
              pessoa(s) fecharam acordo no período
            </div>
          }
        />
        <KpiCard
          icon={Flag}
          color="var(--danger-color)"
          bg="linear-gradient(135deg, #A97178 0%, #8C5D63 100%)"
          dark
          title="Denúncias"
          value={data.denuncias.total}
          item={data.geral.denuncias}
        />
      </div>

      <div style={grid()}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <CardTitulo icon={Package}>
            Período atual × anterior
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
            background: 'linear-gradient(135deg, #E8C171 0%, #D1A24C 100%)',
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
                { label: 'Improcedentes', value: data.denuncias.improcedentes, color: 'var(--danger-color)' },
              ]}
            />
            <SecaoCard
              titulo="Cancelamentos de acordos"
              itens={[
                { label: 'Total', value: data.cancelamentos.total, color: CORES.roxo },
                { label: 'Pendentes', value: data.cancelamentos.pendentes, color: CORES.dourado },
                { label: 'Aprovados', value: data.cancelamentos.aprovados, color: CORES.verde },
                { label: 'Recusados', value: data.cancelamentos.recusados, color: 'var(--danger-color)' },
              ]}
            />
            <SecaoCard
              titulo="Alterações de acordos"
              itens={[
                { label: 'Total', value: data.alteracoes.total, color: CORES.roxo },
                { label: 'Pendentes', value: data.alteracoes.pendentes, color: CORES.dourado },
                { label: 'Aprovadas', value: data.alteracoes.aprovadas, color: CORES.verde },
                { label: 'Recusadas', value: data.alteracoes.recusadas, color: 'var(--danger-color)' },
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
                { label: 'Cancelados', value: data.acordos.cancelados, color: 'var(--danger-color)' },
              ]}
            />
            <SecaoCard
              titulo="Movimentação"
              itens={[
                { label: 'Candidaturas', value: data.candidaturas, color: CORES.roxoSuave },
                { label: 'Avaliações', value: data.avaliacoes, color: CORES.salmao },
                { label: 'Cancelamentos de planos (período)', value: data.geral.cancelamentos_planos.atual, color: 'var(--danger-color)' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
