import PropTypes from 'prop-types';

export default function CarrosselIndicador({ count, active, onDotClick, className = '' }) {
  if (!count || count <= 1) return null;

  return (
    <div className={`carrossel-indicador ${className}`} role="tablist" aria-label="Itens do carrossel">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-label={`Ir para item ${index + 1}`}
          aria-selected={index === active}
          className={`carrossel-indicador__dot${index === active ? ' carrossel-indicador__dot--active' : ''}`}
          onClick={() => onDotClick?.(index)}
        />
      ))}
    </div>
  );
}

CarrosselIndicador.propTypes = {
  count: PropTypes.number.isRequired,
  active: PropTypes.number.isRequired,
  onDotClick: PropTypes.func,
  className: PropTypes.string,
};
