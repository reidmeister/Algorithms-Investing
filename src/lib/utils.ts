import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MA_Signal, MA_AnalysisResult, StrategyType, Stoch_Signal, Stoch_AnalysisResult, MACDResult } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFormattedDates() {
  const today = new Date();
  const lastYear = new Date(new Date().setFullYear(today.getFullYear() - 1));

  return {
    formattedToday: today.toISOString().split("T")[0],
    formattedLastYear: lastYear.toISOString().split("T")[0],
  };
}

export function calculateSma(data: (number | null)[], period: number): (number | null)[] {
  let sma: (number | null)[] = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < period; j++) {
      if (data[i - j] !== null) {
        sum += data[i - j]!;
        count++;
      }
    }

    if (count === period) {
      sma[i] = sum / period;
    }
  }

  return sma;
}

function calculateEma(data: (number | null)[], period: number) {
  let ema: (number | null)[] = new Array(data.length).fill(null);
  let sma = calculateSma(data, period);

  for (let i = period; i < data.length; i++) {
    if (i === period) {
      ema[i] = sma[i - 1];
    } else if (ema[i - 1] !== null && data[i] !== null) {
      // (Last Day SMA * (Period - 1) + Curr Day Close) / Period
      // The 10 day EMA on Day 10 =  (Day 9 SMA x 9 + Day 10 close ) /10....  For clarity, the 10 day EMA on the 25th day is (day 24 SMA X 9 + day 25 close) / 10, etc.
      ema[i] = ((ema[i - 1] as number) * (period - 1) + (data[i] as number)) / period;
    }
  }

  return ema;
}

export function calculateRsi(data: number[], period: number) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const difference = data[i] - data[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  let relativeStrength = averageLoss === 0 ? Infinity : averageGain / averageLoss;
  let rsi = 100 - 100 / (1 + relativeStrength);

  const rsiValues = [rsi];

  for (let i = period + 1; i < data.length; i++) {
    const difference = data[i] - data[i - 1];
    let gain = difference > 0 ? difference : 0;
    let loss = difference < 0 ? -difference : 0;

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    relativeStrength = averageLoss === 0 ? Infinity : averageGain / averageLoss;
    rsi = 100 - 100 / (1 + relativeStrength);
    rsiValues.push(rsi);
  }

  return rsiValues;
}

export function calculateMACD(data: number[], shortPeriod: number, longPeriod: number, signalPeriod: number): MACDResult {
  const shortEma = calculateEma(data, shortPeriod);
  const longEma = calculateEma(data, longPeriod);
  const macdLine: (number | null)[] = new Array(data.length).fill(null);
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  const histogram: (number | null)[] = new Array(data.length).fill(null);

  // Calculate the MACD line
  for (let i = 0; i < data.length; i++) {
    if (shortEma[i] !== null && longEma[i] !== null) {
      macdLine[i] = shortEma[i]! - longEma[i]!;
    }
  }

  // Calculate the Signal line
  const macdEma = calculateEma(macdLine, signalPeriod);
  for (let i = 0; i < data.length; i++) {
    signalLine[i] = macdEma[i];
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i]! - signalLine[i]!;
    }
  }

  return { macdLine, signalLine, histogram };
}

export function generateMovingAverageSignals(date_data: Date[], data: number[], fastSignal: number, slowSignal: number, isSMA: boolean, strategyType: StrategyType): MA_Signal[] {
  const signals: MA_Signal[] = data.map((price, index) => ({
    date: date_data[index],
    price,
    fastMA: null,
    slowMA: null,
    holding: 0,
    positions: null,
    signalProfit: null,
    cumulativeProfit: 0,
  }));

  let fastMAs = isSMA ? calculateSma(data, fastSignal) : calculateEma(data, fastSignal);
  let slowMAs = isSMA ? calculateSma(data, slowSignal) : calculateEma(data, slowSignal);

  signals.forEach((signal, index) => {
    signal.fastMA = fastMAs[index];
    signal.slowMA = slowMAs[index];

    if (signal.fastMA !== null && signal.slowMA !== null) {
      // Stochastic not applicable, follow the MA signal
      signal.holding = signal.fastMA > signal.slowMA ? 1 : signal.fastMA < signal.slowMA ? -1 : 0;
    }
  });

  // Position represents buying or selling a stock
  for (let i = 1; i < signals.length; i++) {
    if (signals[i].holding !== signals[i - 1].holding) {
      signals[i].positions = signals[i].holding;
    }
  }

  let cumulativeProfit = 0;
  let positionEntryPrice: number | null = null;

  signals.forEach((signal, index) => {
    const prevSignal = index > 0 ? signals[index - 1] : null;

    switch (strategyType) {
      case StrategyType.Buying:
        if (signal.positions === 1) {
          // Enter buy position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -1 && positionEntryPrice !== null) {
          // Exit buy position
          const sellPrice = signal.price;
          const profit = sellPrice - positionEntryPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }
        break;

      case StrategyType.Shorting:
        if (signal.positions === -1) {
          // Enter short position
          positionEntryPrice = signal.price;
        } else if (signal.positions === 1 && positionEntryPrice !== null) {
          // Exit short position
          const coverPrice = signal.price;
          const profit = positionEntryPrice - coverPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }
        break;

      case StrategyType.Both:
        if (signal.positions === 1) {
          if (prevSignal && prevSignal.holding === -1 && positionEntryPrice !== null) {
            // Switching from short to buy
            // Calculate profit from shorting
            const profit = positionEntryPrice - signal.price;
            signal.signalProfit = profit;
            cumulativeProfit += profit;
          }
          // Enter buy position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -1) {
          if (prevSignal && prevSignal.holding === 1 && positionEntryPrice !== null) {
            // Switching from buy to short
            // Calculate profit from buying
            const profit = signal.price - positionEntryPrice;
            signal.signalProfit = profit;
            cumulativeProfit += profit;
          }
          // Enter short position
          positionEntryPrice = signal.price;
        } else if (signal.positions === 0 && positionEntryPrice !== null) {
          // Exiting a position to nonne position
          const profit =
            signal.holding === 1
              ? signal.price - positionEntryPrice // Exiting a buy to none position
              : positionEntryPrice - signal.price; // Exiting a short to none position
          signal.signalProfit = profit;
          cumulativeProfit += profit;
          positionEntryPrice = null;
        }
        break;
    }

    signal.cumulativeProfit = cumulativeProfit;
  });

  return signals;
}

const parseRange = (range: string) => {
  const [start, end] = range.split("-").map(Number);
  return { start, end };
};

export function analyzeMovingAveragePerformance(date_data: Date[], data: number[], shortRange: string, longRange: string, isSMA: boolean, strategyType: StrategyType): MA_AnalysisResult[] {
  const shortRangeParsed = parseRange(shortRange);
  const longRangeParsed = parseRange(longRange);

  const results: MA_AnalysisResult[] = [];

  for (let short = shortRangeParsed.start; short <= shortRangeParsed.end; short++) {
    for (let long = longRangeParsed.start; long <= longRangeParsed.end; long++) {
      if (short > long) continue;

      const signals = generateMovingAverageSignals(date_data, data, short, long, isSMA, strategyType);
      const positions = signals.map((signal) => signal.positions).filter((pos) => pos !== null);

      let numberOfTrades;

      switch (strategyType) {
        case StrategyType.Buying:
          numberOfTrades = positions.filter((pos) => pos === 1).length;
          break;
        case StrategyType.Shorting:
          numberOfTrades = positions.filter((pos) => pos === -1).length;
          break;
        case StrategyType.Both:
          numberOfTrades = positions.filter((pos) => pos === 1 || pos === -1).length;
          break;
      }
      let profitableTrades = signals.filter((signal) => signal.signalProfit !== null && signal.signalProfit > 0).length;
      const winPercentage = numberOfTrades > 0 ? (profitableTrades / numberOfTrades) * 100 : 0;
      const cumulativeProfit = signals[signals.length - 1].cumulativeProfit;
      results.push({
        fastMA: short,
        slowMA: long,
        cumulativeProfit,
        winPercentage,
        numberOfTrades,
      });
    }
  }
  return results;
}

export function calculateStochastic(close: number[], high: number[], low: number[], period: number): (number | null)[] {
  // Initialize the array for %K values
  let percentK: number[] = [];

  // Start the loop from the point where the first calculation is possible
  for (let i = period - 1; i < close.length; i++) {
    // Find the highest high and the lowest low in the last `period` candles
    let periodHighs = high.slice(i - period + 1, i + 1);
    let periodLows = low.slice(i - period + 1, i + 1);
    let highestHigh = Math.max(...periodHighs);
    let lowestLow = Math.min(...periodLows);

    // Calculate %K using the formula
    let currentClose = close[i];

    // Handle the case where highestHigh somehow equals lowestLow to avoid division by zero
    if (highestHigh === lowestLow) {
      percentK.push(0);
    } else {
      let kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      percentK.push(kValue);
    }
  }

  let initialNulls = new Array(period - 1).fill(null);

  const three_day_stoch_sma = calculateSma([...initialNulls, ...percentK], 3);
  const three_day__sma_three_day_stoch_sma = calculateSma(three_day_stoch_sma, 3);

  return three_day__sma_three_day_stoch_sma;
}

export function generateStochasticSignals(
  date_data: Date[],
  prices: number[],
  stochasticVals: (number | null)[],
  oversoldLevel: number,
  overboughtLevel: number,
  strategyType: StrategyType
): Stoch_Signal[] {
  const signals: Stoch_Signal[] = prices.map((price, index) => ({
    date: date_data[index],
    price,
    stochastic: stochasticVals[index],
    holding: 0,
    positions: null,
    signalProfit: null,
    cumulativeProfit: 0,
  }));

  for (let i = 1; i < signals.length; i++) {
    const currentStochastic = signals[i].stochastic;
    const previousStochastic = signals[i - 1].stochastic;

    // Reset holding initially
    signals[i].holding = signals[i - 1].holding;

    if (currentStochastic && previousStochastic) {
      // Exit logic for buy positions
      if (currentStochastic >= overboughtLevel && signals[i - 1].holding === 1) {
        signals[i].holding = 0;
      }
      // Exit logic for sell positions
      else if (currentStochastic <= oversoldLevel && signals[i - 1].holding === 2) {
        signals[i].holding = 0;
      }

      // Entry logic for buy positions
      if (currentStochastic > oversoldLevel && previousStochastic <= oversoldLevel) {
        signals[i].holding = 1;
      }
      // Entry logic for sell positions
      else if (currentStochastic < overboughtLevel && previousStochastic >= overboughtLevel) {
        signals[i].holding = 2;
      }
    }
  }

  for (let i = 1; i < signals.length; i++) {
    if (signals[i].holding !== signals[i - 1].holding) {
      if (signals[i - 1].holding === 1) {
        signals[i].positions = -1;
      } else if (signals[i - 1].holding === 2) {
        signals[i].positions = -2;
      } else {
        signals[i].positions = signals[i].holding;
      }
    }
  }

  let cumulativeProfit = 0;
  let positionEntryPrice: number | null = null;

  signals.forEach((signal, index) => {
    switch (strategyType) {
      case StrategyType.Buying:
        if (signal.positions === 1) {
          // Enter buy position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -1 && positionEntryPrice !== null) {
          // Exit buy position
          const sellPrice = signal.price;
          const profit = sellPrice - positionEntryPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }
        break;

      case StrategyType.Shorting:
        if (signal.positions === 2) {
          // Enter short position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -2 && positionEntryPrice !== null) {
          // Exit short position
          const coverPrice = signal.price;
          const profit = positionEntryPrice - coverPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }
        break;

      case StrategyType.Both:
        if (signal.positions === 1) {
          // Enter buy position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -1 && positionEntryPrice !== null) {
          // Exit buy position
          const sellPrice = signal.price;
          const profit = sellPrice - positionEntryPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }
        if (signal.positions === 2) {
          // Enter short position
          positionEntryPrice = signal.price;
        } else if (signal.positions === -2 && positionEntryPrice !== null) {
          // Exit short position
          const coverPrice = signal.price;
          const profit = positionEntryPrice - coverPrice;
          signal.signalProfit = profit;
          positionEntryPrice = null;
          cumulativeProfit += profit;
        }

        break;
    }

    signal.cumulativeProfit = cumulativeProfit;
  });

  return signals;
}

export function analyzeStochasticPerformance(
  date_data: Date[],
  data: number[],
  stochastic: (number | null)[],
  oversoldStochasticRange: string,
  overboughtStochasticRange: string,
  strategyType: StrategyType
): Stoch_AnalysisResult[] {
  const results: Stoch_AnalysisResult[] = [];
  const oversoldStochasticRangeParsed = parseRange(oversoldStochasticRange);
  const overboughtRangeParsed = parseRange(overboughtStochasticRange);
  for (let oversoldStochastic = oversoldStochasticRangeParsed.start; oversoldStochastic <= oversoldStochasticRangeParsed.end; oversoldStochastic++) {
    for (let overboughtStochastic = overboughtRangeParsed.start; overboughtStochastic <= overboughtRangeParsed.end; overboughtStochastic++) {
      if (oversoldStochastic > overboughtStochastic) continue;

      const signals = generateStochasticSignals(date_data, data, stochastic, oversoldStochastic, overboughtStochastic, strategyType);
      const positions = signals.map((signal) => signal.positions).filter((pos) => pos !== null);

      let numberOfTrades;

      switch (strategyType) {
        case StrategyType.Buying:
          numberOfTrades = positions.filter((pos) => pos === 1).length;
          break;
        case StrategyType.Shorting:
          numberOfTrades = positions.filter((pos) => pos === -1).length;
          break;
        case StrategyType.Both:
          numberOfTrades = positions.filter((pos) => pos === 1 || pos === -1).length;
          break;
      }
      let profitableTrades = signals.filter((signal) => signal.signalProfit !== null && signal.signalProfit > 0).length;
      const winPercentage = numberOfTrades > 0 ? (profitableTrades / numberOfTrades) * 100 : 0;
      const cumulativeProfit = signals[signals.length - 1].cumulativeProfit;
      results.push({
        oversoldStoch: oversoldStochastic,
        overboughtStoch: overboughtStochastic,
        cumulativeProfit,
        winPercentage,
        numberOfTrades,
      });
    }
  }

  return results;
}
