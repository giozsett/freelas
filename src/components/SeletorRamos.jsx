import PropTypes from 'prop-types';
import SeletorMultiplo from './SeletorMultiplo';
import { RAMOS_EMPRESA, MAX_RAMOS_EMPRESA } from '../constants/options';

// Ramos de atuação da empresa: só aceita ramos da lista fixa (até MAX_RAMOS_EMPRESA).
export default function SeletorRamos({ valor, onChange }) {
  return (
    <SeletorMultiplo
      valor={valor}
      onChange={onChange}
      opcoes={RAMOS_EMPRESA}
      maximo={MAX_RAMOS_EMPRESA}
      singular="ramo"
      plural="ramos"
    />
  );
}

SeletorRamos.propTypes = {
  valor: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
};
