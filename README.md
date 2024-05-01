**!!!! IMPORTANT NOTE !!!! THIS IS WORK IN PROGRESS AND NOT TESTED YET !! DO NOT USE IN PRODUCTION!!**

This is a stock trading bot that receives signals from TradingView and executes
orders using alpaca javascript library. ETFs are also supported.

## Usage

```
> git clone https://github.com/amahouachi/stock-alpaca-tradingview-bot
> cd stock-alpaca-tradingview-bot
> tsc
> npm install
> cp config.sample.json dist/config.json
> vi dist/config.json
//define your api keys, portfolio allocation and other options
//:x!
> node dist/src/bot.js
//or if you are using pm2
> pm2 start dist/src/bot.js
```

## How it works

This is a signal execution bot. It does not technical analysis and is not 
capable of generating buy/sell signals on its own.

Signals are generated in TradingView and sent to the bot for execution.

This bot is long-only so it will not open short positions. Sell signals
will be ignored for symbols for which there are no open long position.

## Signal

A signal is a suggestion to buy or sell one or several symbols using
a specific order type.

If a strategy generates signals independently from the positions
opened/closed for the symbol on which it is applied then several
symbols can be included in one signal.


### Spec

```
{
  "side": "buy" | "sell",
  "type": "market" | "limit" | "stop" | "stop_limit",
  "symbols": [symbol1, symbol2, symbol3, ...],
  "prices": [symbol1_close, symbol2_close, symbol3_close, ...]
}
```
### Rules

* `symbols` and `prices` arrays must have the same length
* `prices` is mandatory unless `type` is `market`


### Example with one symbol
**Buy Limit**
```
{
  "side": "buy",
  "type": "limit",
  "symbols": ["NVDA"],
  "prices": [800.05]
}
```

**Sell Stop**
```
{
  "side": "sell",
  "type": "stop",
  "symbols": ["AMD"],
  "prices": [130.94]
}
```

### Example with muliple symbols
**Buy Stop-Limit**
```
{
  "side": "buy",
  "type": "stop_limit",
  "symbols": ["NVDA", "AMD", "GOOG"],
  "prices": [800.05, 160.45, 200.15]
}
```

**Sell Market**
```
{
  "side": "sell",
  "type": "market",
  "symbols": ["NVDA", "AMD", "GOOG"]
}
```

## How to get symbols prices

In pinescript, one strategy can only be executed on one symbol at a time.

You can use `request.security()` function to get the price data for other symbols.

## Example pinescript to generate signals
```
//@version=5
strategy("my-strategy",margin_long = 20)

symbols= array.from("AMD","AMZN","AAPL","NVDA")
priceAMD= request.security("NASDAQ:AMD", timeframe.period, close)
priceAMZN= request.security("NASDAQ:AMZN", timeframe.period, close)
priceAAPL= request.security("NASDAQ:AAPL", timeframe.period, close)
priceNVDA= request.security("NASDAQ:NVDA", timeframe.period, close)

//This ugly code is used because we can't use security() function in a loop
//with symbol as iterator, since this function expects simple string not series string

prices= array.from(priceAMD, priceAMZN, priceAAPL, priceNVDA)

....
//buy alert
buyCmd= '{"symbols":['
for [index, symbol] in symbols
    buyCmd:= buyCmd+'"'+symbol+'"'
    if index<array.size(symbols)-1
        buyCmd:= buyCmd + ','
buyCmd:= buyCmd + '],"action":"buy-limit", "prices": ['+prices.join(",")+']}'
if longCondition
  alert(buyCmd)

...
//same idea for sell alert

```

## Signal Execution

The bot should listen on port 80 to be able to receive signals from TradingView
via webhook. 

If you can't listen on port 80 because of root privileges, one way you can do
is (on debian):
```
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep /path/to/node
```

Other solutions exist, just google it.

Once a signal is received, the bot retrieves your account and positions information
from Alpaca server and determines for each symbol if an order needs to be executed.

If a buy signal is received but there is already an open position for a symbol,
the signal is simply ignored for that symbol.
If a sell signal is received but there is no open position for a symbol, the signal
is simply ignored for that symbol.

The bot then calculates the limit price, stop price and/or the stop-limit price, 
based on the price provided in the `prices` field in the signal and the offsets
defined in the configuration file : `entryLimitOffset`, `exitLimitOffset`,
`entryStopOffset`, `exitStopOffset`, `entryStopLimitOffset` and `exitStopLimitOffset`.

These settings must be defined in the `defaults` section, to be applied to all symbols, 
and can be overridden at the symbol level.

If this is a buy order, the bot also calculates the quantity to buy based on the
account's capital and the default `allocation` or the one defined for the given symbol if any.
If it is a sell order, the quantity to sell is retrieved from the position.

The capital of an account at a given time is the value of cash + the buying cost
of each open position.

## TakeProfit and StopLoss

TakeProfit and StopLoss orders are completely managed in the bot. They are not
created at the same time when creating buy orders. Instead, a setting in the
configuration `tpSlCron` sets the time at which the bot
will, for each open position, and if not already done, create a takeProfit and/or StopLoss orders.

You define the default percentages of profit and loss for all symbols 
in the `defaults` section. Every symbol will use these settings unless
you override them in the symbol's settings. See example below.

If both takeProfit and stopLoss are zero, no order will be created.
If takeProfit is not zero and stopLoss is zero then a `limit` order will be created.
If takeProfit is zero and stopLoss is not zero then a `stop` order will be created.
If both are non-zero, an OCO order will be created.

TakeProfit and StopLoss prices are caluclates based on the corresponding position's
entryPrice.
```
takeProfitPrice= entryPrice*(1+takeProfitOffset/100)
stopLossPrice= entryPrice*(1-takeProfitOffset/100)
```

## extended_hours and time_in_force

Alpaca has few rules related to trading in extended hours.
`time_in_force` must be set to `day` and order needs to be `limit`.

The bot will always set `extended_hours` to `true` and `time_in_force`
to `day` for all orders except for takeProfit and stopLoss orders,
their `time_in_force` will be set to `gtc`.

Note that `day` orders will expire at the end of the day if not filled. You need to 
take this into account and send again the signal the next day if you are still
interested in executing the expired signal.

## Negative offsets

Negative offsets for entry and exit are supported. You can set for example
`entryLimitOffset` to -0.1 and the limit price will be currentPrice+0.1%.

This will buy at the best asks which are less than currentPrice+0.1%.

## Example Configuration

```
{
  "port": 80, // Must be 80 for TradingView alert webhook
  "endpoint": "/my-custom-webhook-endpoint", // the webhook endpoint
  "tpSlCron": "*/5 * * * *", // time for tp/sl order creation, here every 5 minutes
  "account": {
    "paper": true,
    "keyId": "api key",
    "secretKey": "secret key"
  },
  "defaults": {
    "entryLimitOffset": 0.1, // By default, buy limit price is price-0.1%
    "exitLimitOffset": 0.1,  // By default, sell limit price is price+0.1%
    "entryStopOffset": 0.1, // By default, buy stop price is price+0.1%
    "exitStopOffset": 0.1,  // By default, sell stop price is price-0.1%
    "entryStopLimitOffset": 0.1, // This is relative to stopPrice !! By default, buy stop limit price is stopPrice-0.1%
    "exitStopLimitOffset": 0.1,  // This is relative to stopPrice !! By default, sell stop limit price is stopPrice+0.1%
    "takeProfit": 10, // By default, open a takeProfit at entryPrice+10%
    "stopLoss": 5 // By default, open a stopLoss at entryPrice-5%
  },
  "portfolio": {
    "NVDA": {"allocation": 20}, // Use 20% of capital
    "AMD": {"allocation": 20, "takeProfit": 30, "stopLoss": 25}, // AMD TP will be +30% and SL -25%
    "NFLX": {"allocation": 15, "active":  false}, // all signals are ignored for this symbol
    "TQQQ": {"allocation": 15, "takeProfit": 0, "stopLoss": 0}, // No TP/SL for TQQQ
    "AMAT": {"allocation": 10}
  }
}

```

