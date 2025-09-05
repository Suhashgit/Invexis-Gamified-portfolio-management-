import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Updated interface to match BackendPortfolioStats from api.py
interface PortfolioStats {
  expectedReturn: number;
  standardDeviation: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskCategory: 'Conservative' | 'Moderate' | 'Aggressive' | string; // Allow string for safety if backend sends unexpected
  optimalWeights: { [key: string]: number }; // This is present but not used directly in this panel
}

interface PortfolioStatsPanelProps {
  stats: PortfolioStats | null;
  isLoading?: boolean;
}

export const PortfolioStatsPanel = ({ stats, isLoading }: PortfolioStatsPanelProps) => {
  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Conservative': return 'bg-green-900/20 text-green-400 border-green-500/50';
      case 'Moderate': return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50';
      case 'Aggressive': return 'bg-red-900/20 text-red-400 border-red-500/50';
      default: return 'bg-slate-900/20 text-slate-400 border-slate-500/50';
    }
  };

  const formatPercent = (value: number) => {
      if (value === null || isNaN(value) || !isFinite(value)) return "N/A";
      return `${(value * 100).toFixed(2)}%`;
  };
  const formatRatio = (value: number) => {
      if (value === null || isNaN(value) || !isFinite(value)) return "N/A";
      return value.toFixed(2);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Portfolio Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Portfolio Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">Allocate weights (summing to 1.0) to see statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Portfolio Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-white font-medium">Expected Return</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Projected annual return based on Monte Carlo simulations.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatPercent(stats.expectedReturn)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-white font-medium">Volatility</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Annualized standard deviation of returns (higher = more volatile).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {formatPercent(stats.standardDeviation)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span className="text-white font-medium">Sharpe Ratio</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Risk-adjusted return (higher is better, &gt;1 is generally good). Assumes 2% risk-free rate.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {formatRatio(stats.sharpeRatio)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-white font-medium">Max Drawdown</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Largest peak-to-trough decline in simulated portfolio value.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {formatPercent(stats.maxDrawdown)}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Risk Category</span>
            <Badge className={`${getRiskColor(stats.riskCategory)} border`}>
              {stats.riskCategory}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};