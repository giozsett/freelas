// Localização no formulário de anúncio (criar e editar) ↔ campos da API.
import { arredondarCoordenada } from './geo.js';

export const LOCALIZACAO_VAZIA = {
  estado: '', cidade: '', bairro: '', address: '', addressNumber: '',
  latitude: null, longitude: null, localConfirmado: false,
};

const numeroOuNulo = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));

// Anúncio salvo com local já foi confirmado por quem publicou
export function localizacaoDoAnuncio(ad) {
  const latitude = numeroOuNulo(ad.latitude);
  const longitude = numeroOuNulo(ad.longitude);
  return {
    estado: ad.estado || '',
    cidade: ad.cidade || '',
    bairro: ad.bairro || '',
    address: ad.address || '',
    addressNumber: ad.address_number || '',
    latitude,
    longitude,
    localConfirmado: latitude !== null && longitude !== null,
  };
}

export function camposDeLocalizacao(locationType, local) {
  const presencial = locationType === 'presencial';
  const temPonto = presencial && local.latitude !== null && local.longitude !== null;
  return {
    location_type: locationType,
    address: presencial ? local.address : '',
    address_number: presencial ? local.addressNumber : '',
    estado: presencial ? local.estado : '',
    cidade: presencial ? local.cidade : '',
    bairro: presencial ? local.bairro : '',
    latitude: temPonto ? arredondarCoordenada(local.latitude) : null,
    longitude: temPonto ? arredondarCoordenada(local.longitude) : null,
  };
}

export function erroDeLocalizacao(locationType, local) {
  if (locationType !== 'presencial' || local.latitude === null || local.localConfirmado) return '';
  return 'Confirme o local do trabalho no mapa antes de publicar.';
}
