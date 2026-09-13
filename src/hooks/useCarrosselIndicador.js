import { useEffect, useRef, useState } from 'react';

/**
 * Sincroniza um índice ativo com a posição de scroll horizontal de um
 * container cujos filhos diretos são os "itens" do carrossel.
 */
export default function useCarrosselIndicador(count) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !count) return undefined;

    let frame = null;
    const update = () => {
      frame = null;
      const children = Array.from(el.children);
      if (!children.length) return;
      let closest = 0;
      let closestDistance = Infinity;
      children.forEach((child, index) => {
        const distance = Math.abs(child.offsetLeft - el.scrollLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = index;
        }
      });
      setActiveIndex(closest);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [count]);

  const scrollToIndex = (index) => {
    const el = containerRef.current;
    const child = el?.children?.[index];
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  };

  return { containerRef, activeIndex, scrollToIndex };
}
