**!!!! IMPORTANT NOTE !!!! THIS IS WORK IN PROGRESS AND NOT TESTED YET !! DO NOT USE IN PRODUCTION!!**

This is a stock trading bot that receives signals from TradingView and executes
orders using alpaca javascript library.

## How it works

The idea is to let TradingView do the heavy lifting technical analysis or
whatever calculations are needed, generate signals and send them via alerts, which
will be sent to this bot via a webhook and executed based on what is defined
in the configuration file.

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

For example, keep in mind that `strategy.position_avg_size>0` is only relevent
for the "main" symbol not for "related" symbols. So don't condition order
execution with this.

Of course, if your strategy signals depend on order executions of the "main"
symbol, or if parameters are different between symbols, you can provide
an array with a single symbol and setup one alert per symbol.

## Signal format

Two signals are supported : buy limit and sell limit.

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

## Example pine script
```
//@version=5
strategy("my-strategy",margin_long = 20)

symbols= array.from("AMD","AMZN","AAPL","NVDA","TQQQ","NFLX","MSFT","META","AVGO","TSLA","TMUS","AMAT")
priceAMD= request.security("NASDAQ:AMD", timeframe.period, close)
priceAMZN= request.security("NASDAQ:AMZN", timeframe.period, close)
priceAAPL= request.security("NASDAQ:AAPL", timeframe.period, close)
priceNVDA= request.security("NASDAQ:NVDA", timeframe.period, close)
priceTQQQ= request.security("NASDAQ:TQQQ", timeframe.period, close)
priceNFLX= request.security("NASDAQ:NFLX", timeframe.period, close)
priceMSFT= request.security("NASDAQ:MSFT", timeframe.period, close)
priceMETA= request.security("NASDAQ:META", timeframe.period, close)
priceAVGO= request.security("NASDAQ:AVGO", timeframe.period, close)
priceTSLA= request.security("NASDAQ:TSLA", timeframe.period, close)
priceTMUS= request.security("NASDAQ:TMUS", timeframe.period, close)
priceAMAT= request.security("NASDAQ:AMAT", timeframe.period, close)

//This ugly code is used because we can't use security() function in a loop
//with symbol as iterator, since this function expects simple string not series string

prices= array.from(priceAMD, priceAMZN, priceAAPL, priceNVDA, priceTQQQ, priceNFLX, priceMSFT, priceMETA, priceAVGO, priceTSLA, priceTMUS, priceAMAT)

....
//buy alert
buyCmd= '{"symbols":['
for [index, symbol] in symbols
    buyCmd:= buyCmd+'"'+symbol+'"'
    if index<array.size(symbols)-1
        buyCmd:= buyCmd + ','
buyCmd:= buyCmd + '],"action":"buy-limit", "prices": ['+prices.join(",")+']}'
alert(buyCmd)

...
//same idea for sell alert

```

## Bot Configuration

```
{
  "port": 80, // Bot will listen on this port. Needs to be 80 for TradingView alert webhook
  "endpoint": "/my-custom-webhook-endpoint", // the webhook endpoint
  "reloadPositionsCronExpression": "*/5 * * * *", // periodicity for account and positions reloading
  "account": {
    "paper": true,
    "keyId": "ALPACA_API_KEY",
    "secretKey": "ALPACA_SECRET_KEY"
  },
  "defaults": {
    "takeProfit": 0, // By default, apply this takeProfit percentage
    "stopLoss": 0 // By default, apply this stopLoss percentage
  },
  "portfolio": {
    "NVDA": {"allocation": 20}, // Use 20% of your (cash + long positions cost)
    "AMD": {"allocation": 20, "takeProfit": 30, "stopLoss": 25}, // Override takeProfit/stopLoss for this symbol
    "TQQQ": {"allocation": 15, "takeProfit": 30, "stopLoss": 15},
    "NFLX": {"allocation": 15, "active":  false}, // Ignore signal for this symbol for now
    "AMZN": {"allocation": 15},
    "META": {"allocation": 15},
    "AVGO": {"allocation": 15},
    "AAPL": {"allocation": 10},
    "MSFT": {"allocation": 10},
    "TSLA": {"allocation": 10},
    "TMUS": {"allocation": 10},
    "AMAT": {"allocation": 10}
  }
}

```

