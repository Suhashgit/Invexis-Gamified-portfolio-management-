import yfinance as yf
import numpy as np
import pandas as pd
import requests
import os
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
from typing import Union
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk


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

DetectorFactory.seed = 0

# Load environment variable
load_dotenv()
NEWS_API_KEY_FROM_ENV = os.getenv("NEWSAPI_API_KEY")

if not NEWS_API_KEY_FROM_ENV:
    print("CRITICAL ERROR: NEWSAPI_API_KEY not found in .env.")
    NEWS_API_KEY_FROM_ENV = ""


def fetch_news(symbols: Union[str, list[str]], max_articles: int = 10) -> dict:
    """
    Fetch English-filtered news headlines for one or multiple stock symbols.
    Returns: dict of {symbol: [headlines]}
    """
    if not isinstance(symbols, list):
        symbols = [symbols]

    news_dict = {}

    for symbol in symbols:
        print(f"\n=== Fetching news for {symbol} ===")
        if not NEWS_API_KEY_FROM_ENV:
            print(f"ERROR: Missing API key. Skipping {symbol}.")
            continue

        url = "https://newsapi.org/v2/everything"
        params = {
            "q": symbol,
            "sortBy": "publishedAt",
            "language": "en",
            "pageSize": max_articles,
            "apiKey": NEWS_API_KEY_FROM_ENV,
        }

        response = requests.get(url, params=params)
        data = response.json()

        if response.status_code != 200 or "articles" not in data:
            print(f"ERROR fetching news for {symbol}: {data.get('message', 'Unknown error')}")
            continue

        all_titles = [article["title"] for article in data["articles"]]
        english_titles = []

        for title in all_titles:
            try:
                if detect(title) == 'en':
                    english_titles.append(title)
                else:
                    print(f"DEBUG: Skipped non-English: {title}")
            except LangDetectException:
                print(f"DEBUG: Could not detect language for: '{title}'. Skipping.")
                continue

        print(f"DEBUG: {len(english_titles)} English headlines retained for {symbol}.")
        news_dict[symbol] = english_titles

    return news_dict

if __name__ == "__main__":
    symbols = ["AAPL", "MSFT"]
    headlines_dict = fetch_news(symbols)

    for symbol, headlines in headlines_dict.items():
        print(f"\n{symbol} HEADLINES:")
        for h in headlines:
            print(f"- {h}")


nltk.download('vader_lexicon')

def analyze_sentiment_vader(headlines: list[str]):
    sia = SentimentIntensityAnalyzer()
    if not headlines:
        return 0.0
    scores = []
    for title in headlines:
        sentiment = sia.polarity_scores(title)
        scores.append(sentiment['compound'])
    return np.mean(scores)

def get_final_sentiment_score(symbols):
    if not isinstance(symbols,list):
        symbols = [symbols]
    sentiment_results = {}
    for symbol in symbols:
        headlines_dict = fetch_news(symbol)
        headlines = headlines_dict.get(symbol, [])
        print(f"{symbol} headlines: {len(headlines)}")
        sentiment_scores = analyze_sentiment_vader(headlines)
        sentiment_results[symbol] = sentiment_scores
    return sentiment_results

if __name__ == "__main__":
    print("=== Sentiment Analysis Test ===")
    test_symbols = ["AAPL", "MSFT", "TSLA"]
    sentiment_scores = get_final_sentiment_score(test_symbols)

    print("\nFinal Sentiment Scores:")
    for symbol, score in sentiment_scores.items():
        print(f"{symbol}: {score:.4f}")













  
    
    
    
    


