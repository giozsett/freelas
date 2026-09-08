import { useEffect, useRef } from 'react';

/**
 * Marca no elemento com scroll horizontal se ele está no início/fim,
 * via atributos data-at-start/data-at-end (lidos pela classe CSS .scroll-fade).
 */
export default function useScrollEdges() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      el.setAttribute('data-at-start', String(atStart));
      el.setAttribute('data-at-end', String(atEnd));
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return ref;
}
