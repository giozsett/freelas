import PropTypes from 'prop-types';

export const DIAS_SEMANA = [
  ['segunda', 'Segunda'],
  ['terca', 'Terça'],
  ['quarta', 'Quarta'],
  ['quinta', 'Quinta'],
  ['sexta', 'Sexta'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];

export const PERIODOS = [
  ['manha', 'Manhã'],
  ['tarde', 'Tarde'],
  ['noite', 'Noite'],
];

export const disponibilidadeVazia = () => Object.fromEntries(
  DIAS_SEMANA.map(([dia]) => [dia, []]),
);

export const normalizarDisponibilidade = (value) => {
  const base = disponibilidadeVazia();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  DIAS_SEMANA.forEach(([dia]) => {
    base[dia] = Array.isArray(value[dia])
      ? value[dia].filter((periodo) => PERIODOS.some(([id]) => id === periodo))
      : [];
  });
  return base;
};

export default function DisponibilidadeSemanal({ value, onChange }) {
  const alternarPeriodo = (dia, periodo) => {
    const atual = normalizarDisponibilidade(value);
    const periodos = atual[dia];
    onChange({
      ...atual,
      [dia]: periodos.includes(periodo)
        ? periodos.filter((item) => item !== periodo)
        : [...periodos, periodo],
    });
  };

  return (
    <fieldset className="availability-fieldset">
      <legend>Disponibilidade</legend>
      <p className="form-help">Selecione os períodos em que você pode trabalhar.</p>
      <div className="availability-grid">
        {DIAS_SEMANA.map(([dia, label]) => (
          <div key={dia} className="availability-day">
            <strong>{label}</strong>
            <div className="availability-periods">
              {PERIODOS.map(([periodo, periodoLabel]) => {
                const selecionado = value?.[dia]?.includes(periodo);
                return (
                  <label key={periodo} className={`availability-option${selecionado ? ' selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(selecionado)}
                      onChange={() => alternarPeriodo(dia, periodo)}
                    />
                    {periodoLabel}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

DisponibilidadeSemanal.propTypes = {
  value: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  onChange: PropTypes.func.isRequired,
};
