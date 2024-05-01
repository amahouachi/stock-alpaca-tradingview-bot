import { server } from "./lib/server";
import { alpaca } from "./lib/alpaca";
import config from '../config.json';
import { logger } from "./lib/logger";
import { orderManager } from "./lib/order_manager";
import { Util } from "./lib/util";
import { Account, OrderSide, OrderSides, OrderType, OrderTypes, Position, Signal } from "./lib/model";
import Cron from "croner";


async function processSignal(signal: Signal){
  const {symbols, side, type}= signal;
  let prices= signal.prices;
  if(!prices){
    prices= symbols.map(_=>0);
  }
  let account: Account;
  let positions: Position[]= [];
  try{
    account = await alpaca.getAccount();
    positions = await alpaca.getPositions();
  }catch(e){
    logger.error(`Error loading account and positions : ${e}`);
    return;
  }
  let capital= account.cash;
  positions
    //.filter(position => config.portfolio[position.symbol])
    .forEach(position => capital += position.cost);
  const tradableSymbols: string[]= [];
  let tradableSymbolPrices: number[]= [];
  for(let i= 0; i<symbols.length; i++){
    const symbol= symbols[i];
    const position= positions.find(p => p.symbol===symbol);
    const [shouldIgnoreSignal, shouldIgnoreReason]= Util.shouldIgnoreSignal(side, position, config.portfolio[symbol]);
    if(shouldIgnoreSignal){
      logger.info(`[${symbol}] ${shouldIgnoreReason as string}`);
      continue;
    }
    tradableSymbols.push(symbol);
    tradableSymbolPrices.push(prices[i]);
  }
  const results = await Util.executePromises(tradableSymbols.map(
    async (symbol, index) => {
      await orderManager.cancelOrders(symbol);
      let order;
      if (side === OrderSides.BUY) {
        order = orderManager.generateBuyOrder(type, symbol, tradableSymbolPrices[index], capital);
      } else {
        const position = positions.find(position => position.symbol === symbol) as Position;
        order = orderManager.generateSellOrder(type, symbol, tradableSymbolPrices[index], position.qty);
      }
      if (order) {
        await orderManager.executeOrder(order);
      }
    }
  ));
  results
    .filter(result => result.status !== 'fulfilled')
    .forEach((result, index) => {
      const failedResult = result as PromiseRejectedResult;
      logger.error(`[${tradableSymbols[index]}] ${failedResult.reason.message}`);
    });
}
async function protectPositions(){
  const positions= (await alpaca.getPositions()).filter(p => config.portfolio[p.symbol]);
  for(const position of positions){
    const orders= await alpaca.getOpenOrders(position.symbol);
    if(orders.length===0 || orders.find(order => order.side==='sell')===undefined){
      const order = orderManager.generateSellOrder(OrderTypes.OCO, position.symbol, position.entryPrice, position.qty);
      if (order) {
        await orderManager.executeOrder(order);
      }
    }
  }
}
async function openTpSlOrders(position){
}

async function start(){
  await server.start(config.port);
  alpaca.configure(config.account);
  orderManager.configure(config.portfolio, config.defaults);
  Cron(config.tpSlCron, async () => {
    await protectPositions();
  });
  server.addWebhook(config.endpoint, (req, res) => {
    const signal= req.body;
    res.send('');
    res.end();
    logger.info(`Received signal : ${JSON.stringify(signal)}`);
    const [isValidSignal, signalError]= Util.isValidSignal(signal);
    if(isValidSignal){
      processSignal(signal);
    }else{
      logger.error(`Invalid signal. ${signalError}`);
    }
  });
}


start();