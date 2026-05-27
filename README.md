# 🧠 E-Commerce Analytics AI

An AI-powered e-commerce analytics platform that scrapes product data from Snapdeal and applies a suite of machine learning algorithms for demand forecasting, dynamic pricing optimization, and visual product search.

---

## ✨ Features

### 📊 Advanced Analytics
- **Ensemble ML Model** — combines 5 algorithms (Random Forest, Gradient Boosting, AdaBoost, SVR, and MLP Neural Network) with weighted predictions
- **Demand Forecasting** — classifies products into High / Medium / Low demand using DBSCAN and Agglomerative Clustering
- **Dynamic Pricing Engine** — suggests optimal prices using demand signals, price elasticity, and competitive positioning
- **PCA Dimensionality Reduction** — compresses 13+ engineered features for better model performance
- **Model Performance Dashboard** — reports R², RMSE, MAE, and accuracy for each model on train/test splits

### 🔍 Product Finder
- **Text Search** — search Snapdeal by keyword and get ranked results with value scores
- **Visual Search** — upload an image and identify the product category using ResNet50 (ImageNet pre-trained)
- **Value Score Analytics** — ranks products by a rating-to-price ratio

### ⚙️ Feature Engineering (13+ features)
| Feature | Description |
|---|---|
| `review_velocity` | Normalized review count |
| `price_rating_ratio` | Price divided by rating |
| `popularity_index` | Reviews × rating |
| `quality_score` | Rating × log(reviews) |
| `demand_signal` | Weighted composite of reviews, rating, price percentile |
| `price_zscore` | Z-score normalized price |
| `saturation_index` | Reviews per unit price |
| `price_deviation` | Deviation from median price |
| ... and more | |

---

## 🗂️ Project Structure

```
ml_cp_web_latest/
├── app.py          # Flask backend — scraping, ML pipeline, REST API
├── app.js          # Frontend JavaScript — UI logic, chart rendering
├── index.html      # Single-page frontend
├── style.css       # Styles
└── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ecommerce-analytics-ai.git
cd ecommerce-analytics-ai

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running the App

```bash
python app.py
```

Then open `index.html` in your browser (or serve it with a local server). The Flask API runs at `http://localhost:5000`.

---

## 🔌 API Endpoints

### `POST /api/search/snapdeal/advanced`
Runs the full ML pipeline on scraped Snapdeal results.

**Request body:**
```json
{
  "query": "gaming laptop",
  "max_products": 10
}
```

**Response:** Product list with demand scores, pricing suggestions, cluster labels, confidence scores, and per-model performance metrics.

---

### `POST /api/search/snapdeal/basic`
Lightweight product search with value score ranking.

**Request body:**
```json
{
  "query": "wireless headphones",
  "max_products": 10
}
```

**Response:** Ranked product list with price/rating stats.

---

### `POST /api/vision/identify`
Identifies a product from an uploaded image using ResNet50.

**Request body:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "predictions": [
    { "label": "laptop", "confidence": 0.87 },
    ...
  ],
  "top_label": "laptop"
}
```

---

### `GET /health`
Returns `{ "status": "ok" }` — useful for uptime checks.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, Flask-CORS |
| ML / Data | scikit-learn, TensorFlow/Keras, NumPy, pandas, SciPy |
| Computer Vision | ResNet50 (ImageNet weights via Keras) |
| Scraping | requests, BeautifulSoup4, lxml |
| Frontend | Vanilla JS, Chart.js, HTML/CSS |

---

## 📦 Dependencies

```
Flask==2.3.0
flask-cors==4.0.0
requests==2.31.0
beautifulsoup4==4.12.2
pandas==2.0.3
numpy==1.24.3
tensorflow==2.13.0
pillow==10.0.0
scikit-learn==1.3.0
scipy==1.11.1
lxml==4.9.3
```

---

## ⚠️ Notes

- **Scraping** — this project scrapes Snapdeal's public search results. Results depend on Snapdeal's page structure and may break if it changes.
- **ResNet50 weights** — downloaded automatically on first run (~100MB). Requires an internet connection.
- **Small datasets** — the ML pipeline handles edge cases for very small product sets (< 5 products) gracefully.
- The `venv/` folder should be excluded from version control. Add it to `.gitignore`:
  ```
  venv/
  __pycache__/
  *.pyc
  ```

---

## 📄 License

MIT License — feel free to use and adapt.
