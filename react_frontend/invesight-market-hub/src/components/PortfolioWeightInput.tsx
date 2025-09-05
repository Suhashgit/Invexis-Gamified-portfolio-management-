import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Shuffle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PortfolioWeights {
  [key: string]: number;
}

interface PortfolioWeightInputProps {
  selectedStocks: string[];
  weights: PortfolioWeights; // Current weights managed by parent
  onWeightsChange: (weights: PortfolioWeights) => void; // Callback to parent
}

export const PortfolioWeightInput = ({ selectedStocks, weights, onWeightsChange }: PortfolioWeightInputProps) => {
  const [localWeights, setLocalWeights] = useState<PortfolioWeights>(weights); // Internal state for controlled input
  const [totalWeight, setTotalWeight] = useState(0);

  // Update localWeights when parent's weights prop changes (e.g., initial load, optimal weights applied)
  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  // Recalculate totalWeight whenever localWeights change
  useEffect(() => {
    const total = Object.values(localWeights).reduce((sum, weight) => sum + weight, 0);
    setTotalWeight(total);
  }, [localWeights]);

  const handleWeightChange = (stock: string, value: string) => {
    const numValue = parseFloat(value); // Parse directly, allow NaN for empty input
    const newWeights = { ...localWeights, [stock]: isNaN(numValue) ? 0 : numValue }; // Treat NaN as 0
    setLocalWeights(newWeights);
    onWeightsChange(newWeights); // Propagate change to parent
  };

  const generateRandomWeights = () => {
    const randomWeights: PortfolioWeights = {};
    const values = selectedStocks.map(() => Math.random());
    const sum = values.reduce((a, b) => a + b, 0);
    
    if (sum === 0) { // Avoid division by zero if all random values happen to be 0
        selectedStocks.forEach(stock => randomWeights[stock] = 1 / selectedStocks.length);
    } else {
        selectedStocks.forEach((stock, index) => {
            // Round to 2 decimal places to get realistic percentages for sum to 1
            randomWeights[stock] = Math.round((values[index] / sum) * 100) / 100;
        });

        // Small adjustment to ensure sum is exactly 1.0 due to rounding
        const currentTotal = Object.values(randomWeights).reduce((sum, weight) => sum + weight, 0);
        const diff = 1.0 - currentTotal;
        if (selectedStocks.length > 0 && Math.abs(diff) > 0.001) { // Apply adjustment if needed
            randomWeights[selectedStocks[0]] = Math.round((randomWeights[selectedStocks[0]] + diff) * 100) / 100;
        }
    }

    setLocalWeights(randomWeights);
    onWeightsChange(randomWeights); // Propagate change to parent
  };

  const resetWeights = () => {
    const emptyWeights: PortfolioWeights = {};
    selectedStocks.forEach(stock => {
      emptyWeights[stock] = 0;
    });
    setLocalWeights(emptyWeights);
    onWeightsChange(emptyWeights); // Propagate change to parent
  };

  const isValidTotal = Math.abs(totalWeight - 1.0) < 0.001; // Check if total is very close to 1.0

  if (selectedStocks.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">Select stocks to begin portfolio allocation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Portfolio Weight Allocation
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateRandomWeights}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Random
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetWeights}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Reset
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-400 mb-4">
          Budget: <span className="text-white font-semibold">$100,000</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedStocks.map((stock) => (
            <div key={stock} className="space-y-2">
              <Label htmlFor={`weight-${stock}`} className="text-white">{stock}</Label>
              <Input
                id={`weight-${stock}`}
                type="number"
                step="0.01" // Allow 0.01 increments
                value={localWeights[stock] || 0} // Display 0 if value is undefined/null
                onChange={(e) => handleWeightChange(stock, e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="0.00"
              />
              <div className="text-xs text-slate-400">
                ${((localWeights[stock] || 0) * 100000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
            <span className="text-white">Total Weight:</span>
            <span className={`font-semibold ${isValidTotal ? 'text-green-400' : 'text-red-400'}`}>
              {totalWeight.toFixed(3)}
            </span>
          </div>
          {!isValidTotal && (
            <Alert className="bg-red-900/20 border-red-500/50 flex items-center p-2 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="text-red-400">
                Total must equal 1.0
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};