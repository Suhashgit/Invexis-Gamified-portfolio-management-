// src/StockProjection.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, TrendingDown, Eye, Plus, X, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
// useOutletContext is NOT imported here, as StockProjectionWrapper handles it.

const API_BASE_URL = "http://127.0.0.1:8000";

interface StockDataPoint {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Daily_Change_Percent: number;
}

interface SearchStockResult {
  symbol: string;
  name: string;
}

interface KeyRatios {
  marketCap: number | string;
  peRatio: number | string;
  eps: number | string;
  dividendYield: number | string;
  beta: number | string;
  roe: number | string;
}

interface CurrentQuote {
  price: number | string;
  change: number | string;
  changesPercentage: number | string;
  name: string;
  keyRatios: KeyRatios;
}

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number | string;
  change: number | string;
  changesPercentage: number | string;
  error?: string;
}

// StockProjectionProps interface is correctly defined and used here
interface StockProjectionProps {
  currentUserEmail: string | null;
  onLogout: () => void;
}

const StockProjection = ({ currentUserEmail, onLogout }: StockProjectionProps) => { // Correctly accepts props
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1M");
  const [historicalData, setHistoricalData] = useState<StockDataPoint[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchStockResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);

  const [currentQuote, setCurrentQuote] = useState<CurrentQuote>({
    price: 'N/A', change: 'N/A', changesPercentage: 'N/A', name: 'N/A',
    keyRatios: { marketCap: 'N/A', peRatio: 'N/A', eps: 'N/A', dividendYield: 'N/A', beta: 'N/A', roe: 'N/A' }
  });
  const [loadingQuote, setLoadingQuote] = useState(false);


  const popularIndices = [
    { symbol: "^GSPC", name: "S&P 500 Index" },
    { symbol: "^DJI", name: "Dow Jones Industrial Average" },
    { symbol: "^IXIC", name: "NASDAQ Composite Index" },
    { symbol: "QQQ", name: "Invesco QQQ Trust" },
  ];

  const timeframes = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "YTD", "MAX"];

  const [indexChartData, setIndexChartData] = useState<{[key: string]: StockDataPoint[]}>({});
  const [loadingIndexCharts, setLoadingIndexCharts] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoadingChartData(true);
      setChartError(null);
      try {
        const backendPeriod = timeframe.toLowerCase().replace('d', 'd').replace('m', 'mo');
        const url = `${API_BASE_URL}/api/stock/${selectedStock}/history?period=${backendPeriod}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to fetch historical data: ${response.statusText}`);
        }
        const data: StockDataPoint[] = await response.json();
        setHistoricalData(data);
      } catch (error: any) {
        console.error("Error fetching historical data:", error);
        setChartError(error.message || "Could not load chart data.");
        setHistoricalData([]);
      } finally {
        setLoadingChartData(false);
      }
    };

    if (selectedStock) {
      fetchHistoricalData();
    }
  }, [selectedStock, timeframe]);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoadingQuote(true);
      setCurrentQuote({
        price: 'N/A', change: 'N/A', changesPercentage: 'N/A', name: selectedStock,
        keyRatios: { marketCap: 'N/A', peRatio: 'N/A', eps: 'N/A', dividendYield: 'N/A', beta: 'N/A', roe: 'N/A' }
      });
      try {
        const url = `${API_BASE_URL}/api/stock/${selectedStock}/quote`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to fetch quote: ${response.statusText}`);
        }
        const data: CurrentQuote = await response.json();
        setCurrentQuote({
          price: data.price || 'N/A',
          change: data.change || 'N/A',
          changesPercentage: data.changesPercentage || 'N/A',
          name: data.name || selectedStock,
          keyRatios: data.keyRatios || { marketCap: 'N/A', peRatio: 'N/A', eps: 'N/A', dividendYield: 'N/A', beta: 'N/A', roe: 'N/A' }
        });
      } catch (error: any) {
        console.error("Error fetching real-time quote:", error);
        setCurrentQuote(prev => ({
          ...prev, name: selectedStock, price: 'N/A', change: 'N/A', changesPercentage: 'N/A',
          keyRatios: { marketCap: 'N/A', peRatio: 'N/A', eps: 'N/A', dividendYield: 'N/A', beta: 'N/A', roe: 'N/A' }
        }));
      } finally {
        setLoadingQuote(false);
      }
    };

    if (selectedStock) {
      fetchQuote();
    }
  }, [selectedStock]);


  const fetchWatchlist = async () => {
    if (!currentUserEmail) {
      setWatchlist([]);
      setWatchlistMessage("Log in to manage your watchlist.");
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/watchlist?user_email=${currentUserEmail}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch watchlist: ${response.statusText}`);
      }
      const data = await response.json();
      setWatchlist(data.watchlist || []);
      setWatchlistMessage(null);
    } catch (error: any) {
      console.error("Error fetching watchlist:", error);
      setWatchlistMessage(error.message || "Could not load watchlist.");
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [currentUserEmail]);


  useEffect(() => {
    const fetchPopularIndexCharts = async () => {
      setLoadingIndexCharts(true);
      const newIndexChartData: {[key: string]: StockDataPoint[]} = {};
      const fetchPromises = popularIndices.map(async (index) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/stock/${index.symbol}/history?period=5y`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${index.symbol} history.`);
          }
          const data: StockDataPoint[] = await response.json();
          newIndexChartData[index.symbol] = data;
        } catch (error) {
          console.error(`Error fetching history for ${index.symbol}:`, error);
          newIndexChartData[index.symbol] = [];
        }
      });
      await Promise.all(fetchPromises);
      setIndexChartData(newIndexChartData);
      setLoadingIndexCharts(false);
    };

    fetchPopularIndexCharts();
  }, []);


  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/search_stocks?query=${query}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to search stocks: ${response.statusText}`);
      }
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(query.length > 0 || data.length > 0);
    } catch (error) {
      console.error("Error during stock search:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  useEffect(() => {
    performSearch("");
  }, [performSearch]);


  const handleStockSelect = (stock: SearchStockResult) => {
    setSelectedStock(stock.symbol);
    setSearchTerm(stock.symbol);
    setShowSearchResults(false);
    setHistoricalData([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddToWatchlist = async () => {
    if (!currentUserEmail) {
      setWatchlistMessage("Please log in to manage your watchlist.");
      return;
    }
    const stockToAdd = searchResults.find(s => s.symbol === selectedStock) || popularIndices.find(s => s.symbol === selectedStock);
    if (!stockToAdd) {
        setWatchlistMessage("Please select a valid stock/index with a known name to add.");
        return;
    }

    const formData = new URLSearchParams();
    formData.append("symbol", stockToAdd.symbol);
    formData.append("name", stockToAdd.name);

    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/add?user_email=${currentUserEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to add to watchlist: ${response.statusText}`);
      }
      const result = await response.json();
      setWatchlistMessage(result.message);
      fetchWatchlist();
    } catch (error: any) {
      console.error("Error adding to watchlist:", error);
      setWatchlistMessage(error.message || "Failed to add to watchlist.");
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    if (!currentUserEmail) {
      setWatchlistMessage("Please log in to manage your watchlist.");
      return;
    }

    const formData = new URLSearchParams();
    formData.append("symbol", symbol);

    try {
      const response = await fetch(`${API_BASE_URL}/api/watchlist/remove?user_email=${currentUserEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to remove from watchlist: ${response.statusText}`);
      }
      const result = await response.json();
      setWatchlistMessage(result.message);
      fetchWatchlist();
    } catch (error: any) {
      console.error("Error removing from watchlist:", error);
      setWatchlistMessage(error.message || "Failed to remove from watchlist.");
    }
  };


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="custom-tooltip bg-slate-700 p-3 rounded-md shadow-lg border border-slate-600 text-white">
          <p className="label font-semibold">{`Date: ${label}`}</p>
          <p className="intro" style={{ color: '#10B981' }}>{`Close: $${dataPoint.Close?.toFixed(2)}`}</p>
          <p>{`Open: $${dataPoint.Open?.toFixed(2)}`}</p>
          <p>{`High: $${dataPoint.High?.toFixed(2)}`}</p>
          <p>{`Low: $${dataPoint.Low?.toFixed(2)}`}</p>
          <p>{`Volume: ${dataPoint.Volume?.toLocaleString()}`}</p>
          <p className={`${dataPoint.Daily_Change_Percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {`Daily Change: ${dataPoint.Daily_Change_Percent >= 0 ? '+' : ''}${dataPoint.Daily_Change_Percent?.toFixed(2)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  const latestDataPoint = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

  return (
    <div className="space-y-6 p-6">
      {/* Main Stock Search and Watchlist Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Stock Search
                <div className="relative w-64" ref={searchInputRef}>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 text-slate-400 animate-spin" />
                  )}
                  <Input
                    placeholder="Search stocks by symbol or name..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 100)}
                    className="pl-10 pr-10 bg-slate-800 border-slate-600 text-white w-full"
                  />
                  {showSearchResults && (
                    <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                      {isSearching && searchTerm.length > 0 && searchResults.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                          <span className="ml-2 text-slate-400">Searching...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((stock) => (
                          <div
                            key={stock.symbol}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedStock === stock.symbol ? 'bg-slate-700 border border-green-400' : 'hover:bg-slate-700'
                            } text-white`}
                            onClick={() => handleStockSelect(stock)}
                          >
                            <div>
                              <div className="font-semibold">{stock.symbol}</div>
                              <div className="text-sm text-slate-400">{stock.name}</div>
                            </div>
                          </div>
                        ))
                      ) : searchTerm.length > 0 && !isSearching ? (
                         <div className="text-center text-slate-400 py-8">
                           No stocks found for "{searchTerm}"
                         </div>
                      ) : (
                        <div className="grid gap-3">
                           <h4 className="text-slate-300 font-semibold mb-2 px-3 pt-3">Popular Stocks & Indices (Empty Search):</h4>
                           {/* Render popularIndices when search is empty */}
                           {popularIndices.map((stock) => (
                             <div
                               key={stock.symbol}
                               className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                 selectedStock === stock.symbol
                                   ? 'bg-slate-700 border border-green-400'
                                   : 'bg-slate-800 hover:bg-slate-700'
                               }`}
                               onClick={() => handleStockSelect(stock)}
                             >
                               <div>
                                 <div className="font-semibold text-white">{stock.symbol}</div>
                                 <div className="text-sm text-slate-400">{stock.name}</div>
                               </div>
                             </div>
                           ))}
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-slate-400 text-sm italic">Type to search, or select from results above.</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Watchlist
              </span>
              <Button size="sm" variant="ghost" className="text-green-400 hover:bg-slate-800" onClick={handleAddToWatchlist}>
                <Plus className="h-4 w-4 mr-1" /> Add Selected
              </Button>
            </CardTitle>
            {watchlistMessage && <p className="text-sm mt-2 text-center text-yellow-400">{watchlistMessage}</p>}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {watchlist.length > 0 ? (
                watchlist.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => handleStockSelect(stock)}
                  >
                    <span className="text-white font-medium">{stock.symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{stock.name}</span>
                      {typeof stock.price === 'number' && (
                        <div className="text-right">
                          <div className="text-white">${stock.price.toFixed(2)}</div>
                          <div className={`text-sm ${
                            typeof stock.changesPercentage === 'number' && stock.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {typeof stock.changesPercentage === 'number' ?
                              (stock.changesPercentage >= 0 ? '+' : '') + stock.changesPercentage.toFixed(2) + '%'
                              : 'N/A'
                            }
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-slate-600 p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWatchlist(stock.symbol);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center">Your watchlist is empty.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Indices Section (moved here, now 2x2 grid) */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Popular Indices</h2>
        {loadingIndexCharts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-400">Loading index charts...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {popularIndices.map((index) => {
              const data = indexChartData[index.symbol] || [];
              const lastClose = data.length > 0 ? data[data.length - 1].Close : 'N/A';
              const secondLastClose = data.length > 1 ? data[data.length - 2].Close : (typeof lastClose === 'number' ? lastClose : 'N/A');
              const change = typeof lastClose === 'number' && typeof secondLastClose === 'number' && secondLastClose !== 0
                             ? ((lastClose - secondLastClose) / secondLastClose) * 100
                             : 'N/A';

              return (
                <Card
                  key={index.symbol}
                  className="bg-slate-900 border-slate-700 cursor-pointer hover:border-green-500 transition-colors"
                  onClick={() => handleStockSelect(index)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-white text-lg flex justify-between items-center">
                      {index.symbol}
                      {typeof change === 'number' && (
                        <span className={`text-sm font-semibold flex items-center ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {change.toFixed(2)}%
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-slate-400 text-sm">{index.name}</p>
                    <p className="text-white text-xl font-bold">${typeof lastClose === 'number' ? lastClose.toFixed(2) : lastClose}</p>
                  </CardHeader>
                  <CardContent className="h-24 p-0">
                    {data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <Line
                            type="monotone"
                            dataKey="Close"
                            stroke={typeof change === 'number' && change >= 0 ? '#10B981' : '#EF4444'}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-sm">No chart data</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Selected Stock Analysis Card */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">{selectedStock}</CardTitle>
              <p className="text-slate-400">
                {loadingQuote ? 'Loading name...' : currentQuote.name !== 'N/A' ? currentQuote.name : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {loadingQuote ? 'Loading...' : (typeof currentQuote.price === 'number' ? `$${currentQuote.price.toFixed(2)}` : currentQuote.price)}
              </div>
              <div className={`flex items-center justify-end ${
                typeof currentQuote.changesPercentage === 'number' && currentQuote.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {loadingQuote ? 'Loading...' : (
                  typeof currentQuote.changesPercentage === 'number' ?
                    (currentQuote.changesPercentage >= 0 ? '+' : '') + currentQuote.changesPercentage.toFixed(2) + '%'
                    : currentQuote.changesPercentage
                )}
                {typeof currentQuote.changesPercentage === 'number' && (currentQuote.changesPercentage >= 0 ? <TrendingUp className="h-4 w-4 ml-1" /> : <TrendingDown className="h-4 w-4 ml-1" />)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeframe Selector */}
          <div className="flex gap-2 mb-6">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className={timeframe === tf ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300"}
              >
                {tf}
              </Button>
            ))}
          </div>

          {/* Chart Area */}
          <div className="h-64 bg-slate-800 rounded-lg flex items-center justify-center mb-6">
            {loadingChartData ? (
              <div className="text-center text-slate-400">Loading chart data...</div>
            ) : chartError ? (
              <div className="text-center text-red-400">Error: {chartError}</div>
            ) : historicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="Date" stroke="#94A3B8" tickFormatter={(tick) => new Date(tick).toLocaleDateString()} />
                  <YAxis stroke="#94A3B8" domain={['dataMin - 10', 'dataMax + 10']}/>
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#64748B', strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="Close" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                <p>No chart data available for {selectedStock}</p>
                <p className="text-sm">Try searching for a different stock or index.</p>
              </div>
            )}
          </div>

          {/* Stock Details Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-800 grid grid-cols-4 w-full">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">Overview</TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:bg-slate-700">Financials</TabsTrigger>
              <TabsTrigger value="holdings" className="data-[state=active]:bg-slate-700">Holdings</TabsTrigger>
              <TabsTrigger value="metrics" className="data-[state=active]:bg-slate-700">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Current Data (From Historical)</h3>
                  <div className="space-y-2 text-sm">
                    {latestDataPoint ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date</span>
                          <span className="text-white">{latestDataPoint.Date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Open</span>
                          <span className="text-white">${latestDataPoint.Open?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">High</span>
                          <span className="text-white">${latestDataPoint.High?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Low</span>
                          <span className="text-white">${latestDataPoint.Low?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume</span>
                          <span className="text-white">{latestDataPoint.Volume?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Daily Change %</span>
                          <span className={`${latestDataPoint.Daily_Change_Percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {latestDataPoint.Daily_Change_Percent >= 0 ? '+' : ''}{latestDataPoint.Daily_Change_Percent?.toFixed(2)}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-400">No current historical data available.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Key Ratios</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Market Cap</span>
                      <span className="text-white">{typeof currentQuote.keyRatios.marketCap === 'number' ? `$${(currentQuote.keyRatios.marketCap / 1_000_000_000).toFixed(2)}B` : currentQuote.keyRatios.marketCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P/E Ratio</span>
                      <span className="text-white">{currentQuote.keyRatios.peRatio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">EPS</span>
                      <span className="text-white">{currentQuote.keyRatios.eps !== 'N/A' ? `$${currentQuote.keyRatios.eps}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dividend Yield</span>
                      <span className="text-white">{currentQuote.keyRatios.dividendYield !== 'N/A' ? `${currentQuote.keyRatios.dividendYield}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beta</span>
                      <span className="text-white">{currentQuote.keyRatios.beta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ROE</span>
                      <span className="text-white">{currentQuote.keyRatios.roe !== 'N/A' ? `${currentQuote.keyRatios.roe}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="mt-4">
              <div className="text-center text-slate-400 py-8">
                <p>Financial statements and detailed analysis</p>
                <p className="text-sm">Income statement, balance sheet, cash flow (Requires FMP/Finnhub premium data)</p>
              </div>
            </TabsContent>

            <TabsContent value="holdings" className="mt-4">
              <div className="text-center text-slate-400 py-8">
                <p>Institutional holdings and insider information (Requires FMP/Finnhub premium data)</p>
                <p className="text-sm">Top shareholders and recent transactions</p>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="mt-4">
              <div className="text-center text-slate-400 py-8">
                <p>Advanced metrics and technical indicators (Requires FMP/Finnhub premium data)</p>
                <p className="text-sm">RSI, MACD, moving averages, and more</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockProjection;