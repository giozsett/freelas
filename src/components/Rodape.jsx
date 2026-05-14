import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ 
      background: 'var(--surface-color)', 
      borderTop: '1px solid var(--border-color)', 
      padding: '2rem 0',
      marginTop: 'auto'
    }}>
      <div className="container" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>
          &copy; {new Date().getFullYear()} FreelasAntigravity. Todos os direitos reservados.
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--text-color)', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem' }}>Início</Link>
          <Link to="/plans" style={{ color: 'var(--text-color)', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem' }}>Planos</Link>
          <Link to="/moderator-login" style={{ color: 'var(--text-color)', opacity: 0.5, textDecoration: 'none', fontSize: '0.9rem' }}>Acesso Restrito</Link>
        </div>
      </div>
    </footer>
  );
}
