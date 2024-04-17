**!!!! IMPORTANT NOTE !!!! THIS IS WORK IN PROGRESS AND NOT TESTED YET !! DO NOT USE IN PRODUCTION!!**

This is a stock trading bot that receives signals from TradingView and executes
orders using alpaca javascript library. ETFs are also supported.

## Usage

```
git clone https://github.com/amahouachi/stock-alpaca-tradingview-bot
cd stock-alpaca-tradingview-bot
cp config.sample.json config.json
vi config.json
//define your api keys, portfolio allocation and other options
//:x!
node index.js
```

## How it works

The idea is to let TradingView do the heavy lifting technical analysis and
whatever calculations are needed, generate buy/sell signals and send them using alert
webhooks to this bot. The bot then decides to execute buy/sell orders based
on current positions and configuration.

So let's start with TradingView side, then we will go to the bot's side.

## One Signal, multiple symbols

If your strategy works well on several symbols with the same parameters, 
then you can provide all the relevent symbols in the signal, the "main" symbol
on which the strategy is running, and "related" symbols.
You need to provide the limit price for each included symbol. 
Current price data of the "main" symbol is available in variables like
`close`, `high` etc.
You can use `request.security()` function to get the price data for "related" symbols.

For example, if your strategy works on 10 symbols, you can setup one alert
and include the 10 symbols inside the signal instead of setting up 10 alerts
with one symbol per signal.

However, your signal must be independent from the "main" symbol order execution.
Otherwise, your strategy will produce inconsistent signals which are correct
for the "main" symbol but might be wrong for other symbols.

For example, the condition `if strategy.position_avg_size>0` is only relevent
for the "main" symbol on which the strategy is executed, not for "related" symbols. 
So don't condition order execution with this.

Of course, if your strategy signals depend on order executions of the "main"
symbol, or if parameters are different between symbols, you can provide
an array with a single symbol and setup one alert per symbol.

## Signal format

Two signal types are supported : buy limit and sell limit.

Take profit and stop loss will be managed by the bot based on its configuration.

```
{
  "action": "buy-limit" | "sell-limit",
  "symbols": [symbol1, symbol2, symbol3, ...],
  "prices": [symbol1_close, symbol2_close, symbol3_close, ...]
}
```

## Example signals
### Buy Limit
```
{
  "action": "buy-limit",
  "symbols": ["NVDA", "AAPL", "AMZN"],
  "prices": [800.05, 160.33, 135.87]
}
```

### Sell Limit
```
{
  "action": "sell-limit",
  "symbols": ["NVDA", "AAPL", "AMZN"],
  "prices": [800.05, 160.33, 135.87]
}
```

## Example pine script to generate signals
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
via webhook. Once a signal is received, the bot loads account and position information
from Alpaca server and determines for each symbol if an order needs to be executed.

If a buy signal is received but there is already an open position for a symbol,
the signal is simply ignored for that symbol.
If a sell signal is received but there is no open position for a symbol, the signal
is simply ignored for that symbol.

The bot then calculates the limit price, based on the price provided 
by the "price source"
and the `entryOffset` or `exitOffset` defined in the configuration.
The "price source" is defined in the configuration setting `priceSource` and
can be :
* `signal` : the bot will retrieve current prices from the signal.
* `alpaca` : the bot will retrieve current prices using alpaca api. Make
sure to have a paid subscription otherwise retrieved prices may not be the
current ones.
* `twelveData` : the bot will retrieve current prices using twelveData api. With their free tier,
you can get the last prices if in regular trading hours. But you are limited to
x number of requests per minute and y number of requests per day. Read their documentation
for more details.


If this is a buy order, it also calculates the quantity to buy based on the
account's capital and the `allocation` defined for the given symbol in configuration.
If it is a sell order, the quantity to sell is retrieved from the position.

The capital of an account at a given time is the value of cash + the buying cost
of each open position.

## TakeProfit and StopLoss

TakeProfit and StopLoss orders are completely managed in the bot. They are not
created at the same time when creating buy orders. Instead, a setting in the
configuration `protectPositionsCronExpression` sets the time at which the bot
will, for each open position, and if not already done, create an OCO order to
take profit or stop loss.

You define the default percentages of profit and loss for all symbols 
in the `defaults` section. Every symbol will use these settings unless
you override them in the symbol's setting. See example below.

If takeProfit and stopLoss are set to zero, no order will be created.

If takeProfit is not zero then stopLoss must not be zero. And vice versa.
Meaning, either you set them to zero/zero or non-zero/non-zero.

## Example Configuration

```
{
  "port": 80, // Must be 80 for TradingView alert webhook
  "endpoint": "/my-custom-webhook-endpoint", // the webhook endpoint
  "protectPositionsCronExpression": "*/5 * * * *", // time for tp/sl order creation
  "priceSource": "alpaca", // signal or alpaca or twelveData
  "account": {
    "alpaca": {
      "paper": true,
      "keyId": "api key",
      "secretKey": "secret key"
    },
    "twelveData": {
      "baseUrl": "https://api.twelvedata.com",
      "apiKey": "api key",
      "prepost": false // get price during extended trading hours. only if you have a paid subscription
    }
  },
  "defaults": {
    "entryOffset": 0.1, // By default, buy limit price is price-0.1%
    "exitOffset": 0.1,  // By default, sell limit price is price+0.1%
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

