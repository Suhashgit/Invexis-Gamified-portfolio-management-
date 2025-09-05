# main.py
from fastapi import FastAPI, HTTPException, Query, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from typing import List, Dict, Union, Optional
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables at the very beginning of the script execution
load_dotenv()

# Assuming auth.py is in the same directory
from auth import register_user, login_user, load_users, save_users

# Import functions from your Blacklitterman and Monte Carlo modules
from Blacklitterman import ( 
    get_implied_equilibrium_returns_and_cov,
    get_sentiment_based_views,
    calculate_posterior_returns,
    calculate_optimal_weights
)
from monte_carlo import (
    get_MonteCarloPaths_CorrelatedMultiAsset,
    simulate_portfolio_value
)

app = FastAPI()

# --- API Keys ---
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "YOUR_FINNHUB_API_KEY_HERE") 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")   
NEWSAPI_API_KEY = os.getenv("NEWSAPI_API_KEY", "YOUR_NEWSAPI_API_KEY_HERE")

if FINNHUB_API_KEY == "YOUR_FINNHUB_API_KEY_HERE":
    print("\nWARNING: FINNHUB_API_KEY not found in environment variables. Finnhub functionality will be limited.\n")
if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
    print("\nWARNING: GEMINI_API_KEY not found in environment variables. AI News Summarizer will not work!\n")
if NEWSAPI_API_KEY == "YOUR_NEWSAPI_API_KEY_HERE":
    print("\nWARNING: NEWSAPI_API_KEY not found in environment variables. NewsAPI.org functionality may be limited.\n")


# Enable CORS (Cross-Origin Resource Sharing) for frontend development
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define allowed periods for yfinance
VALID_YFINANCE_PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]

# --- Helper to fetch data from Finnhub ---
def _get_finnhub_data(endpoint: str, params: dict = None):
    if not FINNHUB_API_KEY or FINNHUB_API_KEY == "YOUR_FINNHUB_API_KEY_HERE":
        raise HTTPException(status_code=500, detail="Finnhub API Key is not configured in the backend.")

    base_url = "https://finnhub.io/api/v1/"
    url = f"{base_url}{endpoint}"
    full_params = {"token": FINNHUB_API_KEY}
    if params:
        full_params.update(params)

    try:
        response = requests.get(url, params=full_params)
        response.raise_for_status() 
        data = response.json()
        if not data:
            return []
        return data
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        detail = e.response.text
        print(f"Finnhub HTTP Error ({status_code}) for {endpoint}: {detail}")
        if status_code == 401:
            raise HTTPException(status_code=401, detail=f"Finnhub API Unauthorized: Invalid API Key or Subscription: {detail}")
        elif status_code == 429:
            raise HTTPException(status_code=429, detail=f"Finnhub API Rate Limit Exceeded: {detail}")
        raise HTTPException(status_code=status_code, detail=f"Finnhub API error: {detail}")
    except requests.exceptions.ConnectionError:
        print(f"Finnhub Connection Error for {endpoint}")
        raise HTTPException(status_code=503, detail="Could not connect to Finnhub API. Check internet connection.")
    except Exception as e:
        print(f"Finnhub Unexpected Error for {endpoint}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching from Finnhub: {e}")

# --- Helper to call Gemini API for AI Analysis ---
async def _get_gemini_analysis(news_title: str, news_summary: str) -> Dict:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured in the backend.")

    prompt = f"""
    Analyze the following financial news article. Provide a concise AI analysis, identify affected stocks/indices with their names, sectors, impact (positive/negative/neutral), and confidence level (0-100), and describe the 'butterfly effect' chain.

    News Title: {news_title}
    News Summary: {news_summary}

    Output should be a JSON object with the following structure:
    {{
        "aiAnalysis": "string",
        "butterflyEffect": "string",
        "affectedStocks": [
            {{
                "symbol": "string",
                "name": "string",
                "sector": "string",
                "impact": "positive" | "negative" | "neutral",
                "confidence": "number (0-100)",
                "reason": "string"
            }}
        ],
        "overallImpact": "bullish" | "bearish" | "sector-specific" | "neutral",
        "priority": "number (1-3, 1 being highest priority)"
    }}
    Ensure all fields are present and valid. Confidence should be an integer.
    """

    headers = {
        'Content-Type': 'application/json',
    }
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "aiAnalysis": {"type": "STRING"},
                    "butterflyEffect": {"type": "STRING"},
                    "affectedStocks": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "symbol": {"type": "STRING"},
                                "name": {"type": "STRING"},
                                "sector": {"type": "STRING"},
                                "impact": {"type": "STRING", "enum": ["positive", "negative", "neutral"]},
                                "confidence": {"type": "NUMBER"},
                                "reason": {"type": "STRING"}
                            },
                            "required": ["symbol", "name", "sector", "impact", "confidence", "reason"]
                        }
                    },
                    "overallImpact": {"type": "STRING", "enum": ["bullish", "bearish", "sector-specific", "neutral"]},
                    "priority": {"type": "NUMBER"}
                },
                "required": ["aiAnalysis", "butterflyEffect", "affectedStocks", "overallImpact", "priority"]
            }
        }
    }

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        
        if result and result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            llm_text_response = result["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(llm_text_response)
        else:
            print(f"Gemini API returned unexpected structure: {result}")
            raise HTTPException(status_code=500, detail="Gemini API returned unexpected response structure.")

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        detail = e.response.text
        print(f"Gemini HTTP Error ({status_code}): {detail}")
        raise HTTPException(status_code=status_code, detail=f"Gemini API error: {detail}")
    except requests.exceptions.ConnectionError:
        print("Gemini Connection Error")
        raise HTTPException(status_code=503, detail="Could not connect to Gemini API.")
    except json.JSONDecodeError:
        print(f"Gemini API returned invalid JSON: {llm_text_response}")
        raise HTTPException(status_code=500, detail="Gemini API returned malformed JSON response.")
    except Exception as e:
        print(f"Unexpected error calling Gemini API: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred with Gemini API: {e}")


# --- User Session / Authentication Dependency (Simplified) ---
def get_current_user_email(user_email: str = Query(None, description="Currently logged in user's email (for demo only)")):
    if user_email:
        users_data = load_users()
        if any(user["email"] == user_email for user in users_data):
            return user_email
    return None

# --- API Endpoints ---

@app.post("/register")
async def register(email: str = Form(...), password: str = Form(...)):
    print(f"Backend: Received registration request for email: {email}")
    result = register_user(email, password)
    print(f"Backend: Registration result for {email}: {result}")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.post("/login")
async def login(email: str = Form(...), password: str = Form(...)):
    print(f"Backend: Received login request for email: {email}")
    result = login_user(email, password)
    print(f"Backend: Login result for {email}: {result}")
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    return result

@app.get("/api/stock/{symbol}/history")
async def get_stock_history(
    symbol: str,
    period: str = Query("1y", description=f"Time period for historical data. Valid options: {', '.join(VALID_YFINANCE_PERIODS)}")
) -> List[Dict[str, Union[str, float]]]:
    if period not in VALID_YFINANCE_PERIODS:
        raise HTTPException(status_code=400, detail=f"Invalid period. Choose from: {', '.join(VALID_YFINANCE_PERIODS)}")

    try:
        ticker = yf.Ticker(symbol.upper())
        data = ticker.history(period=period)

        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol.upper()} for the period {period}. Try a different symbol or period.")

        data = data.reset_index()

        result = []
        for i, row in data.iterrows():
            close_price = float(row["Close"])
            open_price = float(row["Open"])
            volume = float(row["Volume"])
            high_price = float(row["High"])
            low_price = float(row["Low"])

            daily_change_percent = 0.0
            if i > 0:
                prior_close = float(data.iloc[i-1]["Close"])
                if prior_close != 0:
                    daily_change_percent = ((close_price - prior_close) / prior_close) * 100

            date_str = ""
            if isinstance(row["Date"], datetime):
                date_str = row["Date"].strftime("%Y-%m-%d")
            elif isinstance(row["Date"], date):
                date_str = row["Date"].strftime("%Y-%m-%d")
            else:
                date_str = str(row["Date"])

            result.append({
                "Date": date_str,
                "Open": open_price,
                "High": high_price,
                "Low": low_price,
                "Close": close_price,
                "Volume": volume,
                "Daily_Change_Percent": round(daily_change_percent, 2)
            })

        return result

    except Exception as e:
        print(f"Error fetching data for {symbol} period {period}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching stock data: {e}")

@app.get("/api/stock/{symbol}/quote")
async def get_stock_quote(symbol: str):
    """
    Fetches real-time price, change, change percentage, and key ratios for a given stock symbol using yfinance.
    """
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info

        price = info.get("currentPrice") or info.get("regularMarketPrice")
        previous_close = info.get("regularMarketPreviousClose") # Corrected: Use regularMarketPreviousClose directly
        if previous_close is None: # Fallback if regularMarketPreviousClose is not directly available
            previous_close = info.get("previousClose") # Fallback to generic previousClose

        long_name = info.get("longName") or info.get("shortName") or symbol.upper()

        if price is None: # If price is still None, try getting from history
            hist_data = ticker.history(period="1d", auto_adjust=True) # Get 1 day of historical data
            if not hist_data.empty:
                price = float(hist_data["Close"].iloc[-1])
                if previous_close is None: # If previous_close is still none, try getting it from history
                    if len(hist_data) > 1: # Get previous close from history if available
                        previous_close = float(hist_data["Close"].iloc[-2])
                    else: # If only one day of data, try 2 days to get previous close
                        prev_hist_data = ticker.history(period="2d", auto_adjust=True)
                        if len(prev_hist_data) > 1:
                            previous_close = float(prev_hist_data["Close"].iloc[-2])
                        else:
                            previous_close = price # Fallback if no prior close found

        if price is None:
             raise HTTPException(status_code=404, detail=f"No real-time quote data found for {symbol.upper()}.")

        change = "N/A"
        changesPercentage = "N/A"

        if price is not None and previous_close is not None and previous_close != 0:
            change = price - previous_close
            changesPercentage = (change / previous_close) * 100

        market_cap = info.get("marketCap")
        trailing_pe = info.get("trailingPE")
        forward_eps = info.get("forwardEps")
        dividend_yield = info.get("dividendYield")
        beta = info.get("beta")
        roe = info.get("returnOnEquity")

        return {
            "symbol": symbol.upper(),
            "name": long_name,
            "price": round(price, 2) if isinstance(price, (int, float)) else price,
            "changesPercentage": round(changesPercentage, 2) if isinstance(changesPercentage, (int, float)) else changesPercentage,
            "change": round(change, 2) if isinstance(change, (int, float)) else change,
            "keyRatios": {
                "marketCap": round(market_cap, 2) if isinstance(market_cap, (int, float)) else "N/A",
                "peRatio": round(trailing_pe, 2) if isinstance(trailing_pe, (int, float)) else "N/A",
                "eps": round(forward_eps, 2) if isinstance(forward_eps, (int, float)) else "N/A",
                "dividendYield": round(dividend_yield * 100, 2) if isinstance(dividend_yield, (int, float)) else "N/A",
                "beta": round(beta, 2) if isinstance(beta, (int, float)) else "N/A",
                "roe": round(roe * 100, 2) if isinstance(roe, (int, float)) else "N/A",
            }
        }
    except Exception as e:
        print(f"Error fetching real-time quote/ratios for {symbol} using yfinance: {e}")
        if "No data found" in str(e) or "invalid symbol" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Invalid stock symbol or no data available for {symbol.upper()} from yfinance.")
        raise HTTPException(status_code=500, detail=f"Could not fetch real-time quote/ratios using yfinance: {e}")


@app.get("/api/search_stocks")
async def search_stocks(query: str = Query("", min_length=0)):
    """
    Searches for stock symbols and names using Finnhub's search endpoint.
    Returns results from global exchanges.
    """
    try:
        if not query:
            # Fallback to popular symbols if query is empty, as specified by user
            popular_symbols_for_empty_query = [
                "AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "TSLA",
                "JPM", "GS", "XOM", "CVX", "PG", "KO", "PEP"
            ]
            results = []
            for sym in popular_symbols_for_empty_query:
                try:
                    ticker_info = yf.Ticker(sym).info
                    results.append({
                        "symbol": sym,
                        "name": ticker_info.get("longName") or ticker_info.get("shortName") or sym
                    })
                except Exception as e:
                    print(f"Warning: Could not get info for popular symbol {sym}: {e}")
            return results
        
        # Use Finnhub for actual search queries
        finnhub_results = _get_finnhub_data("search", params={"q": query})
        
        results = []
        for item in finnhub_results.get("result", []):
            # Filter for common stock types and ensure symbol/description are present
            if item.get("symbol") and item.get("description") and item.get("type") in ["Common Stock", "ADR", "ETF", "Index", "Equity"]:
                results.append({
                    "symbol": item["symbol"],
                    "name": item["description"]
                })
        return results[:20] # Limit to top 20 search results

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error searching stocks for query '{query}' using Finnhub: {e}")
        raise HTTPException(status_code=500, detail=f"Could not perform stock search using Finnhub: {e}")

# --- News Endpoints ---
async def _process_news_article_with_gemini(news_item: Dict) -> Dict:
    """
    Processes a single news article with Gemini API for analysis.
    """
    title = news_item.get("headline", "")
    summary = news_item.get("summary", "")
    source = news_item.get("source", "N/A")
    url = news_item.get("url", "#")
    timestamp = news_item.get("datetime")
    
    # Convert timestamp to human-readable format
    if timestamp:
        try:
            # Finnhub datetime is Unix timestamp (seconds)
            dt_object = datetime.fromtimestamp(timestamp)
            # Format as "X hours ago", etc.
            now = datetime.now()
            diff = now - dt_object
            if diff.days > 0:
                time_ago = f"{diff.days} days ago"
            elif diff.seconds >= 3600:
                time_ago = f"{int(diff.seconds / 3600)} hours ago"
            elif diff.seconds >= 60:
                time_ago = f"{int(diff.seconds / 60)} minutes ago"
            else:
                time_ago = "just now"
        except Exception:
            time_ago = "N/A"
    else:
        time_ago = "N/A"

    # Call Gemini API for analysis
    try:
        gemini_analysis = await _get_gemini_analysis(title, summary)
    except HTTPException as e:
        print(f"Warning: Gemini analysis failed for news '{title}': {e.detail}")
        gemini_analysis = {
            "aiAnalysis": "AI analysis not available.",
            "butterflyEffect": "No butterfly effect determined.",
            "affectedStocks": [],
            "overallImpact": "neutral",
            "priority": 3
        }
    except Exception as e:
        print(f"Warning: Unexpected error during Gemini analysis for news '{title}': {e}")
        gemini_analysis = {
            "aiAnalysis": "AI analysis experienced an unexpected error.",
            "butterflyEffect": "No butterfly effect determined.",
            "affectedStocks": [],
            "overallImpact": "neutral",
            "priority": 3
        }

    return {
        "id": str(news_item.get("id")), # Ensure ID is a string for frontend keys
        "title": title,
        "summary": summary,
        "impact": gemini_analysis.get("overallImpact", "neutral"),
        "priority": gemini_analysis.get("priority", 3),
        "affectedSectors": [stock.get("sector", "N/A") for stock in gemini_analysis.get("affectedStocks", []) if stock.get("sector")] or ["General"],
        "timestamp": time_ago,
        "source": source,
        "sourceUrl": url,
        "aiAnalysis": gemini_analysis.get("aiAnalysis", "AI analysis not available."),
        "butterflyEffect": gemini_analysis.get("butterflyEffect", "No butterfly effect determined."),
        "affectedStocks": gemini_analysis.get("affectedStocks", [])
    }


@app.get("/api/news")
async def get_financial_news(
    category: str = Query("general", description="News category (e.g., general, forex, crypto)"),
    min_sentiment: float = Query(None, description="Minimum sentiment score (0-1)"),
    max_sentiment: float = Query(None, description="Maximum sentiment score (0-1)"),
    limit: int = Query(10, description="Number of news articles to fetch") # Reduced default limit for fewer Gemini calls
):
    """
    Fetches top financial news from Finnhub and processes them with Gemini AI.
    """
    try:
        finnhub_news = _get_finnhub_data("news", params={"category": category, "minSentiment": min_sentiment, "maxSentiment": min_sentiment, "limit": limit}) # min/max sentiment seems incorrect usage here
        
        processed_news = []
        for news_item in finnhub_news:
            processed_news.append(await _process_news_article_with_gemini(news_item))

        categories_data = {
            "all": len(processed_news),
            "bullish": sum(1 for n in processed_news if n["impact"] == "bullish"),
            "bearish": sum(1 for n in processed_news if n["impact"] == "bearish"),
            "sector": sum(1 for n in processed_news if n["impact"] == "sector-specific"),
            "neutral": sum(1 for n in processed_news if n["impact"] == "neutral")
        }

        return {
            "news": processed_news,
            "categories_counts": categories_data
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error fetching/processing financial news: {e}")
        raise HTTPException(status_code=500, detail=f"Could not fetch or process financial news: {e}")


# --- Watchlist Endpoints ---
@app.get("/api/watchlist")
async def get_watchlist(current_user_email: str = Depends(get_current_user_email)):
    if not current_user_email:
        raise HTTPException(status_code=401, detail="Authentication required.")

    users_data = load_users()
    user_info = next((user for user in users_data if user["email"] == current_user_email), None)

    if user_info and "watchlist" in user_info:
        watchlist_with_prices = []
        for item in user_info["watchlist"]:
            try:
                quote = await get_stock_quote(item["symbol"])
                watchlist_with_prices.append({
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": quote.get("price", 'N/A'),
                    "change": quote.get("change", 'N/A'),
                    "changesPercentage": quote.get("changesPercentage", 'N/A')
                })
            except HTTPException as e:
                print(f"Warning: Could not fetch price for watchlist item {item['symbol']}: {e.detail}")
                watchlist_with_prices.append({
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": 'N/A',
                    "change": 'N/A',
                    "changesPercentage": 'N/A',
                    "error": e.detail
                })
            except Exception as e:
                print(f"Warning: Unexpected error fetching price for watchlist item {item['symbol']}: {e}")
                watchlist_with_prices.append({
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": 'N/A',
                    "change": 'N/A',
                    "changesPercentage": 'N/A',
                    "error": "Failed to fetch price"
                })
        return {"watchlist": watchlist_with_prices}
    return {"watchlist": []}

@app.post("/api/watchlist/add")
async def add_to_watchlist(
    symbol: str = Form(...),
    name: str = Form(...),
    current_user_email: str = Depends(get_current_user_email)
):
    if not current_user_email:
        raise HTTPException(status_code=401, detail="Authentication required.")

    users_data = load_users()
    user_found = False
    for i, user in enumerate(users_data):
        if user["email"] == current_user_email:
            user_found = True
            if "watchlist" not in user:
                user["watchlist"] = []
            
            if any(item["symbol"] == symbol for item in user["watchlist"]):
                raise HTTPException(status_code=400, detail="Stock is already in watchlist.")

            user["watchlist"].append({"symbol": symbol, "name": name})
            users_data[i] = user
            save_users(users_data)
            return {"success": True, "message": f"{symbol} added to watchlist."}
    
    if not user_found:
        raise HTTPException(status_code=404, detail="User not found for watchlist operation.")

@app.post("/api/watchlist/remove")
async def remove_from_watchlist(
    symbol: str = Form(...),
    current_user_email: str = Depends(get_current_user_email)
):
    if not current_user_email:
        raise HTTPException(status_code=401, detail="Authentication required.")

    users_data = load_users()
    user_found = False
    for i, user in enumerate(users_data):
        if user["email"] == current_user_email:
            user_found = True
            if "watchlist" in user:
                initial_len = len(user["watchlist"])
                user["watchlist"] = [item for item in user["watchlist"] if item["symbol"] != symbol]
                if len(user["watchlist"]) == initial_len:
                    raise HTTPException(status_code=404, detail=f"{symbol} not found in watchlist.")
                users_data[i] = user
                save_users(users_data)
                return {"success": True, "message": f"{symbol} removed from watchlist."}
            else:
                raise HTTPException(status_code=404, detail="Watchlist is empty for this user.")
    
    if not user_found:
        raise HTTPException(status_code=404, detail="User not found for watchlist operation.")

# --- Portfolio Simulation Endpoints ---

class StockSelectionRequest(BaseModel):
    symbols: List[str]
    historicalPeriod: str = "10y"
    numTimeIntervals: int = 252
    numSimulations: int = 2000
    riskAversionBL: float = 2.5
    tauBL: float = 0.05
    riskAversionOpt: float = 3.0

class UserWeightsRequest(BaseModel):
    symbols: List[str]
    weights: Dict[str, float] # Example: { "AAPL": 0.5, "MSFT": 0.5 }
    initialPortfolioValue: float = 100000
    # The following parameters are implicitly consistent with the cached data
    # but could be sent for validation or if caching strategy changes
    historicalPeriod: str = "1y" # For context/validation, if needed
    numTimeIntervals: int = 252 # For stats calculation consistency
    numSimulations: int = 2000 # For stats calculation consistency
    riskAversionBL: float = 2.5
    tauBL: float = 0.05
    riskAversionOpt: float = 3.0

class PortfolioStatsResponse(BaseModel):
    expectedReturn: float
    standardDeviation: float
    sharpeRatio: float
    maxDrawdown: float
    riskCategory: str
    optimalWeights: Dict[str, float]


class InitializeDataResponse(BaseModel):
    symbols: List[str]
    currentPrices: Dict[str, float]
    optimalWeights: Dict[str, float] # Black-Litterman optimal weights
    sampleIndividualPaths: Dict[str, List[float]] # First path for each stock


class SimulatePortfolioResponse(BaseModel):
    simulatedPortfolioValues: List[float] # Average portfolio path
    simulatedPortfolioFinalValues: List[float] # All final values for summary stats (VaR, etc.)
    portfolioStats: PortfolioStatsResponse


# In-memory storage for cached data. NOT suitable for production (use DB/Redis).
# This is to avoid recalculating BL model and full MC paths for every weight change.
_cached_portfolio_data: Dict[str, Union[np.ndarray, List[str], Dict, float]] = {}
_LAST_REQUEST_PARAMS: Dict = {} # To check if parameters change and trigger re-initialization

@app.post("/api/portfolio/initialize-data", response_model=InitializeDataResponse)
async def initialize_portfolio_data(request: StockSelectionRequest):
    """
    Initializes market data and pre-simulates asset paths based on selected symbols.
    Calculates Black-Litterman optimal weights.
    Caches data for subsequent simulation requests.
    """
    # Check if parameters (symbols, periods, etc.) have changed, forcing re-initialization
    current_params_hash = hash(json.dumps(request.dict(), sort_keys=True)) # Consistent hash
    global _LAST_REQUEST_PARAMS # Use global to modify the variable
    
    if _LAST_REQUEST_PARAMS.get("hash") != current_params_hash: # Check if hash changed
        print(f"Parameters changed or first request ({request.symbols}). Re-initializing portfolio data.")
        _LAST_REQUEST_PARAMS = {"hash": current_params_hash, "params": request.dict()}
        _cached_portfolio_data.clear() # Clear cache on new parameters/symbols

    if not _cached_portfolio_data:
        print(f"Backend: Running full initialization for {request.symbols}...")
        try:
            implied_eq_returns_daily, cov_matrix_daily_np, actual_symbols_processed = \
                get_implied_equilibrium_returns_and_cov(
                    symbols=request.symbols,
                    period=request.historicalPeriod,
                    risk_aversion=request.riskAversionBL
                )

            if not actual_symbols_processed:
                # If get_implied_equilibrium_returns_and_cov returns empty symbols, raise error
                raise HTTPException(status_code=400, detail="No valid assets could be processed for initialization after yfinance download.")

            # Sentiment views for Black-Litterman
            # NEW: Fetch news headlines from Finnhub here, then pass to get_sentiment_based_views
            news_headlines_for_sentiment = {}
            for sym in actual_symbols_processed:
                try:
                    # Get company news for each stock (limit to 5 articles for less Gemini usage)
                    # Using (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d") for 'from' date
                    finnhub_company_news = _get_finnhub_data("company-news", params={"symbol": sym, "from": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"), "to": datetime.now().strftime("%Y-%m-%d")})
                    # Extract just the headlines from Finnhub news for VADER
                    headlines_list = [article['headline'] for article in finnhub_company_news if 'headline' in article][:5] # Limit to top 5 headlines
                    news_headlines_for_sentiment[sym] = headlines_list
                except HTTPException as e:
                    print(f"Warning: Failed to fetch Finnhub company news for {sym} during sentiment view generation: {e.detail}")
                    news_headlines_for_sentiment[sym] = []
                except Exception as e:
                    print(f"Warning: Unexpected error fetching news for {sym} for sentiment: {e}")
                    news_headlines_for_sentiment[sym] = []

            P_matrix, Q_vector, Omega_matrix = get_sentiment_based_views(
                symbols=actual_symbols_processed, 
                cov_matrix=cov_matrix_daily_np,
                headlines_dict=news_headlines_for_sentiment # Pass headlines to blacklitterman
            )

            # Black-Litterman optimal weights
            bl_posterior_returns = calculate_posterior_returns(
                implied_eq_returns=implied_eq_returns_daily,
                cov_matrix=cov_matrix_daily_np,
                P_matrix=P_matrix,
                Q_vector=Q_vector,
                Omega_matrix=Omega_matrix,
                tau=request.tauBL
            )
            bl_optimal_weights_np = calculate_optimal_weights(
                posterior_returns=bl_posterior_returns,
                cov_matrix=cov_matrix_daily_np,
                risk_aversion=request.riskAversionOpt
            )
            # Ensure bl_optimal_weights is always a dictionary, even if bl_optimal_weights_np is empty
            bl_optimal_weights = {sym: round(float(bl_optimal_weights_np[i, 0]), 4) for i, sym in enumerate(actual_symbols_processed)}


            # Pre-simulate asset paths (ALL iterations for subsequent use)
            all_simulated_asset_paths_dict = get_MonteCarloPaths_CorrelatedMultiAsset(
                symbols=actual_symbols_processed,
                cov_matrix=cov_matrix_daily_np,
                period=request.historicalPeriod, # Consistency
                time_intervals=request.numTimeIntervals,
                iteration=request.numSimulations
            )
            # CRITICAL: If all_simulated_asset_paths_dict is empty (meaning no stock data was good enough for MC)
            if not all_simulated_asset_paths_dict:
                raise HTTPException(status_code=400, detail="Monte Carlo simulation failed for all selected stocks during initialization.")


            # Get current prices for individual stock plots (frontend)
            current_prices = {}
            for sym in actual_symbols_processed:
                try:
                    # Fetching 1-day history is fast for just the last price
                    hist_data = yf.download(sym, period='1d', auto_adjust=True, progress=False)
                    if not hist_data.empty and 'Close' in hist_data.columns:
                         current_prices[sym] = hist_data['Close'].iloc[-1].item()
                    elif not hist_data.empty and 'Adj Close' in hist_data.columns: # Check not empty as well
                         current_prices[sym] = hist_data['Adj Close'].iloc[-1].item()
                    else:
                        # Fallback to simulated start price if yfinance fails
                        # Use .get() and default values to prevent error if sym not in all_simulated_asset_paths_dict
                        current_prices[sym] = all_simulated_asset_paths_dict.get(sym, np.array([[0.0]]))[0,0].item()
                except Exception as e:
                    print(f"Warning: Could not get last historical price for {sym} during init: {e}")
                    current_prices[sym] = all_simulated_asset_paths_dict.get(sym, np.array([[0.0]]))[0,0].item()


            # Cache the results for subsequent /simulate calls
            _cached_portfolio_data['symbols'] = actual_symbols_processed
            _cached_portfolio_data['cov_matrix'] = cov_matrix_daily_np
            _cached_portfolio_data['implied_returns'] = implied_eq_returns_daily
            _cached_portfolio_data['P_matrix'] = P_matrix
            _cached_portfolio_data['Q_vector'] = Q_vector
            _cached_portfolio_data['Omega_matrix'] = Omega_matrix
            _cached_portfolio_data['tauBL'] = request.tauBL
            _cached_portfolio_data['riskAversionOpt'] = request.riskAversionOpt
            _cached_portfolio_data['all_simulated_asset_paths'] = all_simulated_asset_paths_dict
            _cached_portfolio_data['optimal_weights_dict'] = bl_optimal_weights

            # Prepare response: Send only a sample of individual paths for frontend plotting
            # Ensure sample_individual_paths is always a dict, even if a stock had issues
            # Now sending the MEDIAN path (50th percentile) for better representativeness
            sample_individual_paths = {
                sym: np.median(paths, axis=1).tolist() # Changed to median path
                for sym, paths in all_simulated_asset_paths_dict.items()
                if paths.shape[0] > 0 and paths.shape[1] > 0 # Ensure paths are not empty
            }

            return InitializeDataResponse(
                symbols=actual_symbols_processed, # Return the processed list
                currentPrices=current_prices,
                optimalWeights=bl_optimal_weights,
                sampleIndividualPaths=sample_individual_paths
            )

        except ValueError as e: # Catch ValueErrors from your helper functions
            print(f"Backend validation/data processing error during initialization: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException as e: # Re-raise HTTPExceptions from Finnhub/Gemini/other parts
            raise e
        except Exception as e:
            print(f"Backend internal error during initialization: {e}")
            raise HTTPException(status_code=500, detail=f"An unexpected server error occurred during initialization: {e}")

@app.post("/api/portfolio/simulate", response_model=SimulatePortfolioResponse)
async def simulate_portfolio(request: UserWeightsRequest):
    """
    Simulates a portfolio based on user-provided weights and returns its forecast data and stats.
    Uses cached data from /api/portfolio/initialize-data.
    """
    if not _cached_portfolio_data:
        raise HTTPException(status_code=400, detail="Portfolio data not initialized. Call /api/portfolio/initialize-data first.")

    # Retrieve cached data
    actual_symbols_processed = _cached_portfolio_data['symbols']
    all_simulated_asset_paths_dict = _cached_portfolio_data['all_simulated_asset_paths']
    optimal_weights_dict = _cached_portfolio_data['optimal_weights_dict']
    
    # Ensure request symbols match cached symbols, and weights are ordered correctly
    if set(request.symbols) != set(actual_symbols_processed):
        raise HTTPException(status_code=400, detail="Symbols in request do not match initialized symbols. Please re-initialize data.")
    
    user_weights_np = np.array([request.weights.get(sym, 0.0) for sym in actual_symbols_processed]).reshape(-1, 1)

    try:
        # Simulate portfolio value with user's weights
        simulated_portfolio_values = simulate_portfolio_value(
            initial_portfolio_value=request.initialPortfolioValue,
            optimal_weights=user_weights_np,
            simulated_asset_paths=all_simulated_asset_paths_dict
        )

        # --- Calculate Portfolio Stats ---
        final_portfolio_values = simulated_portfolio_values[-1, :]
        initial_value_for_stats = simulated_portfolio_values[0, 0] # Should be initialPortfolioValue

        # DEBUG PRINTS FOR STATS CALCULATION:
        print(f"\n--- DEBUG STATS CALCULATION ---")
        print(f"Current time: {datetime.now()}")
        print(f"Shape of simulated_portfolio_values: {simulated_portfolio_values.shape}")
        print(f"Initial Value for Stats: {initial_value_for_stats}")
        print(f"Sample final_portfolio_values (first 5): {final_portfolio_values[:5]}")
        print(f"Min final_portfolio_values: {np.min(final_portfolio_values)}")
        print(f"Max final_portfolio_values: {np.max(final_portfolio_values)}")
        print(f"Range of final_portfolio_values: {np.max(final_portfolio_values) - np.min(final_portfolio_values)}")


        expected_return = (np.mean(final_portfolio_values) - initial_value_for_stats) / initial_value_for_stats
        expected_return_annualized = (1 + expected_return)**(252/request.numTimeIntervals) - 1 if request.numTimeIntervals > 0 else expected_return

        annualized_returns_per_path = (final_portfolio_values / initial_value_for_stats)**(252/request.numTimeIntervals) - 1
        
        print(f"Sample annualized_returns_per_path (first 5): {annualized_returns_per_path[:5]}")
        print(f"Min annualized_returns_per_path: {np.min(annualized_returns_per_path)}")
        print(f"Max annualized_returns_per_path: {np.max(annualized_returns_per_path)}")
        print(f"Range of annualized_returns_per_path: {np.max(annualized_returns_per_path) - np.min(annualized_returns_per_path)}")
        print(f"Standard deviation of annualized_returns_per_path: {np.std(annualized_returns_per_path)}")
        
        standard_deviation_annualized = np.std(annualized_returns_per_path)

        # Sharpe Ratio (Requires risk-free rate - assuming 0.02 for simplicity, or provide as input)
        risk_free_rate = 0.02 # Example annual risk-free rate, adjust as needed
        sharpe_ratio = (expected_return_annualized - risk_free_rate) / standard_deviation_annualized if standard_deviation_annualized != 0 else 0.0

        # Max Drawdown (computed from average path for simplicity on frontend)
        cumulative_returns_avg_path = simulated_portfolio_values.mean(axis=1) / initial_value_for_stats
        peak = np.maximum.accumulate(cumulative_returns_avg_path)
        drawdown = (peak - cumulative_returns_avg_path) / peak
        max_drawdown = np.max(drawdown)


        # Risk Category (Heuristic based on annualized standard deviation)
        if standard_deviation_annualized < 0.08: # < 8% annualized volatility
            risk_category = 'Conservative'
        elif standard_deviation_annualized < 0.15: # 8% to 15%
            risk_category = 'Moderate'
        else: # > 15%
            risk_category = 'Aggressive'

        return SimulatePortfolioResponse(
            simulatedPortfolioValues=np.mean(simulated_portfolio_values, axis=1).tolist(), # Average path for charting
            simulatedPortfolioFinalValues=final_portfolio_values.tolist(), # All final values for frontend stats (VaR)
            portfolioStats=PortfolioStatsResponse( # Return as a Pydantic model
                expectedReturn=expected_return_annualized,
                standardDeviation=standard_deviation_annualized,
                sharpeRatio=sharpe_ratio,
                maxDrawdown=max_drawdown,
                riskCategory=risk_category,
                optimalWeights=optimal_weights_dict # Pass the pre-calculated optimal weights
            )
        )

    except ValueError as e:
        print(f"Backend validation/data processing error during simulation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Backend internal error during simulation: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred during simulation: {e}")


# --- Root & Test Endpoints ---
@app.get("/")
def root():
    print("Backend: Root endpoint accessed.")
    return {"message": "Welcome to InVexis API!"}

@app.get("/test-connection")
def test_connection():
    print("Backend: Test connection endpoint accessed.")
    return {"message": "Connection successful!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)