// src/NewsAnalyzer.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, TrendingUp, TrendingDown, AlertTriangle, Clock, ExternalLink, Search, BookmarkPlus, Star, Activity, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

interface AffectedStock {
  symbol: string;
  name: string;
  sector: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  reason: string;
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  impact: "bullish" | "bearish" | "sector-specific" | "neutral";
  priority: number;
  affectedSectors: string[];
  timestamp: string;
  source: string;
  sourceUrl: string;
  aiAnalysis: string;
  butterflyEffect: string;
  affectedStocks: AffectedStock[];
}

interface NewsCategory {
  id: string;
  name: string;
  count: number;
}

// FIX: NewsAnalyzerProps interface is correctly defined and used here
interface NewsAnalyzerProps {
  currentUserEmail: string | null;
  onLogout: () => void;
}

const NewsAnalyzer = ({ currentUserEmail, onLogout }: NewsAnalyzerProps) => { // Correctly accept props
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedNews, setSavedNews] = useState<string[]>([]);
  const [expandedStocks, setExpandedStocks] = useState<string[]>([]);

  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [marketSentiment, setMarketSentiment] = useState({ bullish: 0, bearish: 0, neutral: 0 });


  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    setNewsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/news`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch news: ${response.statusText}`);
      }
      const data = await response.json();
      setNewsArticles(data.news);

      const allNewsCount = data.news.length;
      const bullishCount = data.news.filter((n: NewsArticle) => n.impact === "bullish").length;
      const bearishCount = data.news.filter((n: NewsArticle) => n.impact === "bearish").length;
      const sectorCount = data.news.filter((n: NewsArticle) => n.impact === "sector-specific").length;
      const neutralCount = data.news.filter((n: NewsArticle) => n.impact === "neutral").length;

      setCategories([
        { id: "all", name: "All News", count: allNewsCount },
        { id: "bullish", name: "Market Positive", count: bullishCount },
        { id: "bearish", name: "Market Negative", count: bearishCount },
        { id: "sector", name: "Sector Specific", count: sectorCount },
        { id: "neutral", name: "Neutral", count: neutralCount },
      ]);

      setMarketSentiment({
        bullish: allNewsCount > 0 ? Math.round((bullishCount / allNewsCount) * 100) : 0,
        bearish: allNewsCount > 0 ? Math.round((bearishCount / allNewsCount) * 100) : 0,
        neutral: allNewsCount > 0 ? Math.round((neutralCount + sectorCount / 2) / allNewsCount * 100) : 0
      });

    } catch (error: any) {
      console.error("Error fetching news:", error);
      setNewsError(error.message || "Could not load news.");
      setNewsArticles([]);
      setCategories([]);
      setMarketSentiment({ bullish: 0, bearish: 0, neutral: 0 });
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const refreshInterval = setInterval(fetchNews, 3600000);
    return () => clearInterval(refreshInterval);
  }, [fetchNews]);


  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "bullish": return "text-green-400 bg-green-400/10";
      case "bearish": return "text-red-400 bg-red-400/10";
      case "neutral": return "text-blue-400 bg-blue-400/10";
      default: return "text-yellow-400 bg-yellow-400/10";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "bullish": return <TrendingUp className="h-4 w-4" />;
      case "bearish": return <TrendingDown className="h-4 w-4" />;
      case "neutral": return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStockImpactColor = (impact: string) => {
    return impact === "positive" ? "text-green-400 bg-green-400/10" : impact === "negative" ? "text-red-400 bg-red-400/10" : "text-slate-400 bg-slate-400/10";
  };

  const filteredNews = newsArticles
    .filter(news => {
      const matchesCategory = selectedCategory === "all" ||
        (selectedCategory === "bullish" && news.impact === "bullish") ||
        (selectedCategory === "bearish" && news.impact === "bearish") ||
        (selectedCategory === "sector" && news.impact === "sector-specific") ||
        (selectedCategory === "neutral" && news.impact === "neutral");

      const matchesSearch = searchQuery === "" ||
        news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.affectedSectors.some(sector => sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        news.affectedStocks.some(stock => stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || stock.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => a.priority - b.priority);


  const toggleSaveNews = (id: string) => {
    setSavedNews(prev =>
      prev.includes(id) ? prev.filter(newsId => newsId !== id) : [...prev, id]
    );
  };

  const toggleExpandStocks = (id: string) => {
    setExpandedStocks(prev =>
      prev.includes(id) ? prev.filter(newsId => newsId !== id) : [...prev, id]
    );
  };

  const openNewsArticle = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Newspaper className="h-6 w-6 mr-2" />
            AI News Summarizer
          </h1>
          <p className="text-slate-400 mt-1">
            Understand how global events create butterfly effects in financial markets
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Set Alerts
        </Button>
      </div>

      {/* Daily Summary Digest */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-400" />
            📰 Today's Market Movers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNews ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-400">Analyzing market digest...</span>
            </div>
          ) : newsError ? (
            <p className="text-red-400 text-sm text-center">Error loading digest: {newsError}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-300 text-sm">
                Top events shaping markets today: {newsArticles.slice(0, 3).map(news => news.title.split(':')[0]).join(', ')}.
                Key sectors affected include {Array.from(new Set(newsArticles.flatMap(n => n.affectedSectors))).slice(0, 3).join(', ')}.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-green-400">{marketSentiment.bullish}%</div>
                  <div className="text-slate-400 text-xs">Bullish</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-400">{marketSentiment.bearish}%</div>
                  <div className="text-slate-400 text-xs">Bearish</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-400">{marketSentiment.neutral}%</div>
                  <div className="text-slate-400 text-xs">Neutral/Sector</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search news, sectors, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id
                ? "bg-green-600 hover:bg-green-700"
                : "border-slate-600 text-slate-300 hover:bg-slate-800"
              }
            >
              {category.name}
              <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div className="grid gap-6">
        {loadingNews ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Fetching and analyzing news...</h3>
              <p className="text-slate-400 text-sm">This might take a moment due to AI processing.</p>
            </CardContent>
          </Card>
        ) : newsError ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Error loading news</h3>
              <p className="text-red-400 text-sm">{newsError}</p>
              <p className="text-slate-400 text-sm mt-2">Please check your API keys or try again later.</p>
            </CardContent>
          </Card>
        ) : filteredNews.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No news found</h3>
              <p className="text-slate-400 text-sm">
                Try adjusting your search terms or category filters
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNews.map((news) => (
            <Card key={news.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 border-0">
                        Priority {news.priority}
                      </Badge>
                      {news.affectedSectors.slice(0, 2).map(sector => (
                        <Badge key={sector} variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {sector}
                        </Badge>
                      ))}
                    </div>

                    <CardTitle
                      className="text-white text-lg mb-2 cursor-pointer hover:text-green-400 transition-colors"
                      onClick={() => openNewsArticle(news.sourceUrl)}
                    >
                      {news.title}
                      <ExternalLink className="inline h-4 w-4 ml-1 opacity-60" />
                    </CardTitle>

                    <p className="text-slate-300 text-sm mb-3">{news.summary}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {news.timestamp}
                        </div>
                        <div className="flex items-center">
                          <span className="text-slate-500">|</span>
                          <span className="ml-2">{news.source}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSaveNews(news.id)}
                        className={`h-8 w-8 p-0 ${savedNews.includes(news.id) ? 'text-yellow-400' : 'text-slate-400'}`}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Badge className={`${getImpactColor(news.impact)} border-0 flex items-center gap-1`}>
                    {getImpactIcon(news.impact)}
                    {news.impact === "sector-specific" ? "Sector" : news.impact}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {/* AI Analysis & Butterfly Effect */}
                <div className="space-y-4">
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                      AI Market Impact Analysis
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed mb-3">
                      {news.aiAnalysis}
                    </p>
                    <div className="bg-slate-900 p-3 rounded border-l-4 border-blue-400">
                      <h5 className="text-blue-400 font-medium text-sm mb-1">🦋 Butterfly Effect Chain:</h5>
                      <p className="text-slate-300 text-sm">{news.butterflyEffect}</p>
                    </div>
                  </div>

                  {/* Affected Stocks Toggle */}
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandStocks(news.id)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full justify-between"
                    >
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        View Affected Stocks ({news.affectedStocks.length})
                      </span>
                      {expandedStocks.includes(news.id) ?
                        <ChevronUp className="h-4 w-4" /> :
                        <ChevronDown className="h-4 w-4" />
                      }
                    </Button>

                    {expandedStocks.includes(news.id) && (
                      <div className="grid gap-3">
                        <h4 className="text-white font-medium text-sm">Top 5 Affected Stocks:</h4>
                        {news.affectedStocks.slice(0, 5).map((stock, index) => (
                          <div key={stock.symbol} className="bg-slate-800 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-bold text-white">{index + 1}</div>
                                <div>
                                  <div className="font-semibold text-white">{stock.symbol}</div>
                                  <div className="text-sm text-slate-400">{stock.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={`${getStockImpactColor(stock.impact)} border-0 mb-1`}>
                                  {stock.impact === "positive" ? "↗" : "↘"} {stock.impact}
                                </Badge>
                                <div className="text-sm text-slate-400">
                                  {stock.confidence}% confidence
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-300">
                              <span className="text-blue-400">Sector:</span> {stock.sector}
                            </div>
                            <div className="text-sm text-slate-300 mt-1">
                              <span className="text-blue-400">Impact Reason:</span> {stock.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsAnalyzer;