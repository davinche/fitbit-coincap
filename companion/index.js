import { settingsStorage } from 'settings';
import { localStorage } from 'local-storage';
import { me } from "companion";
import * as messaging from 'messaging';
import * as api from './coincap_api';
import { createLogger } from '../common/logger';

const logger = createLogger('companion');

// Helper
const MILLISECONDS_PER_MINUTE = 1000 * 60;

// Helpful to check whether we are connected or not.
// setInterval(function() {
//   console.log("Companion (" + me.buildId + ") running - Connectivity status=" + messaging.peerSocket.readyState +
//               " Connected? " + (messaging.peerSocket.readyState == messaging.peerSocket.OPEN ? "YES" : "no"));
// }, 3000);


// refreshCoinsList fetches all coins and symbols from coincap.
// Used by Settings Page AutoComplete.
const refreshCoinsList = () => {
  logger.log('refreshing coin list');
  api.getCoins()
  .then((data) => {
    return data.map((item) => {
      return {
        name: item.symbol,
        value: `${item.name} (${item.symbol})`
      };
    });
  })
  .then((data) => {
    settingsStorage.setItem('coinslist', JSON.stringify(data));
  })
  .catch((e) => {
    logger.error('fetch err: ' + e);
  });
}

const getCoinData = (coinName, cacheFirst=true) => {
  logger.log('getCoinData');
  logger.info(`coinName=${coinName}, cacheFirst=${cacheFirst}`);
  return new Promise((resolve, reject) => {
    if (cacheFirst) {
      const cached = localStorage.getItem(coinName);
      if (cached) {
        logger.log('resolving from cache');
        const coin = JSON.parse(cached);
        return resolve({coin, fromCache: true});
      }
    }
    api.getCoinData(coinName)
    .then((c) => {
      logger.log('resolving from api');
      localStorage.setItem(coinName, JSON.stringify(c));
      resolve({coin: c, fromCache: false});
    }).catch(() => {
      logger.error('error from api');
      reject();
    });
  });
};

// updateCoinsData fetches coin data
// and sends it to the app to be rendered into the UI.
const updateCoinsData = (coins, updateEvent='initCoinData', cacheFirst=true) => {
  logger.log('updateCoinsData');
  logger.info(`event=${updateEvent}; cacheFirst=${cacheFirst}`);
  Promise.all(coins.map((c) => {
    const {name, index} = c;
    return getCoinData(name, cacheFirst)
      .then((c) => {
        logger.info(`successfully fetched update: coin=${name}`);
        return {coin: c.coin, index, status: 'success', fromCache: c.fromCache};
      }, () => {
        logger.error(`failed to update: coin=${name}`);
        return {coin: null, index, status: 'failure', fromCache: false};
      });
  }))
  .then((coinsData) => {
    logger.log('sending coin data to UI');
    const total = coinsData.length;
    logger.info(`total=${total}`);
    coinsData.forEach((c, index) => {
      setTimeout(() => {
        sendCoinDataToUI(updateEvent, c, total);
      }, 50);
    });
  })
  .catch((e) => {
    logger.error('update coins err: e=', e);
  })
};

// sendCoinDataToUI sends coin data back to the app
const sendCoinDataToUI = (type, coinData, total) => {
  if (!messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    logger.error('peer socket not ready');
    return;
  }
  logger.log('sending coin data to ui');
  logger.info(`type=${type}; total=${total}`);
  const data = {type, data: coinData, total};
  messaging.peerSocket.send(data);
}

// getFallbackCoins gives a list of top 20 coins
// in the event that the user has not configured their watch list yet.
const getFallbackCoins = () => {
  // fallback to front
  logger.log('getting fallback coins');
  return api.getTopCoins()
  .then(coins => coins.slice(0, 5).map((c, index) => {
    return {index, name: c.short};
  }));
};

// handler for when settings get changed.
const handleSettingsChange = (e) => {
  if (e.key !== 'coins') return;
  logger.log('handle settings change');
  const coinSymbols = JSON.parse(e.newValue).map((item, index) => {
    return {index, name: item.name};
  });
  if (!coinSymbols.length) {
    getFallbackCoins()
    .then(updateCoinsData);
    return;
  }
  updateCoinsData(coinSymbols);
};

const getSettingsCoins = () => {
  logger.log('getting settings coins');
  const c = settingsStorage.getItem('coins');
  if(!c) {
    return getFallbackCoins();
  }
  const coinsSymbols = JSON.parse(c).map((coin, index) => {
    return {index, name: coin.name};
  });
  if (!coinsSymbols.length) {
    return getFallbackCoins();
  }
  return Promise.resolve(coinsSymbols);
};

messaging.peerSocket.onmessage = function(evt) {
  logger.log('peerSocket onmessage');
  logger.info(`type=${evt.data.type}`);
  switch(evt.data.type) {
    case 'init':
      getSettingsCoins().then(updateCoinsData);
      break;
    case 'updateCoin':
      logger.info(`coinName=${evt.data.value.name}`);
      updateCoinsData([evt.data.value], 'coinData', false);
      break;
  }
};

function main() {
  refreshCoinsList();
  settingsStorage.addEventListener('change', handleSettingsChange);
}

setInterval(() => {
  getSettingsCoins().then(updateCoinsData);
}, MILLISECONDS_PER_MINUTE * 5);

if (me.launchReasons.peerAppLaunched) {
  main();
} else {
  me.yield();
}
