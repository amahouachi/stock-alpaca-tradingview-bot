import { AlpacaOrder, OrderSide, OrderSides, OrderType, OrderTypes } from "./model";


export abstract class Order{

  constructor(public symbol: string,
              public side: OrderSide,
              public type: OrderType,
              public qty: number,
              public limitPrice: number= 0,
              public stopPrice: number= 0
  ) {}


  toAlpacaOrder(): AlpacaOrder{
    return {
      symbol: this.symbol,qty: `${this.qty}`, side: this.side, type: this.type, time_in_force: 'day'
    };
  }
}

class MarketOrder extends Order{
  constructor(symbol: string, side: OrderSide, qty: number) {
    super(symbol, side, OrderTypes.MARKET, qty);
  }
}
export class BuyMarketOrder extends MarketOrder{
  constructor(symbol: string, qty: number) {
    super(symbol, OrderSides.BUY, qty);
  }
}
export class SellMarketOrder extends MarketOrder{
  constructor(symbol: string, qty: number) {
    super(symbol, OrderSides.SELL, qty);
  }
}
export class LimitOrder extends Order{
  constructor(symbol: string, side: OrderSide, qty: number, limitPrice: number) {
    super(symbol, side, OrderTypes.LIMIT, qty, limitPrice);
  }
  toAlpacaOrder(): AlpacaOrder {
    return {...super.toAlpacaOrder(), limit_price: `${this.limitPrice}`, extended_hours: true};
  }
}
export class BuyLimitOrder extends LimitOrder{
  constructor(symbol: string, qty: number, limitPrice: number) {
    super(symbol, OrderSides.BUY, qty, limitPrice);
  }
}
export class SellLimitOrder extends LimitOrder{
  constructor(symbol: string, qty: number, limitPrice: number) {
    super(symbol, OrderSides.SELL, qty, limitPrice);
  }
}
class StopOrder extends Order{
  constructor(symbol: string, side: OrderSide, qty: number, stopPrice: number) {
    super(symbol, side, OrderTypes.STOP, qty, 0, stopPrice);
  }
  toAlpacaOrder(): AlpacaOrder {
    return {...super.toAlpacaOrder(), stop_price: `${this.stopPrice}`};
  }
}
export class BuyStopOrder extends StopOrder{
  constructor(symbol: string, qty: number, stopPrice: number) {
    super(symbol, OrderSides.BUY, qty, stopPrice);
  }
}
export class SellStopOrder extends StopOrder{
  constructor(symbol: string, qty: number, stopPrice: number) {
    super(symbol, OrderSides.SELL, qty, stopPrice);
  }
}
class StopLimitOrder extends Order{
  constructor(symbol: string, side: OrderSide, qty: number, limitPrice: number, stopPrice: number) {
    super(symbol, side, OrderTypes.STOP_LIMIT, qty, limitPrice, stopPrice);
  }
  toAlpacaOrder(): AlpacaOrder {
    return {...super.toAlpacaOrder(), limit_price: `${this.limitPrice}`, stop_price: `${this.stopPrice}`};
  }
}
export class BuyStopLimitOrder extends StopLimitOrder{
  constructor(symbol: string, qty: number, limitPrice: number, stopPrice: number) {
    super(symbol, OrderSides.BUY, qty, limitPrice, stopPrice);
  }
}
export class SellStopLimitOrder extends StopLimitOrder{
  constructor(symbol: string, qty: number, limitPrice: number, stopPrice: number) {
    super(symbol, OrderSides.SELL, qty, limitPrice, stopPrice);
  }
}
export class SellOCOOrder extends Order{
  constructor(symbol: string, qty: number, limitPrice: number, stopPrice: number) {
    super(symbol, OrderSides.SELL, OrderTypes.OCO, qty, limitPrice, stopPrice);
  }
  toAlpacaOrder(): AlpacaOrder {
    return {...super.toAlpacaOrder(), type: 'limit', take_profit: {limit_price: `${this.limitPrice}`}, stop_loss: {stop_price: `${this.stopPrice}`}, time_in_force: 'gtc'};
  }
}
