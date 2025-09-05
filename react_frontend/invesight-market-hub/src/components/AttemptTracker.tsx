import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, RotateCcw, Award, Target } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used for toasts

interface AttemptTrackerProps {
  selectedStocks: string[];
  weights: { [key: string]: number };
  portfolioStats?: { expectedReturn: number; } | null; // Pass expectedReturn from parent
}

export const AttemptTracker = ({ selectedStocks, weights, portfolioStats }: AttemptTrackerProps) => {
  const [attemptCount, setAttemptCount] = useState(0);
  const [bestAttempt, setBestAttempt] = useState<{
    weights: { [key: string]: number };
    stocks: string[];
    expectedReturn: number;
  } | null>(null);

  // Effect to track attempts and best portfolio
  useEffect(() => {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const hasValidWeights = selectedStocks.length > 0 && Math.abs(totalWeight - 1.0) < 0.001;
    
    // Only count attempt and update best if portfolio is valid and we have stats with an expected return
    if (hasValidWeights && portfolioStats && portfolioStats.expectedReturn != null) {
      setAttemptCount(prev => prev + 1);
      
      const currentExpectedReturn = portfolioStats.expectedReturn; // Use real expected return from backend
      
      if (!bestAttempt || currentExpectedReturn > bestAttempt.expectedReturn) {
        setBestAttempt({
          weights: { ...weights },
          stocks: [...selectedStocks],
          expectedReturn: currentExpectedReturn
        });
      }
      
      // Show encouraging messages based on attempt count
      if (attemptCount > 0) { // Only show messages after the very first valid attempt
        const messages = [
          `Great! You've tested ${attemptCount + 1} combinations!`,
          `Keep exploring! ${attemptCount + 1} portfolios analyzed.`,
          `You're getting better! ${attemptCount + 1} attempts completed.`,
          `Nice work! ${attemptCount + 1} different allocations tried.`
        ];
        
        // Show toast every 3 attempts (excluding the first few)
        if ((attemptCount + 1) % 3 === 0 && (attemptCount + 1) > 2) {
          toast.success(messages[Math.floor(Math.random() * messages.length)]);
        }
      }
    }
  }, [weights, selectedStocks, portfolioStats, attemptCount, bestAttempt]); // Add attemptCount, bestAttempt for stable deps

  const resetTracker = () => {
    setAttemptCount(0);
    setBestAttempt(null);
    toast.success("Tracker reset!");
  };

  const getMotivationalMessage = () => {
    if (attemptCount === 0) return "Start exploring portfolios by entering weights!";
    if (attemptCount < 3) return "Keep experimenting to find what works!";
    if (attemptCount < 5) return "You're getting the hang of it!";
    if (attemptCount < 10) return "Great exploration! Every attempt is a learning.";
    return "You're becoming a portfolio master!";
  };

  const getAchievementBadge = () => {
    if (attemptCount >= 10) return { text: "Explorer", color: "bg-purple-900/20 text-purple-400 border-purple-500/50" };
    if (attemptCount >= 5) return { text: "Analyst", color: "bg-blue-900/20 text-blue-400 border-blue-500/50" };
    if (attemptCount >= 3) return { text: "Learner", color: "bg-green-900/20 text-green-400 border-green-500/50" };
    return { text: "Beginner", color: "bg-slate-900/20 text-slate-400 border-slate-500/50" };
  };

  const achievement = getAchievementBadge();

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Attempts:</span>
              <span className="text-2xl font-bold text-blue-400">{attemptCount}</span>
            </div>
            
            <Badge className={`${achievement.color} border`}>
              <Award className="h-3 w-3 mr-1" />
              {achievement.text}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {bestAttempt && (
              <div className="text-right">
                <div className="text-xs text-slate-400">Best Return</div>
                <div className="text-green-400 font-semibold">
                  {(bestAttempt.expectedReturn * 100).toFixed(2)}%
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetTracker}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Tracker
            </Button>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-slate-400">
          {getMotivationalMessage()}
        </div>
        
        {bestAttempt && (
          <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-white font-medium">Best Portfolio Found So Far</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {bestAttempt.stocks.map(stock => (
                <Badge key={stock} variant="secondary" className="text-xs">
                  {stock}: {(bestAttempt.weights[stock] * 100).toFixed(1)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};