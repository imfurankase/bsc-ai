import requests
import logging
import re
from django.conf import settings

logger = logging.getLogger(__name__)

def get_weather(city):
    """Fetch current weather for a city (safe, validated)"""
    if not re.match(r"^[a-zA-Z\s\-']+$", city):  # Basic sanitization
        return "Invalid city name."
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': city,
            'appid': settings.OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            desc = data['weather'][0]['description'].title()
            temp = data['main']['temp']
            country = data['sys']['country']
            return f"Current weather in {city}, {country}: {desc}, {temp}°C"
        else:
            return "Weather data unavailable for that location."
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return "Unable to fetch weather data."

def get_stock_price(symbol):
    """Fetch current stock price (supports US tickers only)"""
    if not re.match(r"^[A-Z\.]{1,10}$", symbol.upper()):
        return "Invalid stock symbol."
    try:
        url = "https://www.alphavantage.co/query"
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol.upper(),
            'apikey': settings.ALPHA_VANTAGE_API_KEY
        }
        response = requests.get(url, params=params, timeout=5)
        if response.status == 200:
            data = response.json()
            quote = data.get('Global Quote', {})
            if quote:
                price = quote.get('05. price')
                return f"Current price for {symbol.upper()}: ${price}"
            else:
                return "Stock symbol not found."
        else:
            return "Stock data unavailable."
    except Exception as e:
        logger.error(f"Stock API error: {e}")
        return "Unable to fetch stock price."
