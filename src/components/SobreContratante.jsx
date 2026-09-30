import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Briefcase, CalendarDays, Edit3, Globe, Handshake, Ruler, UserRound } from 'lucide-react';
import { PORTES_EMPRESA } from '../constants/options';

const ROTULO_PORTE = Object.fromEntries(PORTES_EMPRESA.map(({ valor, rotulo }) => [valor, rotulo]));

function Vazio({ texto }) {
  return <p style={{ opacity: 0.7, margin: 0 }}>{texto}</p>;
}

Vazio.propTypes = {
  texto: PropTypes.string.isRequired,
};

/**
 * Título de seção com o lápis de edição (só no próprio perfil), no mesmo
 * estilo do lápis das habilidades do freelancer. Abre a edição direto na aba
 * onde ficam esses campos.
 */
function TituloSecao({ icone: Icone, titulo, proprio }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {Icone && <Icone size={20} color="var(--primary)" />} {titulo}
      </h2>
      {proprio && (
        <Link to="/profile/edit" state={{ aba: 'atuacao' }} title={`Editar ${titulo.toLowerCase()}`} aria-label={`Editar ${titulo.toLowerCase()}`} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', cursor: 'pointer', flexShrink: 0 }}>
          <Edit3 size={18} />
        </Link>
      )}
    </div>
  );
}

TituloSecao.propTypes = {
  icone: PropTypes.elementType,
  titulo: PropTypes.string.isRequired,
  proprio: PropTypes.bool,
};

/**
 * Aba "Sobre" do perfil de contratante (próprio e público): o que contrata,
 * como trabalha com freelancers e, para empresa com CNPJ, os dados da empresa.
 * Substitui as abas de freelancer (habilidades, experiência e formação).
 */
export default function SobreContratante({ perfil, ehEmpresa, proprio = false }) {
  const servicos = perfil.servicos_contratados || [];
  const anosDeEmpresa = perfil.ano_fundacao ? new Date().getFullYear() - perfil.ano_fundacao : null;
  const dadosEmpresa = [
    perfil.porte_empresa && {
      icone: Ruler, rotulo: 'Porte', valor: ROTULO_PORTE[perfil.porte_empresa] || perfil.porte_empresa,
    },
    perfil.ano_fundacao && {
      icone: CalendarDays,
      rotulo: 'Fundada em',
      valor: `${perfil.ano_fundacao}${anosDeEmpresa > 0 ? ` (há ${anosDeEmpresa} ${anosDeEmpresa === 1 ? 'ano' : 'anos'})` : ''}`,
    },
    perfil.responsavel_nome && {
      icone: UserRound,
      rotulo: 'Responsável pelas contratações',
      valor: [perfil.responsavel_nome, perfil.responsavel_cargo].filter(Boolean).join(' — '),
    },
    perfil.site_empresa && {
      icone: Globe,
      rotulo: 'Site',
      valor: <a href={perfil.site_empresa} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }}>{perfil.site_empresa}</a>,
    },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <TituloSecao icone={Briefcase} titulo="Serviços que contrata" proprio={proprio} />
        {servicos.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {servicos.map((servico) => <span key={servico} className="badge purple">{servico}</span>)}
          </div>
        ) : <Vazio texto="Nenhum serviço informado." />}
      </div>

      <div>
        <TituloSecao icone={Handshake} titulo="Como trabalha com freelancers" proprio={proprio} />
        {perfil.como_trabalha
          ? <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{perfil.como_trabalha}</p>
          : <Vazio texto="Ainda não descreveu como trabalha com freelancers." />}
      </div>

      {ehEmpresa && (
        <div>
          <TituloSecao titulo="Dados da empresa" proprio={proprio} />
          {dadosEmpresa.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {dadosEmpresa.map(({ icone: Icone, rotulo, valor }) => (
                <div key={rotulo} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <Icone size={15} /> {rotulo}
                  </div>
                  <div style={{ fontWeight: 600 }}>{valor}</div>
                </div>
              ))}
            </div>
          ) : <Vazio texto="Nenhum dado da empresa informado." />}
        </div>
      )}
    </div>
  );
}

SobreContratante.propTypes = {
  perfil: PropTypes.shape({
    servicos_contratados: PropTypes.arrayOf(PropTypes.string),
    como_trabalha: PropTypes.string,
    porte_empresa: PropTypes.string,
    ano_fundacao: PropTypes.number,
    responsavel_nome: PropTypes.string,
    responsavel_cargo: PropTypes.string,
    site_empresa: PropTypes.string,
  }).isRequired,
  ehEmpresa: PropTypes.bool,
  proprio: PropTypes.bool,
};
