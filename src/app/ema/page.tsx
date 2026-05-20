"use client";
import { analyzeMovingAveragePerformance, generateMovingAverageSignals, getFormattedDates } from "@/lib/utils";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { ScannerDataTable } from "./scanner-data-table";
import { scannerColumns, EMAScanResult } from "./scanner-columns";
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useChartData } from "@/hooks/useChartData";
import { Tickers_dict } from "@/lib/data/nasdaq_100_dict";
import StockSearchForm from "@/components/stock-search-form";
import { Input } from "@/components/ui/input";
import { MA_AnalysisResult, StrategyType, StockSecuritySectorFormat } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { snp_array } from "@/lib/data/snp_500";
import FindStockFilter from "@/components/find-stock-data-table-components/find-stock-filter";

const ExponentialMovingAverage = ({}) => {
  const { formattedToday, formattedLastYear } = getFormattedDates();
  const { fetchChartData } = useChartData();
  const [period1, setPeriod1] = useState(formattedLastYear);
  const [period2, setPeriod2] = useState(formattedToday);
  const [symbol, setSymbol] = useState("");
  const [curName, setCurName] = useState("");
  const [shortTermWindow, setShortTermWindow] = useState("");
  const [longTermWindow, setLongTermWindow] = useState("");
  const [smaData, setSmaData] = useState<MA_AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [considerLongEntries, setConsiderLongEntries] = useState(true);
  const [considerShortEntries, setConsiderShortEntries] = useState(false);

  // Scanner state
  const [scanFastEMA, setScanFastEMA] = useState<number | null>(9);
  const [scanSlowEMA, setScanSlowEMA] = useState<number | null>(21);
  const [scanDirection, setScanDirection] = useState<string>("above");
  const [scanInterval, setScanInterval] = useState<string>("1d");
  const [scanResults, setScanResults] = useState<EMAScanResult[]>([]);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanSelectedRows, setScanSelectedRows] = useState<StockSecuritySectorFormat[]>([]);
  const [showTodayHighlight, setShowTodayHighlight] = useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setIsLoading(true);

    // If no symbol is entered, run the full S&P 500 scanner instead
    if (symbol === "") {
      setIsLoading(false);
      handleScan();
      return;
    }

    if (shortTermWindow === "" || longTermWindow === "") {
      toast({
        title: "Error",
        description: "All fields are required.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const windowFormatRegex = /^\d+-\d+$/;
    if (!windowFormatRegex.test(shortTermWindow) || !windowFormatRegex.test(longTermWindow)) {
      toast({
        title: "Error",
        description: "The window format is incorrect. Please use the 'number-number' format.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const fetchedData = await fetchChartData(symbol, period1, period2, "1d");
      localStorage.setItem("fetchedData", JSON.stringify(fetchedData));
      if (fetchedData) {
        const dates = fetchedData.map((entry) => entry.date);
        const closingPrices = fetchedData.map((entry) => entry.close);
        let strategyType;

        if (considerLongEntries && !considerShortEntries) {
          strategyType = StrategyType.Buying;
        } else if (!considerLongEntries && considerShortEntries) {
          strategyType = StrategyType.Shorting;
        } else if (considerLongEntries && considerShortEntries) {
          strategyType = StrategyType.Both;
        }
        if (!strategyType) {
          toast({
            title: "Error",
            description: "Please check one of the boxes for calculating profits based on buying, selling, or both.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        localStorage.setItem("considerLongEntries", JSON.stringify(considerLongEntries));
        localStorage.setItem("considerShortEntries", JSON.stringify(considerShortEntries));
        const analysisResults = analyzeMovingAveragePerformance(dates, closingPrices, shortTermWindow, longTermWindow, false, strategyType);
        setSmaData(analysisResults);
        setCurName(Tickers_dict[symbol] || symbol);
      } else {
        setSmaData([]);
      }
    } catch (error) {
      console.error("Error fetching stock data: ", error);
    }

    setIsLoading(false);
  };

  const handleScan = async () => {
    if (!scanFastEMA || !scanSlowEMA) {
      toast({
        title: "Error",
        description: "Fast and slow EMA periods are required.",
        variant: "destructive",
      });
      return;
    }
    if (scanFastEMA >= scanSlowEMA) {
      toast({
        title: "Error",
        description: "Fast EMA period must be less than the slow EMA period.",
        variant: "destructive",
      });
      return;
    }

    setScanLoading(true);
    setScanResults([]);
    setScanProgress(0);

    const results: EMAScanResult[] = [];
    const barsNeeded = Math.max(scanFastEMA, scanSlowEMA) + 30;
    const days =
      scanInterval === "1d" || scanInterval === "5d" ? 365
      : scanInterval === "1mo" ? barsNeeded * 30
      : scanInterval === "3mo" ? barsNeeded * 90
      : scanInterval === "6mo" ? barsNeeded * 180
      : barsNeeded * 365;
    const period1Date = new Date();
    period1Date.setDate(period1Date.getDate() - days);

    const stockList = scanSelectedRows.length > 0 ? scanSelectedRows : snp_array;

    for (const ticker of stockList) {
      try {
        const data = await fetchChartData(ticker.Symbol, period1Date.toISOString().split("T")[0], formattedToday, scanInterval);
        if (data && data.length >= 2) {
          const livePrice = data[data.length - 1].close;
          const dates = data.map((d) => d.date);
          const closes = data.map((d) => d.close);

          const signals = generateMovingAverageSignals(dates, closes, scanFastEMA, scanSlowEMA, false, StrategyType.Both);

          // Find most recent crossover matching the chosen direction
          for (let i = signals.length - 1; i >= 0; i--) {
            const pos = signals[i].positions;
            if ((scanDirection === "above" && pos === 1) || (scanDirection === "below" && pos === -1)) {
              results.push({
                symbol: ticker.Symbol,
                security: ticker.Security,
                industry: ticker["GICS Sector"],
                date: signals[i].date,
                buyPrice: signals[i].price,
                curPrice: livePrice,
              });
              break;
            }
          }
        }
      } catch (e) {
        console.error("Error scanning", ticker.Symbol, e);
      }
      setScanProgress((prev) => prev + 1);
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setScanResults(results);
    setScanLoading(false);
  };

  return (
    <div className="flex flex-col mt-8">
      <h1 className="text-2xl font-bold mb-4">Find Best Exponential Moving Average Crossovers</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Spot trends and pinpoint trade opportunities with this Exponential Moving Average Crossover tool. Just choose a stock (some symbols may be missing from autofill), set your windows, choose your
        dates, and click &apos;Fetch&apos; to get started. Click on a row for more insights on when to buy and sell stock based on crossovers.
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        When the fast EMA crosses above the slow EMA, this is a sign of an uptrend, which indicates a buy. Vise versa, when the fast EMA crosses below the slow EMA, this is a sign of a downtrend,
        which indicates a sell.
      </p>

      {/* EMA Formula Box */}
      <div className="rounded-lg border bg-muted/40 px-6 py-4 mb-4 w-fit">
        <p className="text-sm font-semibold mb-3">EMA Formula</p>
        <div className="space-y-2 font-mono text-sm">
          <div>
            <span className="text-muted-foreground">Step 1 — Seed (first value):</span>
            <div className="mt-1 pl-4">
              EMA<sub>period</sub> = SMA of first <em>N</em> closing prices
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Step 2 — Each subsequent bar:</span>
            <div className="mt-1 pl-4">
              EMA<sub>t</sub> = ( EMA<sub>t−1</sub> × (N − 1) + Price<sub>t</sub> ) ÷ N
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Equivalent form:</span>
            <div className="mt-1 pl-4">
              EMA<sub>t</sub> = EMA<sub>t−1</sub> + α × ( Price<sub>t</sub> − EMA<sub>t−1</sub> )
            </div>
            <div className="mt-1 pl-4 text-muted-foreground">
              where α = 1 ÷ N &nbsp;(smoothing factor),&nbsp; N = period
            </div>
          </div>
        </div>
      </div>

      <hr className="mb-4" />
      <div className="w-full flex gap-4 mb-4">
        <StockSearchForm curName={curName} setSymbol={setSymbol} period1={period1} setPeriod1={setPeriod1} period2={period2} setPeriod2={setPeriod2} />
      </div>
      <div className="w-full mb-4 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <span className="h-10 py-2 text-md font-semibold">Fast EMA Window:</span>
          <Input
            type="text"
            placeholder="Fast (e.g. 1-10)"
            value={shortTermWindow}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setShortTermWindow(value);
            }}
            className="hover:border-blue-500 max-w-[180px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="h-10 py-2 text-md font-semibold">Slow EMA Window:</span>
          <Input
            type="text"
            placeholder="Slow (e.g., 10-50)"
            value={longTermWindow}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setLongTermWindow(value);
            }}
            className="hover:border-blue-500 max-w-[180px]"
          />
        </div>
        <div>
          <div className="flex items-center space-x-2 py-1">
            <Checkbox
              id="considerLongEntries"
              checked={considerLongEntries}
              onCheckedChange={() => {
                setConsiderLongEntries(!considerLongEntries);
              }}
            />
            <label htmlFor="considerLongEntries" className="text-sm font-medium leading-none">
              Consider Long Positions
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="considerShortEntries"
              checked={considerShortEntries}
              onCheckedChange={() => {
                setConsiderShortEntries(!considerShortEntries);
              }}
            />
            <label htmlFor="considerShortEntries" className="text-sm font-medium leading-none">
              Consider Short Positions
            </label>
          </div>
        </div>
        <Button onClick={handleSubmit} className="btn btn-primary self-start">
          Fetch
        </Button>
      </div>
      <div className="w-full">
        <DataTable isLoading={isLoading} columns={columns} data={smaData} />
      </div>

      {/* ── EMA Crossover Scanner ── */}
      <hr className="my-8" />
      <h2 className="text-xl font-bold mb-2">EMA Crossover Scanner</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Scans the S&amp;P 500 and returns every stock where the fast EMA most recently crossed the slow EMA in the chosen direction. Green rows indicate the stock is up since the crossover; red rows are down.
      </p>

      <div className="flex gap-4 items-center mb-4">
        <p className="text-sm text-muted-foreground">Searched through {scanProgress} out of</p>
        <FindStockFilter disabled={scanLoading} selectedRows={scanSelectedRows} setSelectedRows={setScanSelectedRows} snp_array={snp_array} />
      </div>

      <div className="w-full mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Fast EMA</span>
          <Input
            disabled={scanLoading}
            type="text"
            placeholder="e.g. 9"
            value={scanFastEMA ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value;
              if (v === "") setScanFastEMA(null);
              else { const n = Number(v); if (!isNaN(n)) setScanFastEMA(n); }
            }}
            className="hover:border-blue-500 max-w-[100px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Slow EMA</span>
          <Input
            disabled={scanLoading}
            type="text"
            placeholder="e.g. 21"
            value={scanSlowEMA ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value;
              if (v === "") setScanSlowEMA(null);
              else { const n = Number(v); if (!isNaN(n)) setScanSlowEMA(n); }
            }}
            className="hover:border-blue-500 max-w-[100px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Direction</span>
          <Select disabled={scanLoading} onValueChange={(v) => setScanDirection(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Crosses Above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Crosses Above</SelectItem>
              <SelectItem value="below">Crosses Below</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Interval</span>
          <Select disabled={scanLoading} onValueChange={(v) => setScanInterval(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="1 Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Day</SelectItem>
              <SelectItem value="1mo">1 Month</SelectItem>
              <SelectItem value="3mo">3 Month</SelectItem>
              <SelectItem value="6mo">6 Month</SelectItem>
              <SelectItem value="1y">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => setShowTodayHighlight(!showTodayHighlight)}
            variant={showTodayHighlight ? "default" : "outline"}
            className={showTodayHighlight ? "bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-400" : "border-yellow-400 text-yellow-600 hover:bg-yellow-50"}
          >
            TODAY
          </Button>
          <Button onClick={handleScan} disabled={scanLoading} className="btn btn-primary">
            {scanLoading ? "Scanning…" : "Scan"}
          </Button>
        </div>
      </div>

      <div className="w-full">
        <ScannerDataTable isLoading={scanLoading} columns={scannerColumns} data={scanResults} showTodayHighlight={showTodayHighlight} />
      </div>
    </div>
  );
};

export default ExponentialMovingAverage;
