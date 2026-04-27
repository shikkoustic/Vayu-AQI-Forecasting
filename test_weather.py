import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from ml.predict import fetch_weather_forecast_12h, forecast_extended_aqi

res = fetch_weather_forecast_12h("North_Delhi")
print("Weather items:", len(res))
if len(res) > 0:
    print("First weather:", res[0])

ext = forecast_extended_aqi("North_Delhi")
print("Extended keys:", ext.keys())
