import { alpaca } from './alpaca';
import { logger } from './logger';
import { BuyLimitOrder, BuyMarketOrder, BuyStopLimitOrder, BuyStopOrder, 
  Order, SellLimitOrder, SellMarketOrder, SellOCOOrder, SellStopLimitOrder, SellStopOrder } from './order';
import { OrderSettings, OrderType, Portfolio } from './model';


const DEFAULT_PORTFOLIO= {};
const DEFAULT_ORDER_SETTINGS= {
  allocation: 0,
  entryLimitOffset: 0,
  exitLimitOffset: 0,
  entryStopOffset: 0,
  exitStopOffset: 0,
  entryStopLimitOffset: 0,
  exitStopLimitOffset: 0,
  takeProfit: 0,
  stopLoss: 0
}

class OrderManager{
  constructor(private portfolio: Portfolio, private defaults: OrderSettings){
  }
  private calculateOrderQty(symbol: string, price: number, capital: number){
    const allocation= this.portfolio[symbol].allocation||this.defaults.allocation;
    return Math.round((capital*allocation/100)/price);
  }
  private generateClientOrderId(symbol: string){
    return `${symbol}_FF_${Date.now()}`;
  }
  private roundPrice(price: number){
    return Number(Number(price).toFixed(2));
  }
  private calculateEntryLimitPrice(symbol:string, currentPrice:number){
    const entryOffset= this.portfolio[symbol].entryLimitOffset||this.defaults.entryLimitOffset;
    return this.roundPrice(currentPrice*(1-entryOffset/100));
  }
  private calculateExitLimitPrice(symbol: string, currentPrice: number){
    const exitOffset= this.portfolio[symbol].exitLimitOffset||this.defaults.exitLimitOffset;
    return this.roundPrice(currentPrice*(1+exitOffset/100));
  }
  private calculateEntryStopPrice(symbol:string, currentPrice:number){
    const entryOffset= this.portfolio[symbol].entryStopOffset||this.defaults.entryStopOffset;
    return this.roundPrice(currentPrice*(1+entryOffset/100));
  }
  private calculateExitStopPrice(symbol: string, currentPrice: number){
    const exitOffset= this.portfolio[symbol].exitStopOffset||this.defaults.exitStopOffset;
    return this.roundPrice(currentPrice*(1-exitOffset/100));
  }
  private calculateEntryStopLimitPrice(symbol:string, stopPrice:number){
    const entryOffset= this.portfolio[symbol].entryStopLimitOffset||this.defaults.entryStopLimitOffset;
    return this.roundPrice(stopPrice*(1-entryOffset/100));
  }
  private calculateExitStopLimitPrice(symbol: string, stopPrice: number){
    const exitOffset= this.portfolio[symbol].exitStopLimitOffset||this.defaults.exitStopLimitOffset;
    return this.roundPrice(stopPrice*(1+exitOffset/100));
  }
  private calculateTakeProfitPrice(symbol:string, entryPrice:number){
    const takeProfitOffset= this.portfolio[symbol].takeProfit||this.defaults.takeProfit||0;
    if(takeProfitOffset===0){
      return 0;
    }
    return this.roundPrice(entryPrice*(1+takeProfitOffset/100));
  }
  private calculateStopLossPrice(symbol: string, currentPrice: number){
    const stopLossOffset= this.portfolio[symbol].stopLoss||this.defaults.stopLoss||0;
    if(stopLossOffset===0){
      return 0;
    }
    return this.roundPrice(currentPrice*(1-stopLossOffset/100));
  }
  configure(portfolio: Portfolio, defaults: OrderSettings){
    this.portfolio= portfolio;
    this.defaults= defaults;
  }
  generateBuyOrder(type: OrderType, symbol: string, price: number, capital: number): Order|undefined {
    let limitPrice=0, stopPrice=0, stopLimitPrice= 0;
    switch(type){
      case 'market':
        return new BuyMarketOrder(symbol, this.calculateOrderQty(symbol, price, capital));
      case 'limit':
        limitPrice= this.calculateEntryLimitPrice(symbol, price);
        return new BuyLimitOrder(symbol, this.calculateOrderQty(symbol, limitPrice, capital), limitPrice);
      case 'stop':
        stopPrice= this.calculateEntryStopPrice(symbol, price);
        return new BuyStopOrder(symbol, this.calculateOrderQty(symbol, stopPrice, capital), stopPrice);
      case 'stop_limit':
        stopPrice= this.calculateEntryStopPrice(symbol, price);
        stopLimitPrice= this.calculateEntryStopLimitPrice(symbol, stopPrice);
        return new BuyStopLimitOrder(symbol, this.calculateOrderQty(symbol, stopLimitPrice, capital), stopLimitPrice, stopPrice);
    }
  }
  generateSellOrder(type: OrderType, symbol: string, price: number, qty: number): Order|undefined {
    let limitPrice=0, stopPrice=0, stopLimitPrice= 0;
    switch(type){
      case 'market':
        return new SellMarketOrder(symbol, qty);
      case 'limit':
        limitPrice= this.calculateExitLimitPrice(symbol, price);
        return new SellLimitOrder(symbol, qty, limitPrice);
      case 'stop':
        stopPrice= this.calculateExitStopPrice(symbol, price);
        return new SellStopOrder(symbol, qty, stopPrice);
      case 'stop_limit':
        stopPrice= this.calculateExitStopPrice(symbol, price);
        stopLimitPrice= this.calculateExitStopLimitPrice(symbol, stopPrice);
        return new SellStopLimitOrder(symbol, qty, stopLimitPrice, stopPrice);
      case 'oco':
        const takeProfitPrice= this.calculateTakeProfitPrice(symbol, price);
        const stopLossPrice= this.calculateStopLossPrice(symbol, price);
        if(takeProfitPrice>0 && stopLossPrice===0){
          return new SellLimitOrder(symbol, qty, takeProfitPrice);
        }else if(takeProfitPrice===0){
          return new SellStopOrder(symbol, qty, stopLossPrice);
        }else{
          return new SellOCOOrder(symbol, qty, takeProfitPrice, stopLossPrice);
        }
    }
  }
  async cancelOrders(symbol: string){
    const orders= await alpaca.getOpenOrders(symbol);
    if(orders.length===1){
      const order= orders[0];
      logger.info(`[${symbol}] Canceling open ${order.side} order`);
      await alpaca.cancelOrder(order.id);
    }else if(orders.length>1){
      logger.crit(`[${symbol}] Found ${orders.length} open orders !!`);
    }
  }
  async executeOrder(order:Order){
    const client_order_id= this.generateClientOrderId(order.symbol);
    return await alpaca.createOrder({...order.toAlpacaOrder(), client_order_id});
  }
}

export const orderManager= new OrderManager(DEFAULT_PORTFOLIO, DEFAULT_ORDER_SETTINGS);
