# 🌏 Project Vayu — Air Quality Intelligence Center

> A satellite-data + machine-learning platform that forecasts air quality for Delhi NCR — real-time AQI, next-day PM2.5 prediction via per-region model ensembles, an AI assistant, and live weather, all in one dashboard.

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white">
  <img alt="Flask" src="https://img.shields.io/badge/Flask-web-000000?logo=flask&logoColor=white">
  <img alt="ML" src="https://img.shields.io/badge/ML-LightGBM%20%7C%20XGBoost%20%7C%20CatBoost%20%7C%20RF%20%7C%20GRU-orange">
  <img alt="AI" src="https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-active-success">
</p>

---

## ✨ Overview

**Project Vayu** turns satellite-derived pollution data and live weather into an actionable air-quality picture for five zones across Delhi. It combines a per-region ensemble of ML models with a live weather feed and a conversational AI assistant, served through a clean Flask dashboard.

The core idea: air quality is **local and time-dependent**, so rather than one global model, Vayu trains and serves a **dedicated model ensemble per region** and forecasts the **next-day PM2.5 → AQI** with an extended multi-hour outlook.

## 🚀 Features

- **Live AQI dashboard** — current Indian AQI, category, and colour-coded severity for the selected region.
- **Next-day PM2.5 forecast** — ensemble prediction with an extended multi-hour AQI outlook.
- **Five Delhi regions** — North, South, East, West, and Central Delhi, each with its own trained models.
- **AI air-quality assistant** — a Gemini 2.5 Flash chatbot (`/airchat`) that answers questions about pollution, health impact, and precautions.
- **Live weather panel** — temperature, humidity, wind, pressure, visibility, and an hourly forecast (WMO-coded conditions).
- **Pollutant explainers** — dedicated info pages for PM2.5, PM10, NO₂, SO₂, CO, and O₃.
- **Auto-refreshing data** — a background scheduler refreshes AQI data every 2 hours.
- **User accounts** — registration, login, and password reset with email/OTP.
- **Payments** — Cashfree-integrated support/contribution flow.

## 🧠 Machine Learning

Each region has an **ensemble of models** trained on its historical air-quality time series (96 serialized model artifacts across all regions):

| Family | Models |
|---|---|
| Gradient boosting | **LightGBM**, **XGBoost**, **CatBoost** |
| Bagging | **Random Forest** |
| Deep sequence | **GRU / LSTM / TCN** (Keras `.h5`) |

**Pipeline** (`ml/`):

- `preprocess.py` — `load_dataset()`, `create_features()`, `get_training_data()` build the per-region feature matrix (lags, rolling statistics, temporal features).
- `predict.py` — `load_regional_models()` loads a region's ensemble; `predict_next_day()` produces the next-day PM2.5; `forecast_extended_aqi()` builds the multi-hour outlook; live weather is pulled in `fetch_hourly_forecast()`.
- `aqi.py` — `pm25_to_aqi()`, `aqi_category()`, `get_color()`, `aqi_transition_message()` map pollutant concentrations to the Indian AQI scale.
- `scripts/update_data.py` — refreshes the underlying datasets on a schedule.

## 🗂️ Project Structure

```
Build2/
├── app.py                  # Flask app: routes, prediction integration, scheduler
├── ml/
│   ├── aqi.py              # PM2.5 → Indian AQI conversion & categories
│   ├── preprocess.py       # dataset loading & feature engineering
│   └── predict.py          # ensemble loading, next-day & extended forecast
├── scripts/
│   └── update_data.py      # scheduled AQI data refresh
├── templates/              # dashboard, auth, pollutant info, chatbot, payment
├── static/                 # css, js, images (incl. weather icons)
├── saved_models/           # per-region model ensembles (gitignored)
├── data/                   # regional datasets (gitignored)
├── test_next_day.py        # next-day prediction test
└── test_weather.py         # weather integration test
```

## 🛠️ Tech Stack

**Backend:** Flask · APScheduler · pandas · numpy
**ML:** LightGBM · XGBoost · CatBoost · scikit-learn (RF) · TensorFlow/Keras (GRU/LSTM/TCN)
**AI:** Google Generative AI — Gemini 2.5 Flash
**Data:** Google Earth Engine (satellite) · Open-Meteo (weather)
**Payments:** Cashfree

## ⚙️ Getting Started

### Prerequisites
- Python 3.13
- A virtual environment
- API keys (see below)

### Installation

```bash
git clone https://github.com/shikkoustic/vayu-website-ml.git
cd vayu-website-ml
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment

Create a `.env` file in the project root:

```env
FLASK_KEY=your_flask_secret
GEMINI_API_KEY=your_gemini_api_key
DB_PASSWORD=your_db_password
EMAIL_PASSWORD=your_email_app_password
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret
```

### Run

```bash
python app.py
```

Then open **http://127.0.0.1:5000**.

> **macOS note:** port 5000 is used by the AirPlay Receiver. Disable it in *System Settings → General → AirDrop & Handoff*, or run the app on another port.

## 🌐 Key Routes

| Route | Description |
|---|---|
| `/dashboard` | Main AQI dashboard (accepts `?region=`) |
| `/pollutants/<pm25\|pm10\|no2\|so2\|co\|o3>` | Pollutant explainer pages |
| `/airchat` · `/airchat/send` | Gemini air-quality assistant |
| `/aqi` · `/aqi-range` | AQI + regional range endpoints |
| `/pay` · `/create-payment-order` · `/payment-return` | Cashfree payment flow |
| `/about` | About the project |

## 🧪 Tests

```bash
python test_next_day.py     # next-day prediction sanity check
python test_weather.py      # weather integration check
```

## 🗺️ Roadmap

- [ ] Expand coverage beyond Delhi NCR
- [ ] Model performance dashboard (per-region metrics)
- [ ] Historical trends & downloadable reports
- [ ] Push/email AQI alerts

## 👤 Author

**Shikhar Srivastava** — [@shikkoustic](https://github.com/shikkoustic)

---

<p align="center"><i>Built to make Delhi's air a little more predictable. 🌫️→📊</i></p>
