"use client";

import { useEffect, useRef, useState } from "react";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function StockTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuotes = async () => {
    try {
      const res = await fetch("/api/quotes");
      if (!res.ok) return;
      const data = await res.json();
      setQuotes(data);
    } catch {}
  };

  useEffect(() => {
    fetchQuotes();
    intervalRef.current = setInterval(fetchQuotes, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (quotes.length === 0) return null;

  const items = [...quotes, ...quotes];

  return (
    <div className="w-full overflow-hidden bg-background border-b border-border text-xs py-1.5 select-none">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((q, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-4">
            <span className="font-semibold">{q.symbol}</span>
            <span>{q.price?.toFixed(2)}</span>
            <span className={q.change >= 0 ? "text-green-500" : "text-red-500"}>
              {q.change >= 0 ? "▲" : "▼"} {Math.abs(q.changePercent ?? 0).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
