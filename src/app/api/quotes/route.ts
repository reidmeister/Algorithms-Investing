import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const TICKER_SYMBOLS = [
  "SPY", "QQQ", "DIA",
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK-B",
  "JPM", "V", "UNH", "XOM", "WMT", "LLY", "MA", "JNJ", "PG",
  "AVGO", "HD", "MRK", "COST", "ORCL", "BAC", "CVX", "ABBV", "KO", "PEP",
  "GS", "MS", "AMD", "INTC", "NFLX", "DIS", "BA", "CAT", "GE",
];

export async function GET() {
  try {
    const results = await yahooFinance.quote(TICKER_SYMBOLS);
    const quotes = results.map((q: any) => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
    }));
    return Response.json(quotes);
  } catch (error) {
    return Response.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
