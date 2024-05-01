import { OrderSide, OrderSides, OrderTypes, Position } from "./model";

export const Util= {
  executePromises: async (promises: Promise<any>[]) => {
    return await Promise.allSettled(promises);
  },
  isValidSignal: (signal: any) : [boolean, string?] => {
    for (const field of ['side', 'type', 'symbols']) {
      if (!signal[field]) {
        return [false, `Missing parameter : ${field}`];
      }
    }
    const { side, type, symbols, prices } = signal;
    if (side !== OrderSides.BUY && side !== OrderSides.SELL) {
      return [false, `Invalid value for side : ${side}`];
    }
    if (!(Object.keys(OrderTypes).map(t => OrderTypes[t]).includes(type))) {
      return [false, `Invalid value for type : ${type}`];
    }
    if (type !== OrderTypes.MARKET && !prices) {
      return [false, 'Missing parameter : prices'];
    }
    if (prices && symbols.length !== prices.length) {
      return [false, 'Arrays must have the same length : symbols and prices'];
    }
    return [true];
  },
  shouldIgnoreSignal: (side: OrderSide, position: Position | undefined, symbolConfig: any) : [boolean, string?] => {
    if (!symbolConfig) {
      return [true, `Signal ignored, unknown symbol`];
    }
    if (symbolConfig.active === false) {
      return [true, `Signal ignored, symbol is not active`];
    }
    if (side === 'buy' && position) {
      return [true, `Buy signal ignored, position already open`];
    }
    if (side === 'sell' && !position) {
      return [true, `Sell signal ignored, no open position`];
    }
    return [false];
  }
}