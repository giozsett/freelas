import { useState } from 'react';
import { Send, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReportModal from '../components/ReportModal';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Olá, me interessei pelo seu serviço de adestramento.', sender: 'other', time: '10:00' },
    { id: 2, text: 'Olá Ana! Que ótimo. Como posso ajudar o seu pet?', sender: 'me', time: '10:05' },
    { id: 3, text: 'Tenho um filhote muito agitado e ansioso.', sender: 'other', time: '10:07' },
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages([...messages, { id: Date.now(), text: message, sender: 'me', time: 'Agora' }]);
    setMessage('');
  };

  return (
    <div className="chat-layout">
      
      {/* Sidebar - Contatos */}
      <aside className="card" style={{ padding: '1rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Conversas</h2>
        <div className="chat-contacts">
          
          <div className="dark-text" style={{ padding: '0.75rem 1rem', border: 'var(--border-width) solid var(--border-color)', background: 'var(--holo-gradient-salmon)', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
            Ana Clara
          </div>
          <div style={{ padding: '0.75rem 1rem', border: 'var(--border-width) solid var(--border-color)', cursor: 'pointer', background: 'var(--surface-color)', borderRadius: '4px' }}>
            Roberto Oliveira
          </div>

        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '1.25rem', borderBottom: 'var(--border-width) solid var(--border-color)', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--holo-blue)', border: '1px solid var(--border-color)', flexShrink: 0 }}></div>
           <h3 style={{ margin: 0, fontSize: '1.2rem', flex: 1 }}>Ana Clara</h3>
           
           {/* Report User Button */}
           <button 
             onClick={() => setIsReportModalOpen(true)}
             style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             title="Denunciar Usuário"
           >
             <HelpCircle size={24} color="#ff4757" />
           </button>
           
           <Link to="/user/2" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Ver Perfil</Link>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-color)', minHeight: '300px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div className={msg.sender === 'me' ? 'dark-text' : ''} style={{ 
                padding: '1rem', 
                background: msg.sender === 'me' ? 'var(--holo-salmon)' : 'var(--surface-color)', 
                color: msg.sender === 'other' ? 'var(--text-color)' : 'inherit',
                border: '1px solid var(--border-color)',
                boxShadow: '1px 1px 4px var(--shadow-color)',
                borderRadius: '8px',
                marginBottom: '0.25rem',
                wordBreak: 'break-word'
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: '0.8rem', textAlign: msg.sender === 'me' ? 'right' : 'left', opacity: 0.7 }}>
                {msg.time}
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', borderTop: 'var(--border-width) solid var(--border-color)' }}>
          <input 
            type="text" 
            placeholder="Digite algo..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ flex: 1, padding: '1.25rem', fontSize: '1rem', border: 'none', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
          />
          <button type="submit" className="btn dark-text" style={{ borderRadius: 0, border: 'none', borderLeft: 'var(--border-width) solid var(--border-color)', padding: '0 1.5rem' }}>
            <Send size={24} />
          </button>
        </form>

      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        targetId="2" 
        targetName="Ana Clara" 
        type="user" 
      />
    </div>
  );
}
