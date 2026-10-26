import { useEffect, useState } from 'react';

const API = 'http://localhost:8000';
const ESPERA_MS = 300;

/**
 * Sugestões da busca semântica do catálogo (GET /api/catalogo/buscar/) para o
 * texto digitado: "cuidar do meu filho à noite" → "Babá Noturna".
 * Espera a pessoa parar de digitar e cancela a requisição anterior.
 * Devolve a lista de resultados ({ tipo, nome, categorias, pontuacao }).
 */
export default function useSugestoesCatalogo(consulta, { tipo, categoria, ativo = true } = {}) {
  const [resultados, setResultados] = useState([]);
  const termo = (consulta || '').trim();

  useEffect(() => {
    if (!ativo || termo.length < 3) {
      setResultados([]);
      return undefined;
    }
    const controle = new AbortController();
    const espera = setTimeout(() => {
      const parametros = new URLSearchParams({ q: termo });
      if (tipo) parametros.set('tipo', tipo);
      if (categoria) parametros.set('categoria', categoria);
      fetch(`${API}/api/catalogo/buscar/?${parametros}`, { signal: controle.signal })
        .then((res) => (res.ok ? res.json() : { resultados: [] }))
        .then((data) => setResultados(data.resultados || []))
        .catch((err) => {
          if (err.name !== 'AbortError') setResultados([]);
        });
    }, ESPERA_MS);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termo, tipo, categoria, ativo]);

  return resultados;
}
