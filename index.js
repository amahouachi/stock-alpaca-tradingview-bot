const express = require('express')
const winston = require('winston');
const config= require('./config');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const {Cron}= require('croner');
const fetch= require('node-fetch');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
      winston.format.align(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp, label }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      })
  ),
  defaultMeta: {},
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'application.log' }),
    new winston.transports.Console(),
  ],
});

const alpaca = new Alpaca(config.account.alpaca);
const portfolio= config.portfolio;
let account= {};
let positions= [];

const app = express()
const port = config.port;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function sleep(seconds){
  return new Promise(resolve => {
    setTimeout(function() {resolve()}, seconds*1000);
  })
}

async function getLastPriceFromTwelveData(symbol){
  const twelveData= config.account.twelveData;
  return new Promise(async (resolve, reject) => {
    const response= await fetch(`${twelveData.baseUrl}/time_series?symbol=${symbol}&interval=1min&apikey=${twelveData.apiKey}&outputsize=1&prepost=${twelveData.prepost}`);
    if(response.ok){
      const responseJson= await response.json();
      if(responseJson.status==='ok'){
        const trades= responseJson.values;
        resolve(trades[0].close);
      }else{
        reject(responseJson.message);
      }
    }else{
      reject(`${response.statusText}`);
    }
  });
}
function checkSignal(signal){
  if(!signal.symbols){
    return [false, 'Missing parameter : symbols'];
  }
  if(config.priceSource==='signal' && !signal.prices){
    return [false, 'Missing parameter : prices'];
  }
  if(!signal.action){
    return [false, 'Missing parameter : action'];
  }
  if(!['buy-limit','sell-limit'].includes(signal.action)){
    return [false, `Unknown action : ${signal.action}`];
  }
  if(signal.prices && signal.symbols.length!==signal.prices.length){
    return [false, 'Arrays must have the same length : symbols and prices'];
  }
  return [true];
}

app.post(config.endpoint, async(req, res) => {
  const signal= req.body;
  res.send('');
  res.end();
  logger.info(`Received signal : ${JSON.stringify(signal)}`);
  const [isValidSignal, signalError]= checkSignal(signal);
  if(isValidSignal){
    processSignal(signal);
  }else{
    logger.error(`Invalid signal. ${signalError}`);
  }
});

async function loadPositions(){
  try{
    positions= await alpaca.getPositions();
  }catch (e) {
    logger.error(`Failed to load positions : ${e.message}`);
  }
}
async function protectPositions(){
  for(const position of positions){
    await openTpSlOrders(position);
  }
}
async function loadAccount(){
  try{
    account= await alpaca.getAccount();
  }catch (e) {
    logger.error(`Failed to load account : ${e.message}`);
  }
}
function getCapital(){
  let capital= parseInt(account.cash);
  positions.forEach(position => capital+= parseInt(position.cost_basis));
  return capital;
}
async function openLongPosition(symbol, price){
  const position= positions.find(p => p.symbol===symbol);
  if(position){
    logger.info(`[${symbol}] Buy signal ignored, position already open`);
  }else{
    await cancelOrders(symbol);
    await buyLimit(symbol, calculateEntryLimitPrice(symbol, price), calculateOrderQty(symbol, price));
  }
}
async function closeLongPosition(symbol, price){
  const position= positions.find(p => p.symbol===symbol);
  if(position){
    await cancelOrders(symbol);
    await sellLimit(symbol, calculateExitLimitPrice(symbol, price), position.qty);
  }else{
    logger.info(`[${symbol}] Sell signal ignored, no open position`);
  }
}
async function openTpSlOrders(position){
  const orders= await getOpenOrders(position.symbol);
  if(orders.length===0 || orders.find(order => order.side==='sell')===undefined){
    const [tpOffset, slOffset]= getTakeProfitStopLossOffsets(position.symbol);
    if(tpOffset!==0 && slOffset!==0){
      logger.info(`[${position.symbol}] TP/SL offsets are ${tpOffset}%/${slOffset}%`);
      const buyPrice= Number(position.avg_entry_price);
      const limitPrice= Number(buyPrice*(1+tpOffset/100)).toFixed(2);
      const stopPrice= Number(buyPrice*(1-tpOffset/100)).toFixed(2);
      await sellOco(position.symbol, limitPrice, stopPrice, position.qty);
    }
  }
}
async function buyLimit(symbol, price, qty){
  const orderParams= {
    symbol,
    client_order_id: generateClientOrderId(symbol),
    qty,
    side: 'buy',
    type: 'limit',
    time_in_force: 'day',
    limit_price: price,
    extended_hours: true
  };
  logger.info(`[${symbol}] Buying ${qty} shares @${price}`);
  return await alpaca.createOrder(orderParams);

}
async function sellLimit(symbol, price, qty){
  const orderParams= {
    symbol,
    client_order_id: generateClientOrderId(symbol),
    qty,
    side: 'sell',
    type: 'limit',
    time_in_force: 'day',
    limit_price: price,
    extended_hours: true
  };
  logger.info(`[${symbol}] Selling ${qty} shares @${price}`);
  return await alpaca.createOrder(orderParams);
}
async function sellOco(symbol, limitPrice, stopPrice, qty){
  const orderParams= {
    symbol,
    client_order_id: generateClientOrderId(symbol),
    qty,
    side: 'sell',
    type: 'limit',
    time_in_force: 'gtc',
    order_class: "oco",
    take_profit: {
      limit_price: limitPrice
    },
    stop_loss: {
      stop_price: stopPrice
    }
  };
  logger.info(`[${symbol}] Selling ${qty} shares when price > @${limitPrice} or < @${stopPrice}`);
  return await alpaca.createOrder(orderParams);
}
function getTakeProfitStopLossOffsets(symbol){
  const tpSl= [config.defaults.takeProfit, config.defaults.stopLoss];
  const customTpSl= [config.portfolio[symbol].takeProfit, config.portfolio[symbol].stopLoss]
  if(customTpSl[0]!==undefined){
    tpSl[0]= customTpSl[0];
  }
  if(customTpSl[1]!==undefined){
    tpSl[1]= customTpSl[1];
  }
  if(tpSl[0]===0 && tpSl[1]!==0){
    tpSl[0]= 100;
  }
  if(tpSl[0]!==0 && tpSl[1]===0){
    tpSl[1]= 100;
  }
  return tpSl;
}
function generateClientOrderId(symbol){
  return `${symbol}_FF_${Date.now()}`;
}
async function cancelOrders(symbol){
  const orders= await getOpenOrders(symbol);
  if(orders.length===1){
    const order= orders[0];
    logger.info(`[${symbol}] Canceling open ${order.side} order`);
    await alpaca.cancelOrder(order.id);
  }else if(orders.length>1){
    logger.crit(`[${symbol}] Found ${orders.length} open orders !!`);
  }
}
async function getOpenOrders(symbol){
  return await alpaca.getOrders({status: 'open', symbols: symbol, until: new Date(), limit: 30});
}
function calculateOrderQty(symbol, price){
  const allocation= portfolio[symbol].allocation;
  const capital= getCapital();
  return Math.round((capital*allocation/100)/price);
}
function actionRequiresPrice(action){
  return ['buy-limit', 'sell-limit'].includes(action);
}
function roundPrice(price){
  return Number(price).toFixed(2);
}
function calculateEntryLimitPrice(symbol, price){
  let entryOffset= config.defaults.entryOffset;
  if(config.portfolio[symbol].entryOffset){
    entryOffset= config.portfolio[symbol].entryOffset;
  }
  return roundPrice(price*(1-entryOffset/100));
}
function calculateExitLimitPrice(symbol, price){
  let exitOffset= config.defaults.exitOffset;
  if(config.portfolio[symbol].exitOffset){
    exitOffset= config.portfolio[symbol].exitOffset;
  }
  return roundPrice(price*(1+exitOffset/100));
}
function logFailedPromises(results, symbols){
  results
      .filter(result => result.status!=='fulfilled')
      .forEach((result,index) =>
          logger.error(`[${symbols[index]}] ${result.reason.message}`)
      );
}

async function processSignal(signal){
  const {symbols, action, prices}= signal;
  await loadAccount();
  await loadPositions();
  const validSymbols= [];
  let validSymbolPrices= [];
  for(let i= 0; i<symbols.length; i++){
    const symbol= symbols[i];
    if(!config.portfolio[symbol]){
      logger.info(`[${symbol}] Signal ignored, unknown symbol`);
    }else{
      if(config.portfolio[symbol].active===false){
        logger.info(`[${symbol}] Signal ignored, symbol is inactive`);
      }else{
        validSymbols.push(symbol);
        if(config.priceSource==='signal'){
          validSymbolPrices.push(prices[i]);
        }else if(config.priceSource==='twelveData'){
          try{
            const price= await getLastPriceFromTwelveData(symbol);
            validSymbolPrices.push(price);
          }catch (e) {
            validSymbols.pop();
            logger.error(`[${symbol} Failed to get last price : ${e}]`);
          }
        }
      }
    }
  }
  if(config.priceSource==='alpaca'){
    const trades= await alpaca.getLatestTrades(validSymbols);
    validSymbols.forEach(symbol => validSymbolPrices.push(trades.get(symbol).Price));
  }
  switch (action) {
    case 'buy-limit':
      logFailedPromises(await Promise.allSettled(validSymbols.map(((symbol,index) => openLongPosition(symbol, validSymbolPrices[index])))), validSymbols);
      break;
    case 'sell-limit':
      logFailedPromises(await Promise.allSettled(validSymbols.map(((symbol,index) => closeLongPosition(symbol, validSymbolPrices[index])))), validSymbols);
      break;
  }
}

Cron(config.protectPositionsCronExpression, async () => {
  await loadAccount();
  await loadPositions();
  await protectPositions();
});

app.listen(port, async () => {
  logger.info(`Listening on port ${port}`)
  await loadAccount();
  await loadPositions();
});
