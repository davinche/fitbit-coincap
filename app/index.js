/*
 * Entry point for the watch app
 */
import document from "document";
import { peerSocket } from 'messaging';
import { createLogger } from '../common/logger';

const logger = createLogger('app');

// App Header Clock
const updateClock = (function() {
  const elem = document.getElementById('app-header').getElementById('header-time');
  return function() {
    const d = new Date();
    let h = d.getHours() % 12;
    if (h === 0) {
      h = 12;
    }
    let m = d.getMinutes();
    if (m < 10) {
      m = '0' + m;
    }
    const ampm = d.getHours() / 12 >= 1 ? 'PM' : 'AM';
    elem.textContent = `${h}:${m}${ampm}`;
  };
}());
updateClock();
setInterval(updateClock, 1000);

// setInterval(function() {
//   console.log("Connectivity status=" + peerSocket.readyState +
//               " Connected? " + (peerSocket.readyState === peerSocket.OPEN ? "YES" : "no"));
// }, 3000);

function priceStyle(coin, style='neutral') {
  const bg = coin.getElementById('price-bg');
  const name = coin.getElementById('coin-name');
  const price = coin.getElementById('coin-price');
  const change = coin.getElementById('coin-price-change');
  
  switch(style) {
    case 'up':
      bg.style.fill = '#003A01';
      name.style.opacity = 1;
      price.style.opacity = 1;
      change.style.opacity = 1;
      change.style.fill = '#00FF00';
      break;
    case 'down':
      bg.style.fill = '#3A0A00';
      name.style.opacity = 1;
      price.style.opacity = 1;
      change.style.opacity = 1;
      change.style.fill = '#FF0000';
      break;
    default:
      bg.style.fill = '#222222';
      name.style.opacity = 0.5;
      price.style.opacity = 0.5;
      change.style.opacity = 0.5;
      change.style.fill = '#666666';
  }
}
// Barrier Stuff for initial load
const newBarrierState = () => {
  logger.log('creating new barrier state');
  return {inProgress: false, total: 0, current: 0, updateList: [], staleList:[]};
}
let barrierState = newBarrierState();

// Update the element corresponding to the coin
function updateElem(elem, coin, status, fromCache=false) {
  logger.log('updating elem');
  logger.info(`status=${status}; fromCache=${fromCache}`);
  if (status === 'failure') {
    return;
  }
  
  const price = ((Math.floor(coin.price * 100) / 100) + '').split('.');
  const dollar = price[0];
  const cents = typeof price[1] === 'undefined' ? '00' :
    (price[1].length > 1 ? price[1] : price[1] + '0');
  let change = coin.cap24hrChange >= 0 ? 'up' : 'down';
  if (fromCache) {
    change = 'stale';
  }
  logger.info(`dollarAmt=${dollar}; centsAmt=${cents}; changeType=${change}`);
  elem.getElementById('coin-name').textContent = `${coin.display_name} (${coin.id})`;
  elem.getElementById('coin-price').textContent = `${dollar}.${cents}`;
  elem.getElementById('coin-price-change').textContent = `${coin.cap24hrChange > 0 ? '+': ''}${coin.cap24hrChange}%`;
  priceStyle(elem, change);
  elem.style.display = 'inline';
  elem.style.visibility = 'visible';
}

// Initial Coin Payload Processing
function initCoinData(evt) {
  logger.log('initCoinData');
  if (evt.data.type !== 'initCoinData') return;
  if (!barrierState.inProgress) {
    logger.log('setting barrier inProgress to TRUE');
    const total = evt.data.total;
    barrierState.inProgress = true;
    barrierState.total = total;
    // if list is < 20, hide elems
    for(let i=0; i<20; i++) {
      const elem = document.getElementById(`coin-${i}`);
      elem.style.visibility = 'hidden';
      if(i < total) {
        continue;
      }
      logger.info(`hiding elem: index=${i}`);
      elem.style.display = 'none';
    }
  }
  
  const {coin, index, status, fromCache} = evt.data.data;
  const elem = document.getElementById(`coin-${index}`);
  barrierState.updateList[index] = {elem, coin, status, fromCache};
  barrierState.current += 1;
  
  // Keep track of items that were from cache so we can request for fresh copy
  if (fromCache) {
    barrierState.staleList.push({index, name: coin.id});
  }

  // Check end condition
  if (barrierState.current === barrierState.total) {
    document.getElementById('loading-text').style.display = 'none';
    barrierState.updateList.forEach((s) => {
      updateElem(s.elem, s.coin, s.status, s.fromCache);
    });
    
    // request for updates
    requestForCoinUpdate(barrierState.staleList);
    // reset barrier state
    barrierState = newBarrierState();
  }
}

function requestForCoinUpdate(staleList) {
  logger.log('request coin update for stale coins');
  if (peerSocket.readyState !== peerSocket.OPEN || !staleList.length) {
    logger.error('peer socket not ready');
    return;
  }
  
  staleList.forEach((c, index) => {
    const data = {type: 'updateCoin'};
    data.value = c;
    setTimeout(() => {
     logger.info(`sending request for update: coin=${c.name}`);
     peerSocket.send(data);
    }, index * 50);
  });
}

function updateCoinData(evt) {
  if (evt.data.type !== 'coinData') return;
  logger.log('updating coin data');
  const {coin, index, status} = evt.data.data;
  logger.info(`coin=${coin.id}; index=${index}; status=${status}`);
  const elem = document.getElementById(`coin-${index}`);
  updateElem(elem, coin, status);
}

// Messaging Stuff
peerSocket.onopen = function() {
  logger.log('peerSocket open');
  peerSocket.send({type: 'init'});
};

peerSocket.onmessage = function(evt) {
  if (evt.data.type !== 'coinData' && evt.data.type !== 'initCoinData') return;
  logger.log('peerSocket onmessage');
  logger.info(`type=${evt.data.type}`);
  initCoinData(evt);
  updateCoinData(evt);
};