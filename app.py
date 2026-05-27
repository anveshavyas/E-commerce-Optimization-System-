from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import numpy as np
import pandas as pd
import re
import base64
from io import BytesIO
from PIL import Image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
from sklearn.preprocessing import RobustScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.cluster import DBSCAN, AgglomerativeClustering
from scipy.stats import zscore
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Load ResNet50 model
resnet_model = ResNet50(weights='imagenet')

# ========================================================================================
# UTILITY FUNCTIONS
# ========================================================================================

def extract_numeric_price(price_str):
    if not price_str or price_str == "":
        return 0.0
    try:
        clean_price = price_str.replace('Rs', '').replace('₹', '').replace(',', '').replace('$', '').strip()
        match = re.search(r'\d+\.?\d*', clean_price)
        if match:
            return float(match.group())
    except:
        return 0.0
    return 0.0

def extract_review_count(review_str):
    if not review_str or review_str == "":
        return 0
    try:
        clean_reviews = review_str.replace(',', '')
        match = re.search(r'\d+', clean_reviews)
        if match:
            return int(match.group())
    except:
        return 0
    return 0

def extract_rating_value(rating_str):
    if not rating_str or rating_str == "":
        return 0.0
    try:
        match = re.search(r'(\d+\.?\d*)\s*out of', rating_str)
        if match:
            return float(match.group(1))
        match = re.search(r'\d+\.?\d*', rating_str)
        if match:
            return float(match.group())
    except:
        return 0.0
    return 0.0

# ========================================================================================
# SCRAPING FUNCTIONS
# ========================================================================================

def scrape_snapdeal_advanced(search_query, max_products=10):
    """Enhanced Snapdeal scraper for advanced analytics"""
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-IN, en;q=0.5'
    }
    
    URL = f"https://www.snapdeal.com/search?keyword={search_query.replace(' ', '+')}"
    
    try:
        webpage = requests.get(URL, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(webpage.content, "html.parser")
    except Exception as e:
        return []
    
    data = []
    products = soup.find_all("div", attrs={'class': 'product-tuple-listing'})[:max_products]
    
    for product in products:
        try:
            title_tag = product.find("p", attrs={'class': 'product-title'})
            title = title_tag.text.strip() if title_tag else ""
            
            price_tag = product.find("span", attrs={'class': 'lfloat product-price'})
            price = price_tag.text.strip() if price_tag else ""
            
            rating_tag = product.find("div", attrs={'class': 'filled-stars'})
            rating = rating_tag.get('style', '').replace('width:', '').replace('%', '') if rating_tag else ""
            if rating:
                rating = f"{float(rating)/20:.1f} out of 5"
            
            review_tag = product.find("p", attrs={'class': 'product-rating-count'})
            reviews = review_tag.text.strip() if review_tag else ""
            
            if not reviews:
                rating_section = product.find("div", attrs={'class': 'product-rating'})
                if rating_section:
                    rating_text = rating_section.get_text()
                    match = re.search(r'(\d+)\s*(?:ratings?|reviews?)', rating_text, re.IGNORECASE)
                    if match:
                        reviews = f"{match.group(1)} ratings"
            
            link_tag = product.find("a", attrs={'class': 'dp-widget-link'})
            link = link_tag.get('href') if link_tag else ""
            
            img_tag = product.find("img", attrs={'class': 'product-image'})
            if not img_tag:
                img_tag = product.find("img")
            
            image_url = ""
            if img_tag:
                image_url = img_tag.get('src') or img_tag.get('data-src') or img_tag.get('srcset', '').split(',')[0].split(' ')[0]
                if image_url and not image_url.startswith('http'):
                    if image_url.startswith('//'):
                        image_url = 'https:' + image_url
                    elif image_url.startswith('/'):
                        image_url = 'https://www.snapdeal.com' + image_url
            
            if title:
                data.append({
                    'title': title,
                    'price': price,
                    'rating': rating,
                    'reviews': reviews,
                    'availability': 'In Stock',
                    'link': link,
                    'image_url': image_url
                })
        except:
            continue
    
    return data

def scrape_snapdeal_basic(search_query, max_products=10):
    """Basic Snapdeal scraper for product finder"""
    data = scrape_snapdeal_advanced(search_query, max_products)
    
    # Add value score calculation
    for item in data:
        item['price_numeric'] = extract_numeric_price(item['price'])
        item['rating_numeric'] = extract_rating_value(item['rating'])
        
        if item['price_numeric'] > 0:
            item['value_score'] = item['rating_numeric'] / (item['price_numeric'] + 1) * 10000
        else:
            item['value_score'] = 0
    
    return data

# ========================================================================================
# ML FUNCTIONS
# ========================================================================================

def engineer_advanced_features(df):
    """Create sophisticated features for ML models"""
    df['price_numeric'] = df['price'].apply(extract_numeric_price)
    df['review_count'] = df['reviews'].apply(extract_review_count)
    df['rating_numeric'] = df['rating'].apply(extract_rating_value)
    
    # Advanced engineered features
    df['review_velocity'] = df['review_count'] / (df['review_count'].max() + 1)
    df['price_rating_ratio'] = df['price_numeric'] / (df['rating_numeric'] + 0.1)
    df['popularity_index'] = df['review_count'] * df['rating_numeric']
    df['price_percentile'] = df['price_numeric'].rank(pct=True)
    df['review_percentile'] = df['review_count'].rank(pct=True)
    df['quality_score'] = (df['rating_numeric'] / 5.0) * np.log1p(df['review_count'])
    df['price_zscore'] = zscore(df['price_numeric'].replace(0, np.nan).fillna(df['price_numeric'].median()))
    df['demand_signal'] = (0.4 * df['review_percentile'] + 0.3 * (df['rating_numeric'] / 5.0) + 0.3 * (1 - df['price_percentile']))
    
    median_price = df[df['price_numeric'] > 0]['price_numeric'].median()
    df['price_deviation'] = abs(df['price_numeric'] - median_price) / (median_price + 1)
    df['review_concentration'] = df['review_count'] / (df['rating_numeric'] + 0.1)
    df['saturation_index'] = df['review_count'] / (df['price_numeric'] + 1)
    
    return df

def advanced_demand_forecasting(data):
    """Multi-algorithm ensemble approach"""
    df = pd.DataFrame(data)
    df = engineer_advanced_features(df)
    
    feature_cols = [
        'review_count', 'rating_numeric', 'price_numeric',
        'review_velocity', 'price_rating_ratio', 'popularity_index',
        'price_percentile', 'review_percentile', 'quality_score',
        'demand_signal', 'price_deviation', 'review_concentration',
        'saturation_index'
    ]
    
    features = df[feature_cols].copy()
    features.fillna(0, inplace=True)
    
    scaler = RobustScaler()
    features_scaled = scaler.fit_transform(features)
    
    n_samples, n_features = features_scaled.shape
    n_components = min(n_samples - 1, n_features, 8)
    
    if n_components >= 2:
        pca = PCA(n_components=n_components)
        features_pca = pca.fit_transform(features_scaled)
    else:
        features_pca = features_scaled
    
    # DBSCAN clustering
    min_samples_dbscan = min(2, n_samples - 1)
    dbscan = DBSCAN(eps=0.5, min_samples=min_samples_dbscan)
    df['density_cluster'] = dbscan.fit_predict(features_pca)
    
    # Hierarchical clustering
    n_clusters = min(3, n_samples)
    if n_clusters >= 2:
        agg_cluster = AgglomerativeClustering(n_clusters=n_clusters)
        df['demand_cluster'] = agg_cluster.fit_predict(features_scaled)
    else:
        df['demand_cluster'] = 0
    
    # Map clusters to demand categories
    if n_clusters >= 3:
        cluster_means = []
        for i in range(n_clusters):
            cluster_data = df[df['demand_cluster'] == i]
            if len(cluster_data) > 0:
                mean_score = cluster_data['demand_signal'].mean()
                cluster_means.append((i, mean_score))
        cluster_means.sort(key=lambda x: x[1])
        cluster_mapping = {
            cluster_means[0][0]: 'Low Demand',
            cluster_means[1][0]: 'Medium Demand',
            cluster_means[2][0]: 'High Demand'
        }
        df['demand_category'] = df['demand_cluster'].map(cluster_mapping)
    elif n_clusters == 2:
        cluster_means = []
        for i in range(n_clusters):
            cluster_data = df[df['demand_cluster'] == i]
            if len(cluster_data) > 0:
                mean_score = cluster_data['demand_signal'].mean()
                cluster_means.append((i, mean_score))
        cluster_means.sort(key=lambda x: x[1])
        cluster_mapping = {
            cluster_means[0][0]: 'Low Demand',
            cluster_means[1][0]: 'High Demand'
        }
        df['demand_category'] = df['demand_cluster'].map(cluster_mapping)
    else:
        df['demand_category'] = 'Medium Demand'
    
    # Ensemble Model Training
    y = (df['review_percentile'] * 40 + (df['rating_numeric'] / 5.0) * 30 + df['demand_signal'] * 30)
    X = features_pca
    
    # Initialize models
    rf_model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
    gb_model = GradientBoostingRegressor(n_estimators=50, learning_rate=0.1, max_depth=3, random_state=42)
    ada_model = AdaBoostRegressor(n_estimators=30, learning_rate=0.5, random_state=42)
    svr_model = SVR(kernel='rbf', C=1.0, epsilon=0.1)
    hidden_layers = (min(32, n_samples * 2), min(16, n_samples))
    mlp_model = MLPRegressor(hidden_layer_sizes=hidden_layers, activation='relu', solver='adam', max_iter=500, random_state=42)
    
    # Train all models
    rf_model.fit(X, y)
    gb_model.fit(X, y)
    ada_model.fit(X, y)
    svr_model.fit(X, y)
    mlp_model.fit(X, y)
    
    # Get predictions
    rf_pred = rf_model.predict(X)
    gb_pred = gb_model.predict(X)
    ada_pred = ada_model.predict(X)
    svr_pred = svr_model.predict(X)
    mlp_pred = mlp_model.predict(X)
    
    # Calculate performance metrics
    models_dict = {
        'Random Forest': rf_model,
        'Gradient Boosting': gb_model,
        'AdaBoost': ada_model,
        'SVR': svr_model,
        'Neural Network (MLP)': mlp_model
    }
    
    performance_metrics = calculate_model_performance(df, X, y, models_dict)
    
    # Ensemble prediction
    ensemble_weights = [0.25, 0.25, 0.20, 0.15, 0.15]
    df['demand_score'] = (
        ensemble_weights[0] * rf_pred +
        ensemble_weights[1] * gb_pred +
        ensemble_weights[2] * ada_pred +
        ensemble_weights[3] * svr_pred +
        ensemble_weights[4] * mlp_pred
    )
    
    df['demand_score'] = df['demand_score'].clip(0, 100)
    df['forecast_trend'] = df['demand_score'].apply(
        lambda x: 'Growing' if x > 65 else ('Stable' if x > 40 else 'Declining')
    )
    
    predictions_std = np.std([rf_pred, gb_pred, ada_pred, svr_pred, mlp_pred], axis=0)
    df['confidence_score'] = 100 - (predictions_std / df['demand_score'].std() * 100).clip(0, 50)
    
    # Store performance metrics in df for API response
    df.attrs['performance_metrics'] = performance_metrics
    
    return df
def advanced_dynamic_pricing(df):
    """Sophisticated pricing using multiple optimization algorithms"""
    valid_prices = df[df['price_numeric'] > 0]['price_numeric']
    
    if len(valid_prices) == 0:
        return df
    
    market_stats = {
        'mean': valid_prices.mean(),
        'median': valid_prices.median(),
        'std': valid_prices.std(),
        'q25': valid_prices.quantile(0.25),
        'q75': valid_prices.quantile(0.75),
    }
    
    for idx, row in df.iterrows():
        base_price = row['price_numeric']
        
        if base_price == 0:
            df.at[idx, 'suggested_price'] = 0
            df.at[idx, 'price_change'] = "N/A"
            df.at[idx, 'pricing_strategy'] = "No Data"
            df.at[idx, 'optimization_score'] = 0
            df.at[idx, 'elasticity'] = 0
            continue
        
        demand_score = row['demand_score']
        demand_category = row['demand_category']
        quality_score = row['quality_score']
        price_percentile = row['price_percentile']
        confidence = row['confidence_score']
        
        price_position = (base_price - market_stats['median']) / (market_stats['std'] + 1)
        elasticity = -0.5 - (0.3 * (1 - demand_score / 100))
        
        competitive_pressure = 1.0
        if base_price > market_stats['q75']:
            competitive_pressure = 0.92
        elif base_price < market_stats['q25']:
            competitive_pressure = 1.08
        
        if demand_category == 'High Demand':
            base_multiplier = 1.08 + (demand_score - 65) * 0.005
            if quality_score > 3.5:
                base_multiplier *= 1.03
            base_multiplier = base_multiplier * (0.9 + confidence / 1000)
            strategy = "Premium Pricing"
        elif demand_category == 'Medium Demand':
            if price_position > 0.5:
                base_multiplier = 0.95 + (demand_score / 100) * 0.08
                strategy = "Market Optimization"
            elif price_position < -0.5:
                base_multiplier = 1.02 + (demand_score / 100) * 0.06
                strategy = "Value Capture"
            else:
                base_multiplier = 0.98 + (demand_score / 100) * 0.05
                strategy = "Market Alignment"
        else:
            discount_rate = 0.85 + (demand_score / 40) * 0.10
            if quality_score > 3.0:
                discount_rate = max(discount_rate, 0.90)
            base_multiplier = discount_rate
            strategy = "Promotional Pricing"
        
        base_multiplier *= competitive_pressure
        expected_demand_change = elasticity * (base_multiplier - 1)
        revenue_impact = (1 + expected_demand_change) * base_multiplier
        
        if revenue_impact < 0.95:
            base_multiplier = base_multiplier * 1.03
        
        suggested_price = base_price * base_multiplier
        suggested_price = max(min(suggested_price, base_price * 1.20), base_price * 0.80)
        
        price_change = ((suggested_price - base_price) / base_price) * 100
        optimization_score = revenue_impact * 100
        
        df.at[idx, 'suggested_price'] = round(suggested_price, 2)
        df.at[idx, 'price_change'] = f"{price_change:+.1f}%"
        df.at[idx, 'pricing_strategy'] = strategy
        df.at[idx, 'optimization_score'] = round(optimization_score, 1)
        df.at[idx, 'elasticity'] = round(elasticity, 3)
    
    return df
def calculate_model_performance(df, X, y, models_data):
    """Calculate comprehensive performance metrics for all ML models"""
    from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
    from sklearn.model_selection import train_test_split
    
    # Split data for train/test evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    performance_metrics = []
    all_predictions = {'train': {}, 'test': {}}
    model_weights = {}
    
    # Define weights dynamically
    total_models = len(models_data)
    if total_models == 5:
        weight_list = [0.25, 0.25, 0.20, 0.15, 0.15]
    else:
        # Fallback: equal weights
        weight_list = [1.0 / total_models] * total_models
    
    model_names_list = list(models_data.keys())
    for idx, name in enumerate(model_names_list):
        model_weights[name] = weight_list[idx]
    
    # Calculate predictions for each model
    for model_name, model in models_data.items():
        # Retrain on split data
        model.fit(X_train, y_train)
        
        # Predictions
        y_train_pred = model.predict(X_train)
        y_test_pred = model.predict(X_test)
        
        # Store predictions for ensemble calculation
        all_predictions['train'][model_name] = y_train_pred
        all_predictions['test'][model_name] = y_test_pred
        
        # Training metrics
        train_r2 = max(0, r2_score(y_train, y_train_pred))
        train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        train_mae = mean_absolute_error(y_train, y_train_pred)
        
        # Testing metrics
        test_r2 = max(0, r2_score(y_test, y_test_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
        test_mae = mean_absolute_error(y_test, y_test_pred)
        
        # Calculate accuracy percentages
        train_mape = np.mean(np.abs((y_train - y_train_pred) / (y_train + 1e-10))) * 100
        test_mape = np.mean(np.abs((y_test - y_test_pred) / (y_test + 1e-10))) * 100
        
        train_accuracy = max(0, 100 - train_mape)
        test_accuracy = max(0, 100 - test_mape)
        
        # Average demand scores predicted by this model
        avg_train_demand = float(np.mean(y_train_pred))
        avg_test_demand = float(np.mean(y_test_pred))
        
        performance_metrics.append({
            'model': model_name,
            'weight': model_weights[model_name],
            'train_r2': round(train_r2, 4),
            'test_r2': round(test_r2, 4),
            'train_rmse': round(train_rmse, 4),
            'test_rmse': round(test_rmse, 4),
            'train_mae': round(train_mae, 4),
            'test_mae': round(test_mae, 4),
            'train_accuracy': round(train_accuracy, 2),
            'test_accuracy': round(test_accuracy, 2),
            'avg_train_demand': round(avg_train_demand, 2),
            'avg_test_demand': round(avg_test_demand, 2)
        })
    
    # Calculate ensemble predictions
    ensemble_train = sum(all_predictions['train'][name] * model_weights[name] for name in model_names_list)
    ensemble_test = sum(all_predictions['test'][name] * model_weights[name] for name in model_names_list)
    
    # Calculate confidence score (based on prediction variance)
    test_predictions_array = np.array([all_predictions['test'][name] for name in model_names_list])
    prediction_std = np.std(test_predictions_array, axis=0)
    overall_std = np.mean(prediction_std)
    max_possible_std = np.std(ensemble_test)
    
    if max_possible_std > 0:
        confidence_raw = 100 - (overall_std / max_possible_std * 100)
    else:
        confidence_raw = 100
    
    confidence_score = max(0, min(100, confidence_raw))
    
    # Ensemble metrics
    ensemble_train_r2 = max(0, r2_score(y_train, ensemble_train))
    ensemble_test_r2 = max(0, r2_score(y_test, ensemble_test))
    ensemble_train_rmse = np.sqrt(mean_squared_error(y_train, ensemble_train))
    ensemble_test_rmse = np.sqrt(mean_squared_error(y_test, ensemble_test))
    ensemble_train_mae = mean_absolute_error(y_train, ensemble_train)
    ensemble_test_mae = mean_absolute_error(y_test, ensemble_test)
    
    ensemble_train_mape = np.mean(np.abs((y_train - ensemble_train) / (y_train + 1e-10))) * 100
    ensemble_test_mape = np.mean(np.abs((y_test - ensemble_test) / (y_test + 1e-10))) * 100
    
    avg_ensemble_train_demand = float(np.mean(ensemble_train))
    avg_ensemble_test_demand = float(np.mean(ensemble_test))
    
    performance_metrics.append({
        'model': 'Ensemble (Weighted)',
        'weight': 1.0,
        'train_r2': round(ensemble_train_r2, 4),
        'test_r2': round(ensemble_test_r2, 4),
        'train_rmse': round(ensemble_train_rmse, 4),
        'test_rmse': round(ensemble_test_rmse, 4),
        'train_mae': round(ensemble_train_mae, 4),
        'test_mae': round(ensemble_test_mae, 4),
        'train_accuracy': round(max(0, 100 - ensemble_train_mape), 2),
        'test_accuracy': round(max(0, 100 - ensemble_test_mape), 2),
        'avg_train_demand': round(avg_ensemble_train_demand, 2),
        'avg_test_demand': round(avg_ensemble_test_demand, 2),
        'confidence_score': round(confidence_score, 2)
    })
    
    return performance_metrics
# ========================================================================================
# API ENDPOINTS
# ========================================================================================

@app.route('/api/search/snapdeal/advanced', methods=['POST'])
def search_snapdeal_advanced():
    """Advanced analytics endpoint"""
    data = request.json
    query = data.get('query', '')
    max_products = data.get('max_products', 10)
    
    # Scrape data
    products = scrape_snapdeal_advanced(query, max_products)
    
    if not products:
        return jsonify({'error': 'No products found'}), 404
    
    # Run ML analysis
    df = advanced_demand_forecasting(products)
    df = advanced_dynamic_pricing(df)
    
    # Get performance metrics
    performance_metrics = df.attrs.get('performance_metrics', [])
    
    # Calculate summary
    summary = {
        'total': len(df),
        'avg_demand': float(df['demand_score'].mean()),
        'high_demand': int(len(df[df['demand_category'] == 'High Demand'])),
        'medium_demand': int(len(df[df['demand_category'] == 'Medium Demand'])),
        'low_demand': int(len(df[df['demand_category'] == 'Low Demand'])),
        'avg_price': float(df[df['price_numeric'] > 0]['price_numeric'].mean()) if len(df[df['price_numeric'] > 0]) > 0 else 0,
        'avg_confidence': float(df['confidence_score'].mean())
    }
    
    # Convert to dict
    products_data = df.to_dict('records')
    
    return jsonify({
        'products': products_data,
        'summary': summary,
        'performance_metrics': performance_metrics,
        'query': query
    })

@app.route('/api/search/snapdeal/basic', methods=['POST'])
def search_snapdeal_basic():
    """Basic product finder endpoint"""
    data = request.json
    query = data.get('query', '')
    max_products = data.get('max_products', 10)
    
    products = scrape_snapdeal_basic(query, max_products)
    
    if not products:
        return jsonify({'error': 'No products found'}), 404
    
    # Sort by value score
    products.sort(key=lambda x: x.get('value_score', 0), reverse=True)
    
    # Calculate stats
    prices = [p['price_numeric'] for p in products if p['price_numeric'] > 0]
    ratings = [p['rating_numeric'] for p in products if p['rating_numeric'] > 0]
    
    stats = {
        'total': len(products),
        'avg_price': sum(prices) / len(prices) if prices else 0,
        'min_price': min(prices) if prices else 0,
        'max_price': max(prices) if prices else 0,
        'avg_rating': sum(ratings) / len(ratings) if ratings else 0
    }
    
    return jsonify({
        'products': products,
        'stats': stats,
        'query': query
    })

@app.route('/api/vision/identify', methods=['POST'])
def identify_image():
    """ResNet50 image identification"""
    data = request.json
    image_data = data.get('image', '')
    
    # Decode base64 image
    image_data = image_data.split(',')[1] if ',' in image_data else image_data
    img_bytes = base64.b64decode(image_data)
    img = Image.open(BytesIO(img_bytes))
    
    # Preprocess
    img = img.resize((224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    
    # Predict
    preds = resnet_model.predict(x, verbose=0)
    decoded = decode_predictions(preds, top=3)[0]
    
    results = []
    for _, label, confidence in decoded:
        results.append({
            'label': label,
            'confidence': float(confidence)
        })
    
    return jsonify({
        'predictions': results,
        'top_label': results[0]['label']
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

