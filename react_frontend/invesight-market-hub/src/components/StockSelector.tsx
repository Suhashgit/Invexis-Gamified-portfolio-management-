import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Stock {
  symbol: string;
  name: string;
}

// Hardcoded available stocks as per your requirement
const availableStocks: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOG", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "GS", name: "Goldman Sachs Group Inc." },
  { symbol: "XOM", name: "Exxon Mobil Corp." },
  { symbol: "CVX", name: "Chevron Corp." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "KO", name: "Coca-Cola Co." },
  { symbol: "PEP", name: "PepsiCo Inc." },
];

interface StockSelectorProps {
  onSelectionChange: (selectedStocks: string[]) => void;
}

export const StockSelector = ({ onSelectionChange }: StockSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  const handleStockToggle = (symbol: string) => {
    const newSelection = selectedStocks.includes(symbol)
      ? selectedStocks.filter(s => s !== symbol)
      : [...selectedStocks, symbol];
    
    setSelectedStocks(newSelection);
    onSelectionChange(newSelection); // Notify parent of the change
  };

  const removeStock = (symbol: string) => {
    const newSelection = selectedStocks.filter(s => s !== symbol);
    setSelectedStocks(newSelection);
    onSelectionChange(newSelection); // Notify parent of the change
  };

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            {selectedStocks.length === 0
              ? "Select stocks to forecast..."
              : `${selectedStocks.length} stock${selectedStocks.length > 1 ? 's' : ''} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-slate-800 border-slate-600">
          <div className="p-4 space-y-2 max-h-60 overflow-y-auto"> {/* Added max-height for scroll */}
            {availableStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded"
                onClick={() => handleStockToggle(stock.symbol)}
              >
                <Checkbox
                  checked={selectedStocks.includes(stock.symbol)}
                  onCheckedChange={() => handleStockToggle(stock.symbol)} // Use onCheckedChange for Checkbox
                />
                <div className="flex-1">
                  <div className="font-medium text-white">{stock.symbol}</div>
                  <div className="text-sm text-slate-400">{stock.name}</div>
                </div>
                {selectedStocks.includes(stock.symbol) && (
                  <Check className="h-4 w-4 text-green-400" />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedStocks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStocks.map((symbol) => {
            const stock = availableStocks.find(s => s.symbol === symbol); // Get full stock object
            return (
              <Badge
                key={symbol}
                variant="secondary"
                className="bg-slate-700 text-white hover:bg-slate-600 cursor-pointer" // Make badge clickable for removal
                onClick={() => removeStock(symbol)} // Remove on badge click
              >
                {stock?.symbol}
                <button
                  type="button" // Important for accessibility and avoiding form submission
                  onClick={(e) => { e.stopPropagation(); removeStock(symbol); }} // Stop propagation to prevent popover close
                  className="ml-2 text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};