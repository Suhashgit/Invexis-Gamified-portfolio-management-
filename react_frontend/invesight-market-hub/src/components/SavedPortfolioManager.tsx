import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner for toasts

// Corrected interface: Added sharpeRatio and maxDrawdown
interface SavedPortfolio {
  id: string;
  name: string;
  weights: { [key: string]: number };
  selectedStocks: string[];
  createdAt: Date;
  expectedReturn?: number; 
  riskCategory?: string;    
  sharpeRatio?: number;     // FIX: Added sharpeRatio
  maxDrawdown?: number;     // FIX: Added maxDrawdown
}

interface SavedPortfolioManagerProps {
  currentWeights: { [key: string]: number };
  currentStocks: string[];
  onLoadPortfolio: (weights: { [key: string]: number }, stocks: string[]) => void;
  // Pass current stats to save with the portfolio (this interface aligns with BackendPortfolioStats from api.py)
  currentPortfolioStats: { 
    expectedReturn: number; 
    riskCategory: string; 
    sharpeRatio: number;
    maxDrawdown: number;
  } | null;
}

export const SavedPortfolioManager = ({ 
  currentWeights, 
  currentStocks, 
  onLoadPortfolio,
  currentPortfolioStats 
}: SavedPortfolioManagerProps) => {
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [portfolioName, setPortfolioName] = useState("");
  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  const savePortfolio = () => {
    if (!portfolioName.trim()) {
      toast.error("Please enter a portfolio name");
      return;
    }

    const totalWeight = Object.values(currentWeights).reduce((sum, w) => sum + w, 0);
    const hasValidWeights = Math.abs(totalWeight - 1.0) < 0.001;
    
    if (!hasValidWeights) {
      toast.error("Portfolio weights must sum to 1.0 (or very close).");
      return;
    }

    if (!currentPortfolioStats) { // Ensure stats are available before saving
        toast.error("Portfolio stats not available yet. Please run simulation first.");
        return;
    }

    // Check for duplicate name
    if (savedPortfolios.some(p => p.name.toLowerCase() === portfolioName.trim().toLowerCase())) {
        toast.error("A portfolio with this name already exists.");
        return;
    }

    const newPortfolio: SavedPortfolio = {
      id: Date.now().toString(), // Simple unique ID
      name: portfolioName.trim(),
      weights: { ...currentWeights },
      selectedStocks: [...currentStocks],
      createdAt: new Date(),
      expectedReturn: currentPortfolioStats.expectedReturn, 
      riskCategory: currentPortfolioStats.riskCategory,     
      sharpeRatio: currentPortfolioStats.sharpeRatio,       // FIX: Now correctly assigned
      maxDrawdown: currentPortfolioStats.maxDrawdown        // FIX: Now correctly assigned
    };

    setSavedPortfolios(prev => [...prev, newPortfolio]);
    setPortfolioName("");
    setIsDialogOpen(false);
    toast.success(`Portfolio "${newPortfolio.name}" saved successfully!`);
  };

  const loadPortfolio = (portfolio: SavedPortfolio) => {
    onLoadPortfolio(portfolio.weights, portfolio.selectedStocks);
    toast.success(`Portfolio "${portfolio.name}" loaded!`);
  };

  const deletePortfolio = (id: string) => {
    setSavedPortfolios(prev => prev.filter(p => p.id !== id));
    setSelectedPortfolios(prev => prev.filter(pId => pId !== id)); // Remove from compare list if deleted
    toast.success("Portfolio deleted");
  };

  const canSave = currentStocks.length > 0 && 
    Math.abs(Object.values(currentWeights).reduce((sum, w) => sum + w, 0) - 1.0) < 0.001;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Saved Portfolios
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSave}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-600">
                <DialogHeader>
                  <DialogTitle className="text-white">Save Portfolio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Portfolio name"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={savePortfolio}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Portfolio
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savedPortfolios.length < 2}
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-600 max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Compare Portfolios</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select value={selectedPortfolios[0] || ""} onValueChange={(value) => 
                      setSelectedPortfolios(prev => [value, prev[1]].filter(Boolean))
                    }>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select first portfolio" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {savedPortfolios.map(portfolio => (
                          <SelectItem key={portfolio.id} value={portfolio.id}>
                            {portfolio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedPortfolios[1] || ""} onValueChange={(value) => 
                      setSelectedPortfolios(prev => [prev[0], value].filter(Boolean))
                    }>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select second portfolio" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {savedPortfolios
                          .filter(p => p.id !== selectedPortfolios[0])
                          .map(portfolio => (
                            <SelectItem key={portfolio.id} value={portfolio.id}>
                              {portfolio.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPortfolios.length === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPortfolios.map(id => {
                        const portfolio = savedPortfolios.find(p => p.id === id);
                        if (!portfolio) return null;
                        return (
                          <Card key={id} className="bg-slate-700 border-slate-600">
                            <CardHeader>
                              <CardTitle className="text-white text-lg">{portfolio.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">Expected Return:</span>
                                  <span className="text-green-400 font-semibold">
                                    {((portfolio.expectedReturn || 0) * 100).toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">Risk Category:</span>
                                  <Badge className="bg-slate-600 text-white">
                                    {portfolio.riskCategory}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">Sharpe Ratio:</span>
                                  <span className="text-blue-400 font-semibold">
                                    {(portfolio.sharpeRatio || 0).toFixed(2)} {/* FIX: Access sharpeRatio */}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">Max Drawdown:</span>
                                  <span className="text-orange-400 font-semibold">
                                    {((portfolio.maxDrawdown || 0) * 100).toFixed(2)}% {/* FIX: Access maxDrawdown */}
                                  </span>
                                </div>
                                <div className="mt-4">
                                  <span className="text-slate-300 text-sm">Holdings:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {portfolio.selectedStocks.map(stock => (
                                      <Badge key={stock} variant="secondary" className="text-xs">
                                        {stock}: {(portfolio.weights[stock] * 100).toFixed(1)}%
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedPortfolios.length === 0 ? (
          <div className="text-center py-8">
            <Save className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No saved portfolios yet</p>
            <p className="text-sm text-slate-500 mt-2">Create a portfolio to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPortfolios.map(portfolio => ( // FIX: Map function is now correct
              <div key={portfolio.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{portfolio.name}</h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-slate-400">
                      {portfolio.selectedStocks.length} stocks
                    </span>
                    <span className="text-sm text-green-400">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {((portfolio.expectedReturn || 0) * 100).toFixed(1)}%
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {portfolio.riskCategory}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPortfolio(portfolio)}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    Load
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePortfolio(portfolio.id)}
                    className="bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};