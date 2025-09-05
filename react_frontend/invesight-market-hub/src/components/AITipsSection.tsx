import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, TrendingUp, Shield, AlertTriangle } from "lucide-react";

interface AITip {
  id: string;
  type: 'optimization' | 'risk' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

// Corrected interface: Added maxDrawdown
interface AITipsSectionProps {
  selectedStocks: string[];
  weights: { [key: string]: number };
  portfolioStats?: { 
    expectedReturn: number;
    standardDeviation: number;
    sharpeRatio: number;
    maxDrawdown: number; // FIX: Added maxDrawdown
    riskCategory: string;
  } | null;
}

export const AITipsSection = ({ selectedStocks, weights, portfolioStats }: AITipsSectionProps) => {
  const [tips, setTips] = useState<AITip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateTips = () => {
    setIsLoading(true);
    
    // Simulate AI analysis delay
    setTimeout(() => {
      const newTips: AITip[] = [];
      
      if (portfolioStats) {
        // Diversification analysis
        if (selectedStocks.length < 3) {
          newTips.push({
            id: 'diversification',
            type: 'risk',
            title: 'Consider More Diversification',
            description: 'Your portfolio has limited diversification. Consider adding stocks from different sectors to reduce risk.',
            impact: 'high',
            actionable: true
          });
        }
        
        // Concentration risk
        const maxWeight = Math.max(...Object.values(weights));
        if (maxWeight > 0.4) {
          const concentratedStock = Object.entries(weights).find(([_, weight]) => weight === maxWeight)?.[0];
          if (concentratedStock) { 
            newTips.push({
              id: 'concentration',
              type: 'risk',
              title: 'High Concentration Risk',
              description: `${concentratedStock} represents ${(maxWeight * 100).toFixed(1)}% of your portfolio. Consider reducing this concentration.`,
              impact: 'high',
              actionable: true
            });
          }
        }
        
        // Sector recommendations (example logic based on hardcoded symbols)
        const techStocks = selectedStocks.filter(stock => ['AAPL', 'MSFT', 'GOOG', 'NVDA', 'TSLA'].includes(stock));
        if (techStocks.length > selectedStocks.length * 0.6) {
          newTips.push({
            id: 'sector-balance',
            type: 'optimization',
            title: 'Tech Sector Overweight',
            description: 'Your portfolio is heavily weighted in tech. Consider adding defensive stocks like PG or KO to balance.',
            impact: 'medium',
            actionable: true
          });
        }
        
        // Sharpe ratio optimization
        if (portfolioStats.sharpeRatio < 0.8 && portfolioStats.sharpeRatio > 0) {
          newTips.push({
            id: 'sharpe-optimization',
            type: 'optimization',
            title: 'Improve Risk-Adjusted Returns',
            description: `Your Sharpe ratio of ${portfolioStats.sharpeRatio.toFixed(2)} suggests potential for improvement. Adjust allocation towards higher-performing, lower-risk assets.`,
            impact: 'medium',
            actionable: true
          });
        } else if (portfolioStats.sharpeRatio >= 1.0) {
            newTips.push({
              id: 'sharpe-good',
              type: 'optimization',
              title: 'Strong Risk-Adjusted Returns',
              description: `Excellent! Your Sharpe ratio of ${portfolioStats.sharpeRatio.toFixed(2)} indicates a well-balanced portfolio for risk and return.`,
              impact: 'low',
              actionable: false
            });
        }

        // High Volatility Warning
        if (portfolioStats.riskCategory === 'Aggressive' && portfolioStats.standardDeviation > 0.20) {
            newTips.push({
                id: 'high-volatility',
                type: 'risk',
                title: 'High Volatility Detected',
                description: `Your portfolio's annualized volatility is ${ (portfolioStats.standardDeviation * 100).toFixed(1)}%. Be prepared for potentially significant price swings.`,
                impact: 'high',
                actionable: false
            });
        }

        // Max Drawdown Warning (Now `maxDrawdown` property exists)
        if (portfolioStats.maxDrawdown > 0.25) { 
            newTips.push({
                id: 'max-drawdown-warning',
                type: 'risk',
                title: 'Significant Potential Drawdown',
                description: `Your portfolio's maximum historical drawdown simulated was ${ (portfolioStats.maxDrawdown * 100).toFixed(1)}%. Ensure this aligns with your risk tolerance.`,
                impact: 'high',
                actionable: false
            });
        }
        
        // Growth opportunity (example specific stock tip)
        if (selectedStocks.includes('NVDA') && (weights['NVDA'] || 0) > 0.2) {
          newTips.push({
            id: 'growth-opportunity',
            type: 'opportunity',
            title: 'AI/Tech Growth Exposure',
            description: 'Your NVDA position captures the AI growth trend. Monitor for volatility and consider taking profits at highs.',
            impact: 'medium',
            actionable: false
          });
        }
        
        // Value stocks recommendation
        if (!selectedStocks.some(stock => ['JPM', 'GS', 'PG', 'KO', 'PEP'].includes(stock))) {
          newTips.push({
            id: 'value-stocks',
            type: 'opportunity',
            title: 'Consider Value Stocks',
            description: 'Adding value stocks like JPM or PG could provide stability and dividend income to your growth-focused portfolio.',
            impact: 'low',
            actionable: true
          });
        }
      }
      
      setTips(newTips);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const hasValidWeights = selectedStocks.length > 0 && Math.abs(totalWeight - 1.0) < 0.001;

    if (hasValidWeights && portfolioStats) {
      generateTips();
    } else {
      setTips([]);
    }
  }, [selectedStocks, weights, portfolioStats]);

  const getTypeIcon = (type: AITip['type']) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <Shield className="h-4 w-4" />;
      case 'opportunity': return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: AITip['type']) => {
    switch (type) {
      case 'optimization': return 'bg-blue-900/20 text-blue-400 border-blue-500/50';
      case 'risk': return 'bg-red-900/20 text-red-400 border-red-500/50';
      case 'opportunity': return 'bg-green-900/20 text-green-400 border-green-500/50';
    }
  };

  const getImpactColor = (impact: AITip['impact']) => {
    switch (impact) {
      case 'high': return 'bg-red-900/20 text-red-400';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400';
      case 'low': return 'bg-green-900/20 text-green-400';
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            <span>AI Portfolio Tips</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateTips}
            disabled={isLoading || selectedStocks.length === 0 || !portfolioStats}
            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : tips.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">Allocate weights (summing to 1.0) and run simulation to get AI-powered tips</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tips.map(tip => (
              <div key={tip.id} className="p-4 bg-slate-800 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(tip.type)}
                    <h4 className="text-white font-medium">{tip.title}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getTypeColor(tip.type)} border text-xs`}>
                      {tip.type}
                    </Badge>
                    <Badge className={`${getImpactColor(tip.impact)} text-xs`}>
                      {tip.impact}
                    </Badge>
                  </div>
                </div>
                <p className="text-slate-300 text-sm">{tip.description}</p>
                {tip.actionable && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};