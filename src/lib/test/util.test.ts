
import {expect, test, describe} from '@jest/globals';
import { Util } from '../util';
import { AlpacaPosition, OrderSides, OrderTypes, Position } from '../model';
import config from '../../../config.json';

describe('test isValidSignal()', () => {
  test('Missing symbols should be rejected', () => {
    expect(Util.isValidSignal({side: OrderSides.BUY, type: OrderTypes.MARKET})[0]).toBeFalsy();
  });
  test('Missing side should be rejected', () => {
    expect(Util.isValidSignal({symbols: ['AMD'], type: OrderTypes.MARKET})[0]).toBeFalsy();
  });
  test('Missing type should be rejected', () => {
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY})[0]).toBeFalsy();
  });
  test('Invalid side should be rejected', () => {
    expect(Util.isValidSignal({symbols: ['AMD'], side: 'invalid', type: OrderTypes.MARKET})[0]).toBeFalsy();
  });
  test('Invalid type should be rejected', () => {
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: 'some-order-type'})[0]).toBeFalsy();
  });
  test('prices is mandatory for type!=market', () => {
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: OrderTypes.LIMIT})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: OrderTypes.OCO})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: OrderTypes.STOP})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: OrderTypes.STOP_LIMIT})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.SELL, type: OrderTypes.LIMIT})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.SELL, type: OrderTypes.OCO})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.SELL, type: OrderTypes.STOP})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.SELL, type: OrderTypes.STOP_LIMIT})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.BUY, type: OrderTypes.MARKET})[0]).toBeTruthy();
    expect(Util.isValidSignal({symbols: ['AMD'], side: OrderSides.SELL, type: OrderTypes.MARKET})[0]).toBeTruthy();
  });
  test('prices and symbols should be the same length', () => {
    expect(Util.isValidSignal({symbols: ['AMD','NVDA'], side: OrderSides.BUY, type: OrderTypes.LIMIT, prices: [109]})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD','NVDA'], side: OrderSides.BUY, type: OrderTypes.LIMIT, prices: [109,198,209]})[0]).toBeFalsy();
    expect(Util.isValidSignal({symbols: ['AMD','NVDA'], side: OrderSides.BUY, type: OrderTypes.LIMIT, prices: [109,198]})[0]).toBeTruthy();
  });
});

describe('test shouldIgnoreSignal()', () => {
  test('unknown symbol', () => {
    expect(Util.shouldIgnoreSignal(OrderSides.BUY, undefined, config.portfolio['xyz'])[0]).toBeTruthy();
  });
  test('inactive symbol', () => {
    expect(Util.shouldIgnoreSignal(OrderSides.BUY, undefined, {"active": false})[0]).toBeTruthy();
  });
  test('ignore buy when there is position', () => {
    //@ts-ignore
    expect(Util.shouldIgnoreSignal(OrderSides.BUY, {}, {})[0]).toBeTruthy();
  });
  test('ignore sell when there is no position', () => {
    expect(Util.shouldIgnoreSignal(OrderSides.SELL, undefined, {})[0]).toBeTruthy();
  });
  test('do not ignore otherwise', () => {
    expect(Util.shouldIgnoreSignal(OrderSides.BUY, undefined, {})[0]).toBeFalsy();
    //@ts-ignore
    expect(Util.shouldIgnoreSignal(OrderSides.SELL, {}, {})[0]).toBeFalsy();
  });
});

describe('test position from alpacaPosition', () => {
  test('', () => {
    const alpacaPosition: AlpacaPosition = { avg_entry_price: "123.4567", cost_basis: "3000.9543", qty: "1.3404", side: "buy", symbol: "AMD" };
    const position= new Position(alpacaPosition);
    expect(position.cost).toEqual(3000.9543);
    expect(position.entryPrice).toEqual(123.4567);
    expect(position.qty).toEqual(1.3404);
    expect(position.symbol).toEqual('AMD');
    expect(position.side).toEqual('buy');
  });
});