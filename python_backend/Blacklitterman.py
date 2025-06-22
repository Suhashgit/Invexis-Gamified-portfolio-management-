import yfinance as yf
import numpy as np
import pandas as pd

def get_implied_equilibrium_returns(symbols: list[str], period: str = "1y", risk_aversion: float = 2.5):
    # Download data
    data = yf.download(symbols, period=period, group_by='ticker', auto_adjust=True)

    # Handle price extraction safely
    if len(symbols) == 1:
        # Single symbol: access using multi-level column (ticker, 'Close')
        prices = data[(symbols[0], 'Close')]
        prices.name = symbols[0]
        prices = prices.to_frame()
    else:
        # Multi-symbol: multi-index columns like ('Close', 'AAPL')
        # Correctly extract 'Close' prices for multiple symbols
        prices = pd.concat([data[(sym, 'Close')] for sym in symbols], axis=1)
        prices.columns = symbols

    # Compute log returns
    returns = np.log(prices / prices.shift(1)).dropna()

    # Market caps
    market_caps = {}
    for sym in symbols:
        try:
            market_caps[sym] = yf.Ticker(sym).info.get("marketCap", 1)
        except Exception:
            market_caps[sym] = 1

    # Weights
    total_cap = sum(market_caps.values())
    weights = {k: v / total_cap for k, v in market_caps.items()}
    weights_vector = np.array([weights[sym] for sym in symbols])

    # Cov matrix or variance
    # Ensure cov_matrix is a 2D array if there's only one symbol for consistent matrix multiplication
    if len(symbols) == 1:
        cov_matrix = np.array([[returns.var()]])
    else:
        cov_matrix = returns.cov()

    # Implied returns
    if len(symbols) == 1:
        # For a single stock, implied_returns will be a scalar or a 1x1 array
        implied_returns = risk_aversion * cov_matrix[0,0] * 1 # Access the single variance value
    else:
        implied_returns = risk_aversion * cov_matrix @ weights_vector

    return implied_returns






  
    
    
    
    


