/* eslint-disable react/prop-types */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';

const DialogoContext = createContext(null);

export function ProvedorDialogo({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolver = useRef(null);

  const abrir = useCallback((opcoes) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialogo({ tipo: 'alerta', titulo: 'Aviso', ...opcoes });
  }), []);

  const alerta = useCallback((mensagem, opcoes = {}) => abrir({
    mensagem,
    tipo: 'alerta',
    titulo: opcoes.titulo || 'Aviso',
    variante: opcoes.variante || 'info',
    confirmarTexto: opcoes.confirmarTexto || 'Entendi',
  }), [abrir]);

  const confirmar = useCallback((mensagem, opcoes = {}) => abrir({
    mensagem,
    tipo: 'confirmacao',
    titulo: opcoes.titulo || 'Confirmar ação',
    variante: opcoes.variante || 'info',
    confirmarTexto: opcoes.confirmarTexto || 'Confirmar',
    cancelarTexto: opcoes.cancelarTexto || 'Cancelar',
  }), [abrir]);

  const solicitarTexto = useCallback((mensagem, opcoes = {}) => abrir({
    mensagem,
    tipo: 'texto',
    titulo: opcoes.titulo || 'Informe os detalhes',
    valorInicial: opcoes.valorInicial || '',
    placeholder: opcoes.placeholder || '',
    confirmarTexto: opcoes.confirmarTexto || 'Continuar',
    cancelarTexto: opcoes.cancelarTexto || 'Cancelar',
  }), [abrir]);

  const finalizar = useCallback((resultado) => {
    resolver.current?.(resultado);
    resolver.current = null;
    setDialogo(null);
  }, []);

  return (
    <DialogoContext.Provider value={{ alerta, confirmar, solicitarTexto }}>
      {children}
      {dialogo && <Dialogo dialogo={dialogo} onFinish={finalizar} />}
    </DialogoContext.Provider>
  );
}

function Dialogo({ dialogo, onFinish }) {
  const [valor, setValor] = useState(dialogo.valorInicial || '');
  const confirmButton = useRef(null);

  useEffect(() => {
    confirmButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onFinish(dialogo.tipo === 'alerta' ? undefined : null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialogo.tipo, onFinish]);

  const Icone = dialogo.variante === 'perigo'
    ? AlertCircle
    : dialogo.variante === 'sucesso' ? CheckCircle : HelpCircle;

  const confirmarResultado = () => onFinish(dialogo.tipo === 'texto' ? valor : true);
  const cancelarResultado = () => onFinish(dialogo.tipo === 'confirmacao' ? false : null);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && dialogo.tipo !== 'alerta') cancelarResultado();
    }}>
      <section className={`dialog-card dialog-${dialogo.variante || 'info'}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <button className="dialog-close" type="button" aria-label="Fechar" onClick={() => onFinish(dialogo.tipo === 'alerta' ? undefined : null)}><X size={21} /></button>
        <div className="dialog-heading">
          <span className="dialog-icon"><Icone size={23} /></span>
          <h2 id="dialog-title">{dialogo.titulo}</h2>
        </div>
        <p id="dialog-message">{dialogo.mensagem}</p>
        {dialogo.tipo === 'texto' && (
          <textarea className="input" rows="4" value={valor} onChange={(event) => setValor(event.target.value)} placeholder={dialogo.placeholder} autoFocus />
        )}
        <div className="dialog-actions">
          {dialogo.tipo !== 'alerta' && <button type="button" className="btn btn-secondary" onClick={cancelarResultado}>{dialogo.cancelarTexto}</button>}
          <button ref={confirmButton} type="button" className="btn dialog-confirm" onClick={confirmarResultado}>{dialogo.confirmarTexto}</button>
        </div>
      </section>
    </div>
  );
}

export function useDialogo() {
  const contexto = useContext(DialogoContext);
  if (!contexto) throw new Error('useDialogo deve ser usado dentro de ProvedorDialogo.');
  return contexto;
}
