
export type OrderSide= 'buy'|'sell';
export type OrderType= 'market'|'limit'|'stop'|'stop_limit'|'oco';
export const OrderSides= {BUY: <OrderSide>'buy', SELL: <OrderSide>'sell'};
export const OrderTypes= {MARKET: <OrderType>'market', LIMIT: <OrderType>'limit', STOP: <OrderType>'stop', STOP_LIMIT: <OrderType>'stop_limit', OCO: <OrderType>'oco'};

export type Signal= {
  side: OrderSide
  type: OrderType
  symbols: string[]
  prices?: number[]
}
export type AlpacaOrder= {
  symbol: string,
  side: OrderSide
  type: OrderType
  qty: string
  limit_price?: string
  stop_price?: string
  client_order_id?: string
  time_in_force: 'gtc'|'day',
  extended_hours?: boolean
  order_class?: 'simple'|'oco'|'bracket'
  take_profit?: {
    limit_price: string
  }
  stop_loss?: {
    stop_price: string
  }
}

export type OrderSettings= {
  allocation: number;
  entryLimitOffset: number;
  exitLimitOffset: number;
  entryStopOffset: number;
  exitStopOffset: number;
  entryStopLimitOffset: number;
  exitStopLimitOffset: number;
  takeProfit: number;
  stopLoss: number;
}

export type OrderSettingsOverrides= {
  allocation?: number;
  entryLimitOffset?: number;
  exitLimitOffset?: number;
  entryStopOffset?: number;
  exitStopOffset?: number;
  entryStopLimitOffset?: number;
  exitStopLimitOffset?: number;
  takeProfit?: number;
  stopLoss?: number;
}

export type Portfolio= {
  [symbol: string]: OrderSettingsOverrides;
}

export type AlpacaConfig= {
  paper: boolean,
  keyId: string,
  secretKey: string
}
export type AlpacaPosition= {
  symbol: string
  side: string
  qty: string
  avg_entry_price: string
  cost_basis: string
}

export class Position{
  symbol: string;
  side: string;
  qty: number;
  entryPrice: number;
  cost: number;

  constructor(alpacaPosition: AlpacaPosition) {
    this.symbol= alpacaPosition.symbol;
    this.side= alpacaPosition.side;
    this.qty= Number(alpacaPosition.qty);
    this.entryPrice= Number(alpacaPosition.avg_entry_price);
    this.cost= Number(alpacaPosition.cost_basis);
  }
}

export class Account{
    public cash: number;

    constructor(alpacaAccount: any){
      this.cash= Number(alpacaAccount.cash);
    }
}