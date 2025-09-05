import yfinance as yf
import numpy as np
import pandas as pd
import requests # Still needed for standalone test block
import os
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
from typing import Union, Dict, List
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Ensure NLTK vader_lexicon is downloaded
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError: # Corrected to LookupError to trigger download if missing
    nltk.download('vader_lexicon')

# Set seed for langdetect for consistent results
DetectorFactory.seed = 0

# Load environment variables (for News API Key within this module if used standalone)
load_dotenv()
# NEWSAPI_API_KEY_FROM_ENV is now primarily for the standalone test block of blacklitterman.py
NEWSAPI_API_KEY_FROM_ENV = os.getenv("NEWSAPI_API_KEY")

if not NEWSAPI_API_KEY_FROM_ENV:
    # This warning is for when blacklitterman.py is run directly, not when imported by main.py
    print("WARNING: NEWSAPI_API_KEY not found in .env. Sentiment views may be limited for standalone testing.")


# Removed fetch_news from here as it's now handled by main.py for integrated app
# It's kept below within the if __name__ == "__main__" block for standalone testing.


def analyze_sentiment_vader(headlines: List[str]) -> float:
    """
    Analyzes the sentiment of a list of headlines using VADER and returns the average compound score.
    """
    sia = SentimentIntensityAnalyzer()
    if not headlines:
        return 0.0 # Neutral sentiment if no headlines

    scores = [sia.polarity_scores(title)['compound'] for title in headlines]
    return np.mean(scores)

def get_implied_equilibrium_returns_and_cov(symbols: List[str], period: str = "10y", risk_aversion: float = 2.5):
    """
    Downloads historical data, calculates market-implied equilibrium returns (Pi)
    and the covariance matrix (Sigma) for a given set of symbols.

    Args:
        symbols: List of stock ticker symbols.
        period: Historical data period (e.g., "1y", "6mo").
        risk_aversion: Scalar risk aversion coefficient for calculating Pi.

    Returns:
        A tuple: (implied_returns_daily: np.ndarray, cov_matrix_daily: np.ndarray, final_symbols: List[str])
        final_symbols returns the list of symbols that actually had valid data.
    """
    print(f"Downloading historical data for {symbols} over {period} using yfinance...")
    
    # Use group_by='ticker' for multi-symbol downloads to get MultiIndex columns
    # auto_adjust=True uses Adjusted Close, which is generally preferred.
    data = yf.download(symbols, period=period, group_by='ticker', auto_adjust=True)

    prices = pd.DataFrame()
    successful_symbols = []
    
    # Robust extraction from MultiIndex DataFrame (or flat for single symbol)
    for sym in symbols:
        try:
            if isinstance(data.columns, pd.MultiIndex): # Multi-symbol download
                if (sym, 'Adj Close') in data.columns and not data[(sym, 'Adj Close')].empty:
                    prices[sym] = data[(sym, 'Adj Close')]
                elif (sym, 'Close') in data.columns and not data[(sym, 'Close')].empty: # Fallback to 'Close'
                    prices[sym] = data[(sym, 'Close')]
                else:
                    raise KeyError(f"No valid 'Adj Close' or 'Close' data found for {sym} in MultiIndex.")
            else: # Single symbol download (columns are not MultiIndex)
                if 'Adj Close' in data.columns and not data['Adj Close'].empty:
                    prices[sym] = data['Adj Close']
                elif 'Close' in data.columns and not data['Close'].empty: # Fallback to 'Close'
                    prices[sym] = data['Close']
                else:
                    raise KeyError(f"No valid 'Adj Close' or 'Close' data found for single symbol {sym}.")
            
            successful_symbols.append(sym)
        except KeyError as e:
            print(f"WARNING: Skipping '{sym}' due to missing or empty data: {e}")
            # Do not re-raise, allow other symbols to be processed

    if not successful_symbols:
        raise ValueError("No valid stock data found for any of the provided symbols.")

    prices = prices[successful_symbols].dropna()
    
    if prices.empty or len(prices) < 2:
        raise ValueError(f"Not enough historical data for {successful_symbols} to calculate returns (need at least 2 data points after dropping NaNs).")

    returns = np.log(prices / prices.shift(1)).dropna()

    if returns.empty:
        raise ValueError(f"Not enough valid returns for {successful_symbols} to calculate covariance.")
    
    returns = returns[successful_symbols] # Ensure returns DataFrame contains only successful symbols
    
    final_symbols = successful_symbols 
    num_assets = len(final_symbols)

    cov_matrix_daily = returns.cov()

    # DEBUG PRINT: Check the covariance matrix values
    print("\n--- DEBUG COVARIANCE MATRIX ---")
    print(f"Shape of cov_matrix_daily: {cov_matrix_daily.shape}")
    print(f"Diagonal (variances) of cov_matrix_daily: {np.diag(cov_matrix_daily.values)}")
    print(f"Sample cov_matrix_daily:\n{cov_matrix_daily.head()}") # Print first few rows/cols


    # Estimate market cap weights for implied equilibrium returns (Pi)
    market_caps = []
    try:
        all_market_caps_found = True
        for sym in final_symbols: # Use the filtered symbols list
            ticker_info = yf.Ticker(sym).info
            market_cap = ticker_info.get('marketCap')
            if market_cap:
                market_caps.append(market_cap)
            else:
                print(f"Warning: Could not get market cap for {sym}. Using average historical return as approximation for Pi.")
                all_market_caps_found = False
                break
        
        if all_market_caps_found and market_caps: 
            market_cap_weights = np.array(market_caps) / np.sum(market_caps)
            implied_returns_daily = risk_aversion * cov_matrix_daily.values @ market_cap_weights.reshape(-1, 1)
        else:
            print("Using average historical returns as placeholder for implied equilibrium returns due to missing market caps.")
            implied_returns_daily = np.full((num_assets, 1), returns.mean().mean())

    except Exception as e:
        print(f"Error fetching market caps for Pi calculation: {e}. Using average historical returns as placeholder.")
        implied_returns_daily = np.full((num_assets, 1), returns.mean().mean())

    return implied_returns_daily, cov_matrix_daily.values, final_symbols # RETURN `final_symbols`

def get_sentiment_based_views(
    symbols: List[str],
    cov_matrix: np.ndarray,
    headlines_dict: Dict[str, List[str]] # FIX: Added this parameter to accept pre-fetched headlines
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Generates Black-Litterman P, Q, and Omega matrices based on sentiment analysis.
    It now accepts pre-fetched headlines, centralizing external API calls in main.py.

    Args:
        symbols: List of stock ticker symbols.
        cov_matrix: The covariance matrix of asset returns.
        headlines_dict: Dictionary of {symbol: [list of headlines]} provided externally.
    Returns:
        A tuple: (P_matrix: np.ndarray, Q_vector: np.ndarray, Omega_matrix: np.ndarray)
    """
    if not symbols:
        return np.empty((0, 0)), np.empty((0, 1)), np.empty((0, 0))

    sentiment_results = {}
    
    # Use the provided headlines_dict directly instead of calling fetch_news() internally
    for symbol in symbols:
        headlines = headlines_dict.get(symbol, []) # Use headlines_dict here
        sentiment_scores = analyze_sentiment_vader(headlines)
        sentiment_results[symbol] = sentiment_scores
        print(f"Sentiment for {symbol}: {sentiment_scores:.4f}")

    ticker_index = {sym: i for i, sym in enumerate(symbols)}
    P_list = []
    Q_list = []
    
    sentiment_diff_threshold = 0.10
    tau_for_omega_calc = 0.025
    sentiment_to_return_factor = 0.001

    print(f"\n--- DEBUG VIEW GENERATION ---")
    print(f"Symbols being processed for views: {symbols}")
    print(f"Sentiment results: {sentiment_results}")
    print(f"Sentiment diff threshold: {sentiment_diff_threshold}")
    
    if len(symbols) > 1:
        base_stock_sym = symbols[0]
        base_stock_sentiment = sentiment_results.get(base_stock_sym, 0.0)
        print(f"Base stock for views: {base_stock_sym} (Sentiment: {base_stock_sentiment})")

        for i in range(1, len(symbols)):
            current_sym = symbols[i]
            current_sentiment = sentiment_results.get(current_sym, 0.0)
            sentiment_diff = current_sentiment - base_stock_sentiment

            print(f"Comparing {current_sym} ({current_sentiment:.4f}) vs {base_stock_sym} ({base_stock_sentiment:.4f})")
            print(f"Sentiment difference: {sentiment_diff:.4f} (abs: {abs(sentiment_diff):.4f})")

            if abs(sentiment_diff) > sentiment_diff_threshold:
                view_row = np.zeros(len(symbols))
                view_row[ticker_index[current_sym]] = 1
                view_row[ticker_index[base_stock_sym]] = -1
                P_list.append(view_row)
                
                Q_list.append([sentiment_diff * sentiment_to_return_factor])
                print(f"VIEW CREATED: {current_sym} vs {base_stock_sym}. P_row: {view_row}, Q_val: {Q_list[-1][0]:.4f}")
            else:
                print(f"NO VIEW CREATED: Difference {abs(sentiment_diff):.4f} <= threshold {sentiment_diff_threshold}")
        
    P_matrix = np.array(P_list) if P_list else np.empty((0, len(symbols)))
    Q_vector = np.array(Q_list) if Q_list else np.empty((0, 1))

    print(f"P_list at end of function: {P_list}")
    print(f"Q_list at end of function: {Q_list}")
    print(f"Final P_matrix shape: {P_matrix.shape}")

    if P_matrix.shape[0] > 0:
        Omega_matrix = np.diag(np.diag(P_matrix @ (tau_for_omega_calc * cov_matrix) @ P_matrix.T))
        Omega_matrix += np.eye(Omega_matrix.shape[0]) * 1e-9 # Add epsilon for numerical stability
    else:
        Omega_matrix = np.empty((0, 0)) # Empty if no views

    return P_matrix, Q_vector, Omega_matrix

# --- Black-Litterman Core Functions ---

def calculate_posterior_returns(implied_eq_returns: np.ndarray,
                                cov_matrix: np.ndarray,
                                P_matrix: np.ndarray,
                                Q_vector: np.ndarray,
                                Omega_matrix: np.ndarray,
                                tau: float) -> np.ndarray:
    """
    Calculates the Black-Litterman posterior expected returns.

    Args:
        implied_eq_returns: Market's implied equilibrium returns (Pi), (N, 1) array.
        cov_matrix: Covariance matrix of asset returns (Sigma), (N, N) array.
        P_matrix: Pick matrix defining views, (K, N) array.
        Q_vector: Vector of expected returns for views, (K, 1) array.
        Omega_matrix: Covariance matrix of view errors (uncertainty), (K, K) array.
        tau: Scalar scaling factor for prior uncertainty.

    Returns:
        Posterior expected returns (N, 1) array.
    """
    implied_eq_returns = np.atleast_2d(implied_eq_returns)
    if implied_eq_returns.shape[0] == 1 and implied_eq_returns.shape[1] > 1:
        implied_eq_returns = implied_eq_returns.T
    elif implied_eq_returns.ndim == 1:
        implied_eq_returns = implied_eq_returns.reshape(-1, 1)

    if P_matrix.shape[0] == 0:
        print("No views defined. Posterior returns are equal to prior implied returns.")
        return implied_eq_returns

    tau_sigma_inv = np.linalg.inv(tau * cov_matrix)

    if Omega_matrix.size == 0: # Check if Omega is empty (e.g., if no views were generated)
        print("WARNING: Omega matrix is empty (no views). Treating as no views (should be covered by P_matrix.shape[0]==0).")
        return implied_eq_returns 
    
    if Omega_matrix.shape == (1, 1) and Omega_matrix[0,0] == 0: # Specific check for 1x1 zero Omega
        print("WARNING: Omega matrix contains zero uncertainty. This can lead to issues. Returning prior returns.")
        return implied_eq_returns

    try:
        Omega_inv = np.linalg.inv(Omega_matrix)
    except np.linalg.LinAlgError as e:
        print(f"CRITICAL ERROR: Omega matrix is singular and cannot be inverted: {e}. Returning prior returns.")
        return implied_eq_returns


    first_bracket = tau_sigma_inv + P_matrix.T @ Omega_inv @ P_matrix
    second_bracket = tau_sigma_inv @ implied_eq_returns + P_matrix.T @ Omega_inv @ Q_vector
    
    try:
        posterior_expected_returns = np.linalg.inv(first_bracket) @ second_bracket
    except np.linalg.LinAlgError as e:
        print(f"CRITICAL ERROR: First bracket matrix is singular and cannot be inverted: {e}. Returning prior returns.")
        return implied_eq_returns

    return posterior_expected_returns


def calculate_optimal_weights(posterior_returns: np.ndarray,
                              cov_matrix: np.ndarray,
                              risk_aversion: float) -> np.ndarray:
    """
    Calculates optimal portfolio weights using a basic mean-variance approach
    based on posterior returns and covariance matrix.
    Assumes no short-selling constraints or budget constraints other than summing to 1.

    Args:
        posterior_returns: (N, 1) array of posterior expected returns.
        cov_matrix: (N, N) array of asset covariance matrix.
        risk_aversion: Scalar scaling factor for prior uncertainty.

    Returns:
        (N, 1) array of optimal portfolio weights, summing to 1.
    """
    if isinstance(cov_matrix, pd.DataFrame):
        cov_matrix = cov_matrix.values

    posterior_returns = np.atleast_2d(posterior_returns)
    if posterior_returns.shape[0] == 1 and posterior_returns.shape[1] > 1:
        posterior_returns = posterior_returns.T
    elif posterior_returns.ndim == 1:
        posterior_returns = posterior_returns.reshape(-1, 1)

    try:
        cov_inv = np.linalg.inv(cov_matrix)
    except np.linalg.LinAlgError as e:
        print(f"CRITICAL ERROR: Covariance matrix is singular and cannot be inverted: {e}. Returning equal weights.")
        return np.ones((len(posterior_returns), 1)) / len(posterior_returns)


    unscaled_weights = cov_inv @ posterior_returns / risk_aversion

    if np.sum(unscaled_weights) != 0:
        optimal_weights = unscaled_weights / np.sum(unscaled_weights)
    else:
        print("WARNING: Sum of unscaled weights is zero. Cannot normalize. Returning equal weights.")
        optimal_weights = np.ones_like(unscaled_weights) / len(optimal_weights)
    
    if optimal_weights.ndim == 1:
        optimal_weights = optimal_weights.reshape(-1, 1)

    return optimal_weights

# --- Test block for blacklitterman.py (will only run if blacklitterman.py is executed directly) ---
if __name__ == "__main__":
    from datetime import datetime, timedelta # Import here for test block

    # Define a local fetch_news for the standalone test block ONLY
    def local_fetch_news_for_test(symbols: List[str]) -> Dict[str, List[str]]:
        news_dict = {}
        if not NEWSAPI_API_KEY_FROM_ENV:
            print("ERROR: NEWSAPI_API_KEY is not configured for this standalone test.")
            return {sym: ["Dummy headline for sentiment analysis test."] for sym in symbols} # Provide dummy headlines

        for symbol in symbols:
            print(f"Fetching news for {symbol} (standalone test)...")
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": symbol,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 5, # Reduced for test
                "apiKey": NEWSAPI_API_KEY_FROM_ENV,
            }
            try:
                response = requests.get(url, params=params, timeout=5)
                response.raise_for_status()
                data = response.json()
                news_dict[symbol] = [article['title'] for article in data.get('articles', []) if article.get('title')]
                print(f"Retrieved {len(news_dict[symbol])} headlines for {symbol}.")
            except Exception as e:
                print(f"Error fetching test news for {symbol}: {e}. Using dummy headlines.")
                news_dict[symbol] = ["Dummy headline for sentiment analysis test."] # Fallback for test

        return news_dict


    print("--- Running standalone tests for blacklitterman.py ---")
    
    test_symbols = ['AAPL', 'MSFT', 'GOOG']
    test_period = "6mo"
    test_risk_aversion = 2.5
    test_tau = 0.05

    print("\n1. Testing get_implied_equilibrium_returns_and_cov...")
    try:
        test_implied_returns, test_cov_matrix, actual_symbols = get_implied_equilibrium_returns_and_cov(
            symbols=test_symbols, period=test_period, risk_aversion=test_risk_aversion
        )
        print("Implied Returns (Daily):\n", pd.DataFrame(test_implied_returns, index=actual_symbols, columns=['Return']))
        print("Covariance Matrix (Daily):\n", pd.DataFrame(test_cov_matrix, index=actual_symbols, columns=actual_symbols))
        # Update test_symbols to reflect actual processed symbols
        test_symbols = actual_symbols
    except ValueError as e:
        print(f"Error during initial data fetch: {e}")
        print("Using dummy data for further testing.")
        # Define dummy data that *explicitly matches* test_symbols length for consistency
        test_symbols = ['SYM1', 'SYM2', 'SYM3'] # Use generic symbols for dummy data if real data fails
        N_test = len(test_symbols)
        test_implied_returns = np.array([[0.0005], [0.0006], [0.0004]])
        test_cov_matrix = np.array([
            [0.0001, 0.00003, 0.00002],
            [0.00003, 0.00012, 0.00004],
            [0.00002, 0.00004, 0.00009]
        ])

    print("\n2. Testing get_sentiment_based_views...")
    test_headlines_dict = local_fetch_news_for_test(test_symbols) # Call local test fetcher
    test_P, test_Q, test_Omega = get_sentiment_based_views(
        symbols=test_symbols,
        cov_matrix=test_cov_matrix,
        headlines_dict=test_headlines_dict # Pass the headlines dictionary
    )
    print("P Matrix:\n", test_P)
    print("Q Vector:\n", test_Q)
    print("Omega Matrix:\n", test_Omega)

    print("\n3. Testing calculate_posterior_returns...")
    test_posterior_returns = calculate_posterior_returns(
        implied_eq_returns=test_implied_returns,
        cov_matrix=test_cov_matrix,
        P_matrix=test_P,
        Q_vector=test_Q,
        Omega_matrix=test_Omega,
        tau=test_tau
    )
    print("Posterior Returns:\n", pd.DataFrame(test_posterior_returns, index=test_symbols, columns=['Return']))

    print("\n4. Testing calculate_optimal_weights...")
    test_optimal_weights = calculate_optimal_weights(
        posterior_returns=test_posterior_returns,
        cov_matrix=test_cov_matrix,
        risk_aversion=test_risk_aversion
    )
    print("Optimal Weights:\n", pd.DataFrame(test_optimal_weights, index=test_symbols, columns=['Weight']))
    print("Sum of optimal weights:", np.sum(test_optimal_weights))

    print("\n--- blacklitterman.py tests complete ---")