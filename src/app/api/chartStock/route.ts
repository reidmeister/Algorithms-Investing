import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function POST(req: Request) {
  const { symbol, period1, period2, interval } = await req.json();
  const intervalMap: Record<string, string> = { "2mo": "1mo", "6mo": "3mo", "9mo": "3mo" };
  const queryOptions = {
    period1: period1,
    period2: period2,
    interval: intervalMap[interval] ?? interval,
  };
  // @ts-ignore
  const result = await yahooFinance.chart(symbol, queryOptions);
  const body = JSON.stringify(result);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
