const BASE_URL = 'https://coincap.io';

export function getCoins() {
  const url = `${BASE_URL}/map`;
  return fetch(url)
    .then(resp => resp.json());
}

export function getTopCoins() {
  const url = `${BASE_URL}/front`;
  return fetch(url)
    .then(resp => resp.json());
}

export function getCoinData(coin) {
  const url = `${BASE_URL}/page/${coin}`;
  return fetch(url)
    .then(resp => resp.json());
}