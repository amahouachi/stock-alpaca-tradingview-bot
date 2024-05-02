import { orderManager } from "../order_manager";
import { OrderSettings, OrderTypes, AlpacaOrder } from '../model';
import {expect, test, describe} from '@jest/globals';
import { BuyLimitOrder, BuyMarketOrder, BuyStopLimitOrder, BuyStopOrder, SellLimitOrder, SellMarketOrder, SellStopLimitOrder, SellStopOrder, SellOCOOrder } from '../order';

const DEFAULT_ORDER_SETTINGS: OrderSettings= {
  "allocation": 10,
  "entryLimitOffset": 0.1,
  "exitLimitOffset": 0.1,
  "entryStopOffset": 0.1,
  "exitStopOffset": 0.1,
  "entryStopLimitOffset": 0.1,
  "exitStopLimitOffset": 0.1,
  "takeProfit": 10,
  "stopLoss": 5
}
describe('testCalculateOrderQty', () => {
  test('Default allocation', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateOrderQty']('AAPL', 100, 100000)).toEqual(100);
  });
  test('Override allocation', () => {
    orderManager.configure({'AAPL': {allocation: 50}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateOrderQty']('AAPL', 100, 100000)).toEqual(500);
  });
});
describe('testRoundPrice', () => {
  test('With integer', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['roundPrice'](150)).toEqual(150);
  });
  test('With float', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['roundPrice'](150.0921)).toEqual(150.09);
  });
});

describe('test calculate entry/exit limit order price', () => {
  test('entry limit with default offset', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryLimitPrice']('AAPL',100)).toEqual(99.9);
  });
  test('entry limit with custom offset', () => {
    orderManager.configure({'AAPL': {entryLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryLimitPrice']('AAPL',100)).toEqual(99);
  });
  test('entry limit with custom negative offset', () => {
    orderManager.configure({'AAPL': {entryLimitOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryLimitPrice']('AAPL',100)).toEqual(101);
  });
  test('exit limit with default offset', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitLimitPrice']('AAPL',100)).toEqual(100.1);
  });
  test('exit limit with custom offset', () => {
    orderManager.configure({'AAPL': {exitLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitLimitPrice']('AAPL',100)).toEqual(101);
  });
  test('exit limit with custom negative offset', () => {
    orderManager.configure({'AAPL': {exitLimitOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitLimitPrice']('AAPL',100)).toEqual(99);
  });
});

describe('test calculate entry/exit stop order price', () => {
  const symbol= 'AAPL';
  test('entry stop with default offset', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopPrice']('AAPL',100)).toEqual(100.1);
  });
  test('entry stop with custom offset', () => {
    orderManager.configure({'NVDA': {entryStopOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopPrice']('NVDA',100)).toEqual(101);
  });
  test('entry stop with custom negative offset', () => {
    orderManager.configure({'XYZ': {entryStopOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopPrice']('XYZ',100)).toEqual(99);
  });
  test('exit stop with default offset', () => {
    orderManager.configure({'QQQ': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopPrice']('QQQ',100)).toEqual(99.9);
  });
  test('exit stop with custom offset', () => {
    orderManager.configure({'AMZN': {exitStopOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopPrice']('AMZN',100)).toEqual(99);
  });
  test('exit stop with custom negative offset', () => {
    orderManager.configure({'META': {exitStopOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopPrice']('META',100)).toEqual(101);
  });
});

describe('test calculate entry/exit stop limit order price', () => {
  test('entry stop limit with default offset', () => {
    orderManager.configure({'AAPL': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopLimitPrice']('AAPL',100)).toEqual(99.9);
  });
  test('entry stop limit with custom offset', () => {
    orderManager.configure({'AMZN': {entryStopLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopLimitPrice']('AMZN',100)).toEqual(99);
  });
  test('entry stop limit with custom negative offset', () => {
    orderManager.configure({'GOOG': {entryStopLimitOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateEntryStopLimitPrice']('GOOG',100)).toEqual(101);
  });
  test('exit stop limit with default offset', () => {
    orderManager.configure({'AMD': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopLimitPrice']('AMD',100)).toEqual(100.1);
  });
  test('exit stop limit with custom offset', () => {
    orderManager.configure({'NFLX': {exitStopLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopLimitPrice']('NFLX',100)).toEqual(101);
  });
  test('exit stop limit with custom negative offset', () => {
    orderManager.configure({'GOOG': {exitStopLimitOffset: -1}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateExitStopLimitPrice']('GOOG',100)).toEqual(99);
  });
});

describe('test calculate takeprofit/stoploss oco order price', () => {
  test('default offsets', () => {
    orderManager.configure({'AMZN': {}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateTakeProfitPrice']('AMZN',100)).toEqual(110);
    expect(orderManager['calculateStopLossPrice']('AMZN',100)).toEqual(95);
  });
  test('custom offsets', () => {
    orderManager.configure({'AAPL': {takeProfit: 20, stopLoss: 10}}, DEFAULT_ORDER_SETTINGS);
    expect(orderManager['calculateTakeProfitPrice']('AAPL',100)).toEqual(120);
    expect(orderManager['calculateStopLossPrice']('AAPL',100)).toEqual(90);
  });
});
describe('generate buy order', () => {
  const capital= 150000;
  const symbol= 'AAPL';
  const price= 150;
  test('order with invalid type', () => {
    orderManager.configure({[symbol]: {}}, DEFAULT_ORDER_SETTINGS);
    //@ts-ignore
    let order= orderManager.generateBuyOrder('xyz', symbol, price, capital);
    expect(order).toBeUndefined();
  });
  test('market order', () => {
    orderManager.configure({[symbol]: {}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateBuyOrder(OrderTypes.MARKET, symbol, price, capital);
    order= order as BuyMarketOrder;
    expect(order).toBeInstanceOf(BuyMarketOrder);
    expect(order.qty).toEqual(100);
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("100");
    expect(alpacaOrder.limit_price).toBeUndefined();
    expect(alpacaOrder.stop_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('buy');
  });
  test('limit order', () => {
    orderManager.configure({[symbol]: {entryLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateBuyOrder(OrderTypes.LIMIT, symbol, price, capital);
    expect(order).toBeInstanceOf(BuyLimitOrder);
    order= order as BuyLimitOrder;
    expect(order.limitPrice).toEqual(price-1.5);
    expect(order.qty).toEqual(orderManager['calculateOrderQty'](symbol, order.limitPrice, capital));
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual(`${order.qty}`);
    expect(alpacaOrder.limit_price).toEqual(`${order.limitPrice}`);
    expect(alpacaOrder.stop_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('buy');
  });
  test('stop order', () => {
    orderManager.configure({[symbol]: {entryStopOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateBuyOrder(OrderTypes.STOP, symbol, price, capital);
    expect(order).toBeInstanceOf(BuyStopOrder);
    order= order as BuyStopOrder;
    expect(order.stopPrice).toEqual(price+1.5);
    expect(order.qty).toEqual(orderManager['calculateOrderQty'](symbol, order.stopPrice, capital));
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual(`${order.qty}`);
    expect(alpacaOrder.stop_price).toEqual(`${order.stopPrice}`);
    expect(alpacaOrder.limit_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('buy');
  });
  test('stop limit order', () => {
    orderManager.configure({[symbol]: {entryStopOffset: 2, entryStopLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateBuyOrder(OrderTypes.STOP_LIMIT, symbol, price, capital);
    expect(order).toBeInstanceOf(BuyStopLimitOrder);
    order= order as BuyStopLimitOrder;
    expect(order.stopPrice).toEqual(price*(1+2/100));
    expect(order.limitPrice).toEqual(orderManager['roundPrice'](order.stopPrice*(1-0.01)));
    expect(order.qty).toEqual(orderManager['calculateOrderQty'](symbol, order.limitPrice, capital));
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual(`${order.qty}`);
    expect(alpacaOrder.stop_price).toEqual(`${order.stopPrice}`);
    expect(alpacaOrder.limit_price).toEqual(`${order.limitPrice}`);
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('buy');
  });
});

describe('generate sell order', () => {
  const price= 150;
  const symbol= 'AAPL';
  test('order with invalid type', () => {
    orderManager.configure({[symbol]: {}}, DEFAULT_ORDER_SETTINGS);
    //@ts-ignore
    let order= orderManager.generateSellOrder('xyz', symbol, price, 10);
    expect(order).toBeUndefined();
  });
  test('market order', () => {
    orderManager.configure({[symbol]: {}}, DEFAULT_ORDER_SETTINGS);
    const order= orderManager.generateSellOrder(OrderTypes.MARKET, symbol, price, 10) as SellMarketOrder;
    expect(order).toBeInstanceOf(SellMarketOrder);
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("10");
    expect(alpacaOrder.limit_price).toBeUndefined();
    expect(alpacaOrder.stop_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('sell');
  });
  test('limit order', () => {
    orderManager.configure({[symbol]: {exitLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateSellOrder(OrderTypes.LIMIT, symbol, price, 10);
    expect(order).toBeInstanceOf(SellLimitOrder);
    order= order as SellLimitOrder;
    expect(order.limitPrice).toEqual(price+1.5);
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("10");
    expect(alpacaOrder.limit_price).toEqual(`${order.limitPrice}`);
    expect(alpacaOrder.stop_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('sell');
  });
  test('stop order', () => {
    orderManager.configure({[symbol]: {exitStopOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateSellOrder(OrderTypes.STOP, symbol, price, 10);
    expect(order).toBeInstanceOf(SellStopOrder);
    order= order as SellStopOrder;
    expect(order.stopPrice).toEqual(price-1.5);
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("10");
    expect(alpacaOrder.stop_price).toEqual(`${order.stopPrice}`);
    expect(alpacaOrder.limit_price).toBeUndefined();
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('sell');
  });
  test('stop limit order', () => {
    orderManager.configure({[symbol]: {exitStopOffset: 2, exitStopLimitOffset: 1}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateSellOrder(OrderTypes.STOP_LIMIT, symbol, price, 10);
    expect(order).toBeInstanceOf(SellStopLimitOrder);
    order= order as SellStopLimitOrder;
    expect(order.stopPrice).toEqual(price*(1-2/100));
    expect(order.limitPrice).toEqual(orderManager['roundPrice'](order.stopPrice*(1+0.01)));
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("10");
    expect(alpacaOrder.stop_price).toEqual(`${order.stopPrice}`);
    expect(alpacaOrder.limit_price).toEqual(`${order.limitPrice}`)
    expect(alpacaOrder.stop_loss).toBeUndefined();
    expect(alpacaOrder.take_profit).toBeUndefined();
    expect(alpacaOrder.side).toEqual('sell');
  });
  test('oco order', () => {
    orderManager.configure({[symbol]: {takeProfit: 20, stopLoss: 10}}, DEFAULT_ORDER_SETTINGS);
    let order= orderManager.generateSellOrder(OrderTypes.OCO, symbol, price, 10);
    expect(order).toBeInstanceOf(SellOCOOrder);
    order= order as SellOCOOrder;
    expect(order.stopPrice).toEqual(price*(1-10/100));
    expect(order.limitPrice).toEqual(price*(1+20/100));
    const alpacaOrder= order.toAlpacaOrder();
    expect(alpacaOrder.symbol).toEqual(symbol);
    expect(alpacaOrder.qty).toEqual("10");
    expect(alpacaOrder.stop_loss?.stop_price).toEqual(`${order.stopPrice}`);
    expect(alpacaOrder.take_profit?.limit_price).toEqual(`${order.limitPrice}`);
    expect(alpacaOrder.side).toEqual('sell');
    expect(alpacaOrder.order_class).toEqual('oco');
  });
});