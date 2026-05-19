"use client";

import React, { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { calculateMACD, calculateRsi, calculateSma, calculateStochastic, getFormattedDates } from "@/lib/utils";
import { snp_array } from "@/lib/data/nasdaq_100";
import { useChartData } from "@/hooks/useChartData";
import { Input } from "@/components/ui/input";
import { DataTable } from "./data-table";
import { columns } from "./columns";

import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { saveAs } from "file-saver";
import { StockSecuritySectorFormat } from "@/lib/types";
import FindStockFilter from "@/components/find-stock-data-table-components/find-stock-filter";

const FindStocks = () => {
  const [loading, setLoading] = useState(false);
  const { fetchChartData } = useChartData();
  const { formattedToday } = getFormattedDates();
  const [stochasticPeriod, setStochasticPeriod] = useState<number | null>(14);
  const [stochasticLevel, setStochasticLevel] = useState<number | null>(30);
  const [stochasticLevelMax, setStochasticLevelMax] = useState<number | null>(null);
  const [stochasticDirection, setStochasticDirection] = useState<string>("above");
  const [smaValue, setSmaValue] = useState<number | null>(20);
  const [smaDirection, setSmaDirection] = useState<string>("above");
  const [interval, setInterval] = useState<string>("1d");
  const [progress, setProgress] = useState(0);
  const [matchingStock, setMatchingStock] = useState<{ symbol: string; security: string; industry: string; date: Date }[]>([]);
  const [rsiPeriod, setRsiPeriod] = useState<number | null>(14);
  const [rsiValue, setRsiValue] = useState<number | null>(30);
  const [rsiDirection, setRsiDirection] = useState<string>("above");
  const [macDPeriod, setmacDPeriod] = useState<number | null>(9);
  const [macDFastValue, setMacDFastValue] = useState<number | null>(12);
  const [macDSlowValue, setMacDSlowValue] = useState<number | null>(26);
  const [macdDirection, setMacdDirection] = useState<string>("above");
  const [includeSma, setIncludeSma] = useState(false);
  const [includeRsi, setIncludeRsi] = useState(false);
  const [includeMacd, setIncludeMacd] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [includeLiveData, setIncludeLiveData] = useState(true);
  const [selectedRows, setSelectedRows] = useState<StockSecuritySectorFormat[]>([]);

  const downloadCSV = (data: any[]) => {
    let csvContent = ["Symbol", "Security", "Industry", "Date of Signal", "Date of Signal Price", "Current Price"].join(",") + "\n";

    data.forEach((item) => {
      const row = [item.symbol, item.security, item.industry, new Date(item.date).toLocaleDateString(), item.buyPrice, item.curPrice].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Matching Stock Data.csv");
  };

  const handleFetch = async (levelMin?: number, levelMax?: number) => {
    const activeLevel = levelMin ?? stochasticLevel;
    const activeLevelMax = levelMax ?? stochasticLevelMax;

    setMatchingStock([]);
    setLoading(true);
    setProgress(0);

    if (!includeRsi && (!stochasticPeriod || !activeLevel || !stochasticDirection)) {
      toast({
        title: "Error",
        description: "Stochastic fields are required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const results = [];
    const days = interval == "1d" || interval == "5d" ? 365
      : interval == "1mo" ? (stochasticPeriod + 1) * 30
      : interval == "2mo" ? (stochasticPeriod + 1) * 60
      : interval == "3mo" ? (stochasticPeriod + 1) * 90
      : interval == "6mo" ? (stochasticPeriod + 1) * 180
      : interval == "9mo" ? (stochasticPeriod + 1) * 270
      : (stochasticPeriod + 1) * 365;
    const larger_period = Math.max(smaValue ?? 0, stochasticPeriod, days);
    const period1Date = new Date();
    period1Date.setDate(period1Date.getDate() - larger_period);

    for (const ticker of selectedRows.length > 0 ? selectedRows : snp_array) {
      const symbol = ticker.Symbol;
      const security = ticker.Security;
      const industry = ticker["GICS Sector"];

      try {
        const data = await fetchChartData(symbol, period1Date.toISOString().split("T")[0], formattedToday, interval);
        if (data && data.length) {
          const livePrice = data[data.length - 1].close;
          if (!includeLiveData) {
            data.pop();
          }
          const closes = data.map((d) => d.close);
          const highs = data.map((d) => d.high);
          const lows = data.map((d) => d.low);
          const stochasticValues = calculateStochastic(closes, highs, lows, stochasticPeriod);

          if (includeSma && !smaValue) {
            toast({
              title: "Error",
              description: "Include Closing Price is checked but no input for the SMA is provided",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (includeRsi && !rsiValue) {
            toast({
              title: "Error",
              description: "Include RSI is checked but no input for the RSI Level is provided",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (includeMacd && (!macDSlowValue || !macDFastValue || !macDPeriod)) {
            toast({
              title: "Error",
              description: "Include MACD is checked but missing an input for the MACD calculation",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const smaValues = includeSma ? calculateSma(closes, smaValue!) : null;
          const rsiValues = includeRsi ? calculateRsi(closes, rsiPeriod ?? 14) : null;
          const rsiDisplay = calculateRsi(closes, rsiPeriod ?? 14);
          const macdValues = includeMacd ? calculateMACD(closes, macDFastValue!, macDSlowValue!, macDPeriod!) : null;

          for (let i = closes.length; i > Math.max(smaValue ?? 0, stochasticPeriod); i--) {
            if (stochasticValues[i] !== null && stochasticValues[i - 1]) {
              const smaCondition = includeSma ? smaValues![i] !== null && (smaDirection === "above" ? closes[i] > smaValues![i]! : closes[i] < smaValues![i]!) : true;

              const rsiIdx = i - (rsiPeriod ?? 14);
              const rsiCondition = includeRsi ? rsiIdx >= 0 && rsiValues![rsiIdx] != null && (rsiDirection === "above" ? rsiValues![rsiIdx]! > rsiValue! : rsiValues![rsiIdx]! < rsiValue!) : true;
              const macdCondition = includeMacd
                ? macdValues!.macdLine[i] !== null &&
                  macdValues!.signalLine[i] !== null &&
                  (macdDirection === "above" ? macdValues!.macdLine[i]! > macdValues!.signalLine[i]! : macdValues!.macdLine[i]! < macdValues!.signalLine[i]!)
                : true;

              const stochasticCondition = includeRsi ? true :
                stochasticDirection === "above"
                  ? stochasticValues[i]! > activeLevel && stochasticValues[i - 1]! < activeLevel &&
                    (activeLevelMax === null || stochasticValues[i]! <= activeLevelMax)
                  : stochasticValues[i]! < activeLevel && stochasticValues[i - 1]! > activeLevel &&
                    (activeLevelMax === null || stochasticValues[i]! >= activeLevelMax);

              if (smaCondition && stochasticCondition && rsiCondition && macdCondition) {
                if (includeSma) console.log(closes[i], smaValues![i]);
                results.push({
                  symbol,
                  security,
                  industry,
                  date: data[i].date,
                  buyPrice: closes[i],
                  curPrice: livePrice,
                  rsiValue: rsiDisplay[i - (rsiPeriod ?? 14)] ?? null,
                  stochasticValue: stochasticValues[i] ?? null,
                });
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data for symbol:", symbol, error);
      }
      setProgress((prevProgress) => prevProgress + 1);
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setIsDataReady(true);
    setMatchingStock(results);
    setLoading(false);
  };

  return (
    <div className="flex flex-col mt-8">
      <h1 className="text-2xl font-bold mb-4">Find Stocks based on the following indicators</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Symbol, Stock Name, and Sector is self explanatory. The date is the most recent date of the oscillator crossing above the inputted stochastic level. The stochastic oscillator is the derivative
        of the derivative of the oscillator with a 3 period sma for each derivative.
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        If a stock appears to have matched the following indicators, then it will appear below with the date that it happened. The indicator is when the oscillator crosses above/below the stochastic
        level with the closing price above/below the inputted sma
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Green background indicates the stock price went up since the date of signal. Red background indicates the stock price went down since the date of signal.
      </p>
      <div className="flex gap-4 items-center mb-4">
        <p className="text-sm text-muted-foreground">Searched through {progress} out of </p>
        <FindStockFilter disabled={loading} selectedRows={selectedRows} setSelectedRows={setSelectedRows} snp_array={snp_array} />
      </div>

      <hr className="mb-4" />

      <div className="w-full mb-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-10 py-2 text-sm font-semibold">Get signal when stochastic</span>
          <Select disabled={loading} onValueChange={(value) => setStochasticDirection(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Crosses Above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Crosses Above </SelectItem>
              <SelectItem value="below">Crosses Below </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 20 }, (_, i) => {
              const min = i * 5 + 1;
              const max = (i + 1) * 5;
              const isActive = stochasticLevel === min && stochasticLevelMax === max;
              return (
                <Button
                  key={min}
                  disabled={loading}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStochasticLevel(min);
                    setStochasticLevelMax(max);
                    if (!includeRsi) handleFetch(min, max);
                  }}
                >
                  {min}-{max}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="h-10 py-2 text-sm font-semibold">Stochastic Period</span>
          <Input
            disabled={loading}
            type="text"
            placeholder="# of Intervals (e.g. 10, 14, ...)"
            value={stochasticPeriod ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") {
                setStochasticPeriod(null);
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setStochasticPeriod(numValue);
                }
              }
            }}
            className="hover:border-blue-500 max-w-[180px]"
          />
        </div>
      </div>
      <div className="w-full mb-4 flex gap-6">
        <div className="flex gap-2 items-center">
          <div
            className="cursor-pointer flex items-center"
            onClick={() => {
              setIncludeSma(!includeSma);
            }}
          >
            <Checkbox className="mr-2 -translate-y-[1px]" checked={includeSma} />
            <span className="h-10 py-2 text-sm font-semibold pr-[8.17px]">Include Closing Price</span>
          </div>

          <Select disabled={loading} onValueChange={(value) => setSmaDirection(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above </SelectItem>
              <SelectItem value="below">Below </SelectItem>
            </SelectContent>
          </Select>
          <Input
            disabled={loading}
            type="text"
            placeholder="SMA (e.g. 5, 10, 20, ...)"
            value={smaValue ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") {
                setSmaValue(null);
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setSmaValue(numValue);
                }
              }
            }}
            className="hover:border-blue-500 max-w-[180px]"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="h-10 py-2 text-sm font-semibold ">Time Interval </span>
          <Select disabled={loading} onValueChange={(value) => setInterval(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="1 Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Day</SelectItem>
              <SelectItem value="1mo">1 Month</SelectItem>
              <SelectItem value="2mo">2 Month</SelectItem>
              <SelectItem value="3mo">3 Month</SelectItem>
              <SelectItem value="6mo">6 Month</SelectItem>
              <SelectItem value="9mo">9 Month</SelectItem>
              <SelectItem value="1y">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="w-full mb-4 gap-6 hidden">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              setIncludeMacd(!includeMacd);
            }}
          >
            <Checkbox className="mr-2 -translate-y-[1px]" checked={includeMacd} />
            <span className="h-10 py-2 text-sm font-semibold pr-[54.52px]">Include MACD </span>
          </div>

          <Select disabled={loading} onValueChange={setMacdDirection}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>
          <span className="h-10 py-2 text-sm font-semibold ">signal line with a period of </span>
          <Input
            disabled={loading}
            type="text"
            placeholder="MACD Period"
            value={macDPeriod ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") {
                setmacDPeriod(null);
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setmacDPeriod(numValue);
                }
              }
            }}
            className="hover:border-blue-500 max-w-[120px]"
          />
          <span className="h-10 py-2 text-sm font-semibold ">, fast EMA of </span>
          <Input
            disabled={loading}
            type="text"
            placeholder="Fast EMA"
            value={macDFastValue ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") {
                setMacDFastValue(null);
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setMacDFastValue(numValue);
                }
              }
            }}
            className="hover:border-blue-500 max-w-[100px]"
          />
          <span className="h-10 py-2 text-sm font-semibold ">, and slow EMA of </span>
          <Input
            disabled={loading}
            type="text"
            placeholder="Slow EMA"
            value={macDSlowValue ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") {
                setMacDSlowValue(null);
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setMacDSlowValue(numValue);
                }
              }
            }}
            className="hover:border-blue-500 max-w-[100px]"
          />
        </div>
      </div>
      <div className="w-full mb-4 flex">
        <div className="flex gap-2">
          <div
            className="cursor-pointer flex items-center"
            onClick={() => {
              setIncludeRsi(!includeRsi);
            }}
          >
            <Checkbox checked={includeRsi} className="mr-2 -translate-y-[1px]" />
            <span className="h-10 py-2 text-sm font-semibold pr-[75.39px]">Include RSI</span>
          </div>

          <Input
            disabled={loading}
            type="text"
            placeholder="RSI Period (default 14)"
            value={rsiPeriod ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") setRsiPeriod(null);
              else { const n = Number(value); if (!isNaN(n)) setRsiPeriod(n); }
            }}
            className="hover:border-blue-500 max-w-[140px]"
          />
          <Select disabled={loading} onValueChange={(value) => setRsiDirection(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>
          <Input
            disabled={loading}
            type="text"
            placeholder="RSI Level (e.g. 30, 70, ...)"
            value={rsiValue ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === "") setRsiValue(null);
              else { const n = Number(value); if (!isNaN(n)) setRsiValue(n); }
            }}
            className="hover:border-blue-500 max-w-[140px]"
          />
        </div>
        <div
          className="cursor-pointer flex items-center ml-auto"
          onClick={() => {
            setIncludeLiveData(!includeLiveData);
          }}
        >
          <Checkbox checked={includeLiveData} className="mr-2 -translate-y-[1px]" />
          <span className="h-10 py-2 text-sm font-semibold">Include Current Day&apos;s Data (only use during trading days)</span>
        </div>
        <div className="ml-auto">
          <Button onClick={() => downloadCSV(matchingStock)} disabled={!isDataReady} className="btn btn-primary mr-6">
            Download to Excel
          </Button>

          <Button onClick={handleFetch} disabled={loading} className="btn btn-primary">
            Fetch
          </Button>
        </div>
      </div>
      <div className="w-full">
        <DataTable isLoading={loading} columns={columns} data={matchingStock} />
      </div>
    </div>
  );
};

export default FindStocks;
