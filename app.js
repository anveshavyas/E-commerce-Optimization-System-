// Configuration
const API_URL = 'http://localhost:5000';

// Global State
let advancedData = null;
let finderData = null;
let currentAdvancedFilter = 'all';
let currentFinderMode = 'text';
let uploadedImageData = null;

// ========================================================================================
// VIEW MANAGEMENT
// ========================================================================================

function showView(view) {
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('advancedView').classList.add('hidden');
    document.getElementById('finderView').classList.add('hidden');
    
    document.getElementById(view + 'View').classList.remove('hidden');
    window.scrollTo(0, 0);
}

// ========================================================================================
// ADVANCED ANALYTICS PLATFORM
// ========================================================================================

async function searchAdvanced() {
    const query = document.getElementById('advancedQuery').value;
    const maxProducts = parseInt(document.getElementById('advancedMaxProducts').value);

    if (!query) {
        showError('advancedError', 'Please enter a search query');
        return;
    }

    hideError('advancedError');
    document.getElementById('advancedLoading').classList.remove('hidden');
    document.getElementById('advancedResults').classList.add('hidden');

    const steps = [
        'Scraping Snapdeal products...',
        'Extracting features (13+ metrics)...',
        'Running Random Forest model...',
        'Running Gradient Boosting model...',
        'Running AdaBoost model...',
        'Running SVR model...',
        'Running Neural Network (MLP)...',
        'Applying PCA dimensionality reduction...',
        'Performing DBSCAN clustering...',
        'Hierarchical clustering analysis...',
        'Calculating ensemble predictions...',
        'Optimizing dynamic pricing...',
        'Calculating price elasticity...',
        'Computing performance metrics...'
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            document.getElementById('advancedLoadingText').textContent = steps[stepIndex];
            stepIndex++;
        }
    }, 600);

    try {
        const response = await fetch(`${API_URL}/api/search/snapdeal/advanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_products: maxProducts })
        });

        if (!response.ok) throw new Error('Search failed');

        advancedData = await response.json();
        
        clearInterval(stepInterval);
        document.getElementById('advancedLoading').classList.add('hidden');
        document.getElementById('advancedResults').classList.remove('hidden');
        
        displayAdvancedResults();
    } catch (error) {
        clearInterval(stepInterval);
        document.getElementById('advancedLoading').classList.add('hidden');
        showError('advancedError', `Error: ${error.message}. Make sure Flask backend is running.`);
    }
}

function displayAdvancedResults() {
    const { products, summary } = advancedData;

    // Summary Stats - Only show: Products Analyzed, Avg Demand Score, High Demand, Avg Market Price, Model Confidence
    document.getElementById('advancedSummary').innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${summary.total}</div>
            <div class="stat-label">Products Analyzed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${summary.avg_demand.toFixed(1)}</div>
            <div class="stat-label">Avg Demand Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${summary.high_demand}</div>
            <div class="stat-label">High Demand</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">₹${summary.avg_price.toFixed(0)}</div>
            <div class="stat-label">Avg Market Price</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${summary.avg_confidence.toFixed(1)}%</div>
            <div class="stat-label">Model Confidence</div>
        </div>
    `;

    createAdvancedCharts();
    createPerformanceCharts(); 
    displayAdvancedProducts();
}

function createAdvancedCharts() {
    const { products, summary } = advancedData;

    // 1. Demand Distribution Chart - Use actual product titles instead of P1, P2, P3
    const ctx1 = document.getElementById('advancedDemandChart').getContext('2d');
    new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: products.map(p => p.title.substring(0, 30) + '...'),
            datasets: [{
                label: 'Demand Score (Ensemble)',
                data: products.map(p => p.demand_score),
                backgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    callbacks: {
                        title: (context) => products[context[0].dataIndex].title,
                        label: (context) => `Demand Score: ${context.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 2. Scatter Chart (Demand vs Price)
    const ctx2 = document.getElementById('advancedScatterChart').getContext('2d');
    new Chart(ctx2, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Products',
                data: products.map(p => ({ 
                    x: p.demand_score, 
                    y: p.price_numeric,
                    title: p.title
                })),
                backgroundColor: products.map(p => 
                    p.demand_category === 'High Demand' ? '#10b981' : 
                    p.demand_category === 'Medium Demand' ? '#f59e0b' : '#ef4444'
                ),
                pointRadius: 8,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => context[0].raw.title,
                        label: (context) => [
                            `Demand: ${context.parsed.x.toFixed(1)}`,
                            `Price: ₹${context.parsed.y.toFixed(2)}`
                        ]
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Price (₹)', color: '#94a3b8' }, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { title: { display: true, text: 'Demand Score', color: '#94a3b8' }, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 3. Pie Chart (Demand Categories) - Smaller size
    const ctx3 = document.getElementById('advancedPieChart').getContext('2d');
    new Chart(ctx3, {
        type: 'pie',
        data: {
            labels: ['High Demand', 'Medium Demand', 'Low Demand'],
            datasets: [{
                data: [summary.high_demand, summary.medium_demand, summary.low_demand],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: { legend: { labels: { color: '#f1f5f9' }, position: 'right' } }
        }
    });

    // 4. Pricing Comparison Chart - Use actual product titles
    const ctx4 = document.getElementById('advancedPricingChart').getContext('2d');
    const top10 = products.slice(0, 10);
    new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: top10.map(p => p.title.substring(0, 30) + '...'),
            datasets: [
                { label: 'Current Price', data: top10.map(p => p.price_numeric), backgroundColor: '#94a3b8' },
                { label: 'AI-Optimized Price', data: top10.map(p => p.suggested_price), backgroundColor: '#6366f1' }
            ]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    callbacks: {
                        title: (context) => top10[context[0].dataIndex].title
                    }
                }
            },
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 5. Revenue Optimization Chart - Use actual product titles
    const ctx5 = document.getElementById('advancedRevenueChart').getContext('2d');
    new Chart(ctx5, {
        type: 'line',
        data: {
            labels: products.map(p => p.title.substring(0, 30) + '...'),
            datasets: [{
                label: 'Revenue Impact Score',
                data: products.map(p => p.optimization_score),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    callbacks: {
                        title: (context) => products[context[0].dataIndex].title
                    }
                }
            },
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 6. Strategy Distribution Pie - Smaller size, change colors: remove light blue, dark blue, replace with red
    const strategies = {
        premium: products.filter(p => p.pricing_strategy === 'Premium Pricing').length,
        market: products.filter(p => p.pricing_strategy.includes('Market') || p.pricing_strategy.includes('Value')).length,
        promo: products.filter(p => p.pricing_strategy === 'Promotional Pricing').length
    };
    
    const ctx6 = document.getElementById('advancedStrategyPie').getContext('2d');
    new Chart(ctx6, {
        type: 'doughnut',
        data: {
            labels: ['Premium', 'Market Positioning', 'Promotional'],
            datasets: [{
                data: [strategies.premium, strategies.market, strategies.promo],
                backgroundColor: ['#6366f1', '#ef4444', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: { legend: { labels: { color: '#f1f5f9' }, position: 'right' } }
        }
    });

    // 7. Elasticity Chart
    const ctx7 = document.getElementById('advancedElasticityChart').getContext('2d');
    new Chart(ctx7, {
        type: 'bar',
        data: {
            labels: products.map(p => p.title.substring(0, 30) + '...'),
            datasets: [{
                label: 'Price Elasticity',
                data: products.map(p => p.elasticity),
                backgroundColor: products.map(p => 
                    p.elasticity < -0.7 ? '#ef4444' : p.elasticity < -0.5 ? '#f59e0b' : '#10b981'
                )
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => products[context[0].dataIndex].title
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Elasticity Coefficient', color: '#94a3b8' }, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // Display Opportunities
    const highDemand = products.filter(p => p.demand_category === 'High Demand').slice(0, 5);
    let oppHTML = '<div class="chart-container"><h3 class="chart-title">🏆 Top Opportunities (High Demand Products)</h3>';
    highDemand.forEach((p, idx) => {
        oppHTML += `
            <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.8rem;">
                    <h4 style="color: #10b981; flex: 1;">#${idx + 1} ${p.title.substring(0, 60)}...</h4>
                    <span class="badge badge-high">${p.forecast_trend}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; font-size: 0.9rem; color: #94a3b8;">
                    <div>Score: <strong style="color: #f1f5f9;">${p.demand_score.toFixed(1)}</strong></div>
                    <div>Confidence: <strong style="color: #f1f5f9;">${p.confidence_score.toFixed(1)}%</strong></div>
                    <div>Reviews: <strong style="color: #f1f5f9;">${p.review_count}</strong></div>
                    <div>Quality: <strong style="color: #f1f5f9;">${p.quality_score.toFixed(2)}</strong></div>
                </div>
            </div>
        `;
    });
    oppHTML += '</div>';
    document.getElementById('advancedOpportunities').innerHTML = oppHTML;

    // Demand Insights
    const avgDemand = summary.avg_demand;
    let insightsHTML = `
        <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #6366f1; margin-bottom: 1rem;">📊 Market Overview</h4>
            <p style="color: #94a3b8; line-height: 1.6;">
                The ensemble model (RF + GB + AdaBoost + SVR + MLP) calculated an average demand score of <strong style="color: #f1f5f9;">${avgDemand.toFixed(1)}</strong>. 
                Out of ${summary.total} products, <strong style="color: #10b981;">${summary.high_demand} (${(summary.high_demand/summary.total*100).toFixed(1)}%)</strong> show high demand, 
                <strong style="color: #f59e0b;">${summary.medium_demand} (${(summary.medium_demand/summary.total*100).toFixed(1)}%)</strong> have medium demand, 
                and <strong style="color: #ef4444;">${summary.low_demand} (${(summary.low_demand/summary.total*100).toFixed(1)}%)</strong> exhibit low demand.
            </p>
        </div>
        <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem;">
            <h4 style="color: #10b981; margin-bottom: 1rem;">🎯 Strategic Recommendations</h4>
            <ul style="color: #94a3b8; line-height: 1.8; padding-left: 1.5rem;">
                ${summary.high_demand > 0 ? `<li><strong style="color: #f1f5f9;">High Demand Products:</strong> Focus on premium pricing strategies for ${summary.high_demand} products. Average confidence: ${summary.avg_confidence.toFixed(1)}%</li>` : ''}
                ${summary.medium_demand > 0 ? `<li><strong style="color: #f1f5f9;">Medium Demand Products:</strong> Optimize marketing and consider market alignment pricing for ${summary.medium_demand} products.</li>` : ''}
                ${summary.low_demand > 0 ? `<li><strong style="color: #f1f5f9;">Low Demand Products:</strong> Apply promotional pricing strategies to ${summary.low_demand} products to boost sales velocity.</li>` : ''}
            </ul>
        </div>
    `;
    document.getElementById('demandInsightsContent').innerHTML = insightsHTML;

    // Strategy Stats - Add pricing strategy insights with text details
    const premiumProds = products.filter(p => p.pricing_strategy === 'Premium Pricing');
    const marketProds = products.filter(p => p.pricing_strategy.includes('Market') || p.pricing_strategy.includes('Value'));
    const promoProds = products.filter(p => p.pricing_strategy === 'Promotional Pricing');
    
    const premiumAvgRevenue = premiumProds.length > 0 ? (premiumProds.reduce((s, p) => s + p.optimization_score, 0) / premiumProds.length - 100).toFixed(1) : 0;
    const marketAvgRevenue = marketProds.length > 0 ? (marketProds.reduce((s, p) => s + p.optimization_score, 0) / marketProds.length - 100).toFixed(1) : 0;
    const promoAvgRevenue = promoProds.length > 0 ? (promoProds.reduce((s, p) => s + p.optimization_score, 0) / promoProds.length - 100).toFixed(1) : 0;
    
    let strategyDetailsHTML = `
        <div class="chart-container">
            <h3 class="chart-title">📋 Pricing Strategy Distribution Details</h3>
    `;
    
    if (premiumProds.length > 0) {
        strategyDetailsHTML += `
            <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid #6366f1; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                <h4 style="color: #6366f1; margin-bottom: 1rem;">💎 Premium Pricing Strategy</h4>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Number of Products:</strong> ${premiumProds.length}</p>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Average Revenue Impact:</strong> +${premiumAvgRevenue}%</p>
                <p style="color: #94a3b8;"><strong style="color: #f1f5f9;">Top Candidates:</strong></p>
                <ul style="color: #94a3b8; padding-left: 1.5rem; margin-top: 0.5rem;">
                    ${premiumProds.slice(0, 3).map(p => `<li>${p.title.substring(0, 60)}... (Revenue Impact: ${p.optimization_score.toFixed(1)}%)</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (marketProds.length > 0) {
        strategyDetailsHTML += `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                <h4 style="color: #ef4444; margin-bottom: 1rem;">🎯 Market Positioning Strategy</h4>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Number of Products:</strong> ${marketProds.length}</p>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Average Revenue Impact:</strong> ${marketAvgRevenue}%</p>
                <p style="color: #94a3b8;"><strong style="color: #f1f5f9;">Top Candidates:</strong></p>
                <ul style="color: #94a3b8; padding-left: 1.5rem; margin-top: 0.5rem;">
                    ${marketProds.slice(0, 3).map(p => `<li>${p.title.substring(0, 60)}... (Revenue Impact: ${p.optimization_score.toFixed(1)}%)</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (promoProds.length > 0) {
        strategyDetailsHTML += `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                <h4 style="color: #f59e0b; margin-bottom: 1rem;">🎁 Promotional Pricing Strategy</h4>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Number of Products:</strong> ${promoProds.length}</p>
                <p style="color: #94a3b8; margin-bottom: 0.8rem;"><strong style="color: #f1f5f9;">Average Revenue Impact:</strong> ${promoAvgRevenue}%</p>
                <p style="color: #94a3b8;"><strong style="color: #f1f5f9;">Top Candidates:</strong></p>
                <ul style="color: #94a3b8; padding-left: 1.5rem; margin-top: 0.5rem;">
                    ${promoProds.slice(0, 3).map(p => `<li>${p.title.substring(0, 60)}... (Revenue Impact: ${p.optimization_score.toFixed(1)}%)</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    strategyDetailsHTML += '</div>';
    document.getElementById('pricingStrategyDetails').innerHTML = strategyDetailsHTML;
    
    document.getElementById('advancedStrategies').innerHTML = `
        <div class="stat-card">
            <div class="stat-number" style="color: #6366f1;">${premiumProds.length}</div>
            <div class="stat-label">Premium Strategy</div>
            ${premiumProds.length > 0 ? `<p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Avg Impact: +${premiumAvgRevenue}%</p>` : ''}
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #ef4444;">${marketProds.length}</div>
            <div class="stat-label">Market Positioning</div>
            ${marketProds.length > 0 ? `<p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Avg Impact: ${marketAvgRevenue}%</p>` : ''}
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #f59e0b;">${promoProds.length}</div>
            <div class="stat-label">Promotional Pricing</div>
            ${promoProds.length > 0 ? `<p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Avg Impact: ${promoAvgRevenue}%</p>` : ''}
        </div>
    `;
}

function displayAdvancedProducts() {
    const filtered = currentAdvancedFilter === 'all' 
        ? advancedData.products 
        : advancedData.products.filter(p => p.demand_category === 'High Demand');

    let html = '';
    filtered.forEach(p => {
        const priceChangePercent = parseFloat(p.price_change.replace('%', '').replace('+', ''));
        
        html += `
            <div class="product-card">
                <img src="${p.image_url || 'https://via.placeholder.com/200x200/1e293b/6366f1?text=No+Image'}" alt="${p.title}" class="product-image" onerror="this.src='https://via.placeholder.com/200x200/1e293b/6366f1?text=No+Image'">
                <div class="product-title">${p.title}</div>
                
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 8px;">
                    <h4 style="color: #6366f1; font-size: 0.9rem; margin-bottom: 0.8rem;">📈 Demand Forecasting</h4>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Demand Score:</span>
                        <span class="info-value" style="color: ${p.demand_category === 'High Demand' ? '#10b981' : p.demand_category === 'Medium Demand' ? '#f59e0b' : '#ef4444'};">${p.demand_score.toFixed(1)}/100</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Confidence:</span>
                        <span class="info-value">${p.confidence_score.toFixed(1)}%</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Category:</span>
                        <span class="badge ${p.demand_category === 'High Demand' ? 'badge-high' : p.demand_category === 'Medium Demand' ? 'badge-medium' : 'badge-low'}">${p.demand_category}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Trend:</span>
                        <span class="info-value">${p.forecast_trend}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Reviews:</span>
                        <span class="info-value">${p.review_count}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Rating:</span>
                        <span class="info-value">${p.rating_numeric} ⭐</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Quality Score:</span>
                        <span class="info-value">${p.quality_score.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                    <h4 style="color: #10b981; font-size: 0.9rem; margin-bottom: 0.8rem;">💰 Dynamic Pricing</h4>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Current Price:</span>
                        <span class="info-value">₹${p.price_numeric.toFixed(2)}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Optimized Price:</span>
                        <span class="info-value" style="color: #6366f1;">₹${p.suggested_price.toFixed(2)}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Change:</span>
                        <span class="info-value" style="color: ${priceChangePercent >= 0 ? '#10b981' : '#ef4444'};">${p.price_change}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Percent Change:</span>
                        <span class="info-value" style="color: ${priceChangePercent >= 0 ? '#10b981' : '#ef4444'};">${Math.abs(priceChangePercent).toFixed(1)}%</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Strategy:</span>
                        <span class="info-value" style="font-size: 0.8rem;">${p.pricing_strategy}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Revenue Impact:</span>
                        <span class="info-value" style="color: #6366f1;">${p.optimization_score.toFixed(1)}%</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Price Elasticity:</span>
                        <span class="info-value">${p.elasticity.toFixed(3)}</span>
                    </div>
                    <div class="product-info" style="border: none; padding: 0.3rem 0;">
                        <span class="info-label">Availability:</span>
                        <span class="info-value" style="color: #10b981;">In Stock</span>
                    </div>
                </div>
                
                <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="width: 100%; margin-top: 1rem; justify-content: center;">
                    🔗 View on Snapdeal
                </a>
            </div>
        `;
    });
    document.getElementById('advancedProductGrid').innerHTML = html;
}
function createPerformanceCharts() {
    const metrics = advancedData.performance_metrics;
    
    if (!metrics || metrics.length === 0) {
        document.getElementById('performanceMetricsTable').innerHTML = '<p style="color: #94a3b8;">No performance metrics available</p>';
        return;
    }
    
    const modelNames = metrics.map(m => m.model);
    
    // 1. Model Performance Comparison (R² Score)
    const ctx1 = document.getElementById('performanceComparisonChart').getContext('2d');
    new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: modelNames,
            datasets: [{
                label: 'Test R² Score',
                data: metrics.map(m => m.test_r2),
                backgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 1,
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'R² Score', color: '#94a3b8' }
                },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
    
    // 2. R² Train vs Test Comparison
    const ctx2 = document.getElementById('r2ComparisonChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: modelNames,
            datasets: [
                {
                    label: 'Train R²',
                    data: metrics.map(m => m.train_r2),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Test R²',
                    data: metrics.map(m => m.test_r2),
                    backgroundColor: '#6366f1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 1,
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' }
                },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
    
    // 3. RMSE Comparison
    const ctx3 = document.getElementById('rmseComparisonChart').getContext('2d');
    new Chart(ctx3, {
        type: 'line',
        data: {
            labels: modelNames,
            datasets: [
                {
                    label: 'Train RMSE',
                    data: metrics.map(m => m.train_rmse),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Test RMSE',
                    data: metrics.map(m => m.test_rmse),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#334155' }, 
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'RMSE', color: '#94a3b8' }
                },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
    
    // 4. Accuracy Comparison
    const ctx4 = document.getElementById('accuracyComparisonChart').getContext('2d');
    new Chart(ctx4, {
        type: 'radar',
        data: {
            labels: modelNames,
            datasets: [
                {
                    label: 'Train Accuracy',
                    data: metrics.map(m => m.train_accuracy),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    pointBackgroundColor: '#10b981'
                },
                {
                    label: 'Test Accuracy',
                    data: metrics.map(m => m.test_accuracy),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    pointBackgroundColor: '#6366f1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8', backdropColor: 'transparent' },
                    pointLabels: { color: '#94a3b8' }
                }
            }
        }
    });
    
 // 6. Performance Metrics Table
let tableHTML = `
    <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; color: #f1f5f9; font-size: 0.9rem;">
            <thead>
                <tr style="background: rgba(99, 102, 241, 0.1); border-bottom: 2px solid #6366f1;">
                    <th style="padding: 1rem; text-align: left;">Model</th>
                    <th style="padding: 1rem; text-align: center;">Weight</th>
                    <th style="padding: 1rem; text-align: center;">Avg Train Demand</th>
                    <th style="padding: 1rem; text-align: center;">Avg Test Demand</th>
                    <th style="padding: 1rem; text-align: center;">Train R²</th>
                    <th style="padding: 1rem; text-align: center;">Test R²</th>
                    <th style="padding: 1rem; text-align: center;">Train RMSE</th>
                    <th style="padding: 1rem; text-align: center;">Test RMSE</th>
                    <th style="padding: 1rem; text-align: center;">Train Acc %</th>
                    <th style="padding: 1rem; text-align: center;">Test Acc %</th>
                </tr>
            </thead>
            <tbody>
`;

metrics.forEach((m, idx) => {
    const bgColor = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(15, 23, 42, 0.3)';
    const isEnsemble = m.model === 'Ensemble (Weighted)';
    const rowStyle = isEnsemble ? 'background: rgba(99, 102, 241, 0.2); border-top: 2px solid #6366f1; font-weight: 700;' : `background: ${bgColor};`;
    
    const weightDisplay = (m.weight * 100).toFixed(0) + '%';
    
    tableHTML += `
        <tr style="${rowStyle} border-bottom: 1px solid #334155;">
            <td style="padding: 1rem; font-weight: 600;">${m.model}</td>
            <td style="padding: 1rem; text-align: center; color: #f59e0b; font-weight: 600;">${weightDisplay}</td>
            <td style="padding: 1rem; text-align: center; color: #94a3b8;">${m.avg_train_demand}</td>
            <td style="padding: 1rem; text-align: center; color: #94a3b8;">${m.avg_test_demand}</td>
            <td style="padding: 1rem; text-align: center;">${m.train_r2}</td>
            <td style="padding: 1rem; text-align: center; color: #6366f1; font-weight: 600;">${m.test_r2}</td>
            <td style="padding: 1rem; text-align: center;">${m.train_rmse}</td>
            <td style="padding: 1rem; text-align: center;">${m.test_rmse}</td>
            <td style="padding: 1rem; text-align: center; color: #10b981;">${m.train_accuracy}%</td>
            <td style="padding: 1rem; text-align: center; color: #6366f1; font-weight: 600;">${m.test_accuracy}%</td>
        </tr>
    `;
});

tableHTML += `
            </tbody>
        </table>
    </div>
    <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px;">
        <h4 style="color: #6366f1; margin-bottom: 1rem;">📊 How Ensemble Demand Score Works</h4>
        <ol style="color: #94a3b8; line-height: 2; padding-left: 1.5rem;">
            <li><strong style="color: #f1f5f9;">Individual Predictions:</strong> Each model predicts demand scores shown in "Avg Test Demand" column.</li>
            <li><strong style="color: #f1f5f9;">Weighted Average:</strong> Final score = weighted sum of all model predictions using weights shown in "Weight" column.</li>
            <li><strong style="color: #f1f5f9;">Final Output:</strong> Ensemble row shows the final demand score used for all products.</li>
        </ol>
    </div>
`;

document.getElementById('performanceMetricsTable').innerHTML = tableHTML;

    
const individualModels = metrics.slice(0, -1);
const ensembleMetrics = metrics[metrics.length - 1];

const bestR2Model = individualModels.reduce((best, curr) => curr.test_r2 > best.test_r2 ? curr : best);
const bestRMSEModel = individualModels.reduce((best, curr) => curr.test_rmse < best.test_rmse ? curr : best);
const bestAccModel = individualModels.reduce((best, curr) => curr.test_accuracy > best.test_accuracy ? curr : best);

let insightsHTML = `
    <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
        <h4 style="color: #6366f1; margin-bottom: 1rem;">🏆 Best Individual Models</h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <div>
                <p style="color: #94a3b8; margin-bottom: 0.5rem;">Best Test R²</p>
                <p style="color: #f1f5f9; font-weight: 600;">${bestR2Model.model}</p>
                <p style="color: #6366f1; font-size: 1.3rem;">${bestR2Model.test_r2}</p>
            </div>
            <div>
                <p style="color: #94a3b8; margin-bottom: 0.5rem;">Lowest Test RMSE</p>
                <p style="color: #f1f5f9; font-weight: 600;">${bestRMSEModel.model}</p>
                <p style="color: #10b981; font-size: 1.3rem;">${bestRMSEModel.test_rmse}</p>
            </div>
            <div>
                <p style="color: #94a3b8; margin-bottom: 0.5rem;">Highest Test Accuracy</p>
                <p style="color: #f1f5f9; font-weight: 600;">${bestAccModel.model}</p>
                <p style="color: #f59e0b; font-size: 1.3rem;">${bestAccModel.test_accuracy}%</p>
            </div>
        </div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
        <h4 style="color: #10b981; margin-bottom: 1rem;">📊 Final Ensemble Performance</h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
            <div style="text-align: center;">
                <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.85rem;">Test Demand Score</p>
                <p style="color: #f1f5f9; font-size: 1.8rem; font-weight: 700;">${ensembleMetrics.avg_test_demand}</p>
            </div>
            <div style="text-align: center;">
                <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.85rem;">Test R²</p>
                <p style="color: #6366f1; font-size: 1.8rem; font-weight: 700;">${ensembleMetrics.test_r2}</p>
            </div>
            <div style="text-align: center;">
                <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.85rem;">Test RMSE</p>
                <p style="color: #f1f5f9; font-size: 1.8rem; font-weight: 700;">${ensembleMetrics.test_rmse}</p>
            </div>
            <div style="text-align: center;">
                <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.85rem;">Test Accuracy</p>
                <p style="color: #10b981; font-size: 1.8rem; font-weight: 700;">${ensembleMetrics.test_accuracy}%</p>
            </div>
        </div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem;">
        <h4 style="color: #f59e0b; margin-bottom: 1rem;">💡 Column Definitions</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; color: #94a3b8; line-height: 1.8;">
            <div>
                <p><strong style="color: #f1f5f9;">Weight:</strong> Contribution of each model to final prediction</p>
                <p><strong style="color: #f1f5f9;">Avg Demand:</strong> Average demand score predicted by model</p>
                <p><strong style="color: #f1f5f9;">R²:</strong> How well model explains data variance (closer to 1 = better)</p>
                <p><strong style="color: #f1f5f9;">RMSE:</strong> Prediction error magnitude (lower = better)</p>
            </div>
            <div>
                <p><strong style="color: #f1f5f9;">MAE:</strong> Average absolute error (lower = better)</p>
                <p><strong style="color: #f1f5f9;">Accuracy %:</strong> Overall prediction accuracy (higher = better)</p>
                <p><strong style="color: #f1f5f9;">Train vs Test:</strong> Train = learning, Test = real-world performance</p>
            </div>
        </div>
    </div>
`;

document.getElementById('performanceInsightsContent').innerHTML = insightsHTML;
}
function switchAdvancedTab(tab) {
    document.querySelectorAll('#advancedResults .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#advancedResults .tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    
    if (tab === 'overview') {
        document.getElementById('advancedOverview').classList.add('active');
    } else if (tab === 'demand') {
        document.getElementById('advancedDemand').classList.add('active');
    } else if (tab === 'pricing') {
        document.getElementById('advancedPricing').classList.add('active');
    } else if (tab === 'performance') {
        document.getElementById('advancedPerformance').classList.add('active');
    } else if (tab === 'products') {
        document.getElementById('advancedProducts').classList.add('active');
    }
}

function filterAdvanced(filter) {
    currentAdvancedFilter = filter;
    displayAdvancedProducts();
}

function exportAdvancedCSV() {
    let csv = 'Title,Price,Optimized Price,Change,Rating,Reviews,Demand Score,Confidence,Category,Strategy,Revenue Impact,Elasticity,Quality Score,Link\n';
    advancedData.products.forEach(p => {
        csv += `"${p.title}",${p.price_numeric},${p.suggested_price},${p.price_change},${p.rating_numeric},${p.review_count},${p.demand_score.toFixed(1)},${p.confidence_score.toFixed(1)},${p.demand_category},${p.pricing_strategy},${p.optimization_score.toFixed(1)},${p.elasticity.toFixed(3)},${p.quality_score.toFixed(2)},${p.link}\n`;
    });
    downloadCSV(csv, `advanced_analysis_${advancedData.query}.csv`);
}

// ========================================================================================
// PRODUCT FINDER PLATFORM
// ========================================================================================

function switchFinderMode(mode) {
    currentFinderMode = mode;
    if (mode === 'text') {
        document.getElementById('finderTextMode').classList.remove('hidden');
        document.getElementById('finderVisualMode').classList.add('hidden');
        document.getElementById('finderSearchBtn').innerHTML = '🔍 Search Products';
    } else {
        document.getElementById('finderTextMode').classList.add('hidden');
        document.getElementById('finderVisualMode').classList.remove('hidden');
        document.getElementById('finderSearchBtn').innerHTML = '🧠 Identify & Search (ResNet50)';
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        uploadedImageData = e.target.result;
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('detectedLabel').textContent = 'Analyzing with ResNet50...';

        try {
            const response = await fetch(`${API_URL}/api/vision/identify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: uploadedImageData })
            });

            if (!response.ok) throw new Error('Image identification failed');

            const result = await response.json();
            const top = result.predictions[0];
            document.getElementById('detectedLabel').textContent = `Detected: ${top.label} (${(top.confidence * 100).toFixed(1)}% confidence)`;
        } catch (error) {
            document.getElementById('detectedLabel').textContent = 'Error: Could not identify image';
        }
    };
    reader.readAsDataURL(file);
}

document.getElementById('imageUploadArea').addEventListener('click', function() {
    document.getElementById('imageInput').click();
});

async function searchFinder() {
    let query;
    let maxProducts;

    if (currentFinderMode === 'text') {
        query = document.getElementById('finderQuery').value;
        maxProducts = parseInt(document.getElementById('finderMaxProducts').value);
    } else {
        if (!uploadedImageData) {
            showError('finderError', 'Please upload an image first');
            return;
        }
        const detectedText = document.getElementById('detectedLabel').textContent;
        query = detectedText.split('Detected: ')[1]?.split(' (')[0] || 'product';
        maxProducts = parseInt(document.getElementById('finderVisualMaxProducts').value);
    }

    if (!query) {
        showError('finderError', 'Please enter a search query');
        return;
    }

    hideError('finderError');
    document.getElementById('finderLoading').classList.remove('hidden');
    document.getElementById('finderResults').classList.add('hidden');
    document.getElementById('finderLoadingText').textContent = `Searching for "${query}" on Snapdeal...`;

    try {
        const response = await fetch(`${API_URL}/api/search/snapdeal/basic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_products: maxProducts })
        });

        if (!response.ok) throw new Error('Search failed');

        finderData = await response.json();
        
        document.getElementById('finderLoading').classList.add('hidden');
        document.getElementById('finderResults').classList.remove('hidden');
        
        displayFinderResults();
    } catch (error) {
        document.getElementById('finderLoading').classList.add('hidden');
        showError('finderError', `Error: ${error.message}. Make sure Flask backend is running.`);
    }
}

function displayFinderResults() {
    const { products, stats } = finderData;
    const best = products[0];

    // Display Recommendation
    document.getElementById('finderRecommendation').innerHTML = `
        <div class="recommendation-card">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <span style="font-size: 2rem;">🏆</span>
                <h3 style="font-size: 1.8rem; color: #ec4899;">Recommended Best Product</h3>
            </div>
            <div class="recommendation-content">
                <img src="${best.image_url || 'https://via.placeholder.com/200x200/1e293b/ec4899?text=No+Image'}" alt="${best.title}" style="width: 100%; border-radius: 12px;" onerror="this.src='https://via.placeholder.com/200x200/1e293b/ec4899?text=No+Image'">
                <div>
                    <h4 style="font-size: 1.3rem; margin-bottom: 1.5rem;">${best.title}</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 8px;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.3rem;">Price</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #ec4899;">₹${best.price_numeric.toFixed(2)}</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 8px;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.3rem;">Rating</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${best.rating_numeric} ⭐</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 8px;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.3rem;">Value Score</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${best.value_score.toFixed(2)}</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 8px;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.3rem;">Availability</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">In Stock</div>
                        </div>
                    </div>
                    <a href="${best.link}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #e11d48); width: 100%; justify-content: center;">
                        🛒 Buy Now on Snapdeal
                    </a>
                </div>
            </div>
        </div>
    `;

    createFinderCharts();
    displayFinderProducts();
}

function createFinderCharts() {
    const { products, stats } = finderData;
    const top10 = products.slice(0, 10);

    // 1. Price Chart - Use actual product titles
    const ctx1 = document.getElementById('finderPriceChart').getContext('2d');
    new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: top10.map(p => p.title.substring(0, 30) + '...'),
            datasets: [{
                label: 'Price (₹)',
                data: top10.map(p => p.price_numeric),
                backgroundColor: '#ec4899'
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    callbacks: {
                        title: (context) => top10[context[0].dataIndex].title
                    }
                }
            },
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 2. Rating Chart - Use actual product titles
    const ctx2 = document.getElementById('finderRatingChart').getContext('2d');
    new Chart(ctx2, {
        type: 'line',
        data: {
            labels: top10.map(p => p.title.substring(0, 30) + '...'),
            datasets: [{
                label: 'Rating',
                data: top10.map(p => p.rating_numeric),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    callbacks: {
                        title: (context) => top10[context[0].dataIndex].title
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, max: 5, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 3. Scatter Chart
    const ctx3 = document.getElementById('finderScatterChart').getContext('2d');
    new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Products',
                data: products.map(p => ({ 
                    x: p.price_numeric, 
                    y: p.rating_numeric,
                    title: p.title
                })),
                backgroundColor: '#ec4899',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => context[0].raw.title,
                        label: (context) => [
                            `Price: ₹${context.parsed.x.toFixed(2)}`,
                            `Rating: ${context.parsed.y.toFixed(1)} ⭐`
                        ]
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Rating', color: '#94a3b8' }, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { title: { display: true, text: 'Price (₹)', color: '#94a3b8' }, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // 4. Price Distribution
    const ctx4 = document.getElementById('finderPriceDistChart').getContext('2d');
    const priceRanges = ['0-5k', '5k-10k', '10k-20k', '20k+'];
    const priceCounts = [
        products.filter(p => p.price_numeric < 5000).length,
        products.filter(p => p.price_numeric >= 5000 && p.price_numeric < 10000).length,
        products.filter(p => p.price_numeric >= 10000 && p.price_numeric < 20000).length,
        products.filter(p => p.price_numeric >= 20000).length
    ];
    new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: priceRanges,
            datasets: [{
                label: 'Number of Products',
                data: priceCounts,
                backgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f1f5f9' } } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // Stats
    document.getElementById('finderStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-number" style="color: #ec4899;">₹${stats.avg_price.toFixed(0)}</div>
            <div class="stat-label">Average Price</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #f59e0b;">${stats.avg_rating.toFixed(1)}</div>
            <div class="stat-label">Average Rating</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #6366f1;">${stats.total}</div>
            <div class="stat-label">Total Products</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #10b981;">₹${stats.min_price.toFixed(0)}</div>
            <div class="stat-label">Min Price</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #ef4444;">₹${stats.max_price.toFixed(0)}</div>
            <div class="stat-label">Max Price</div>
        </div>
    `;

    // Analytics Details - Add median price, standard deviation, and rating statistics
    const highRated = products.filter(p => p.rating_numeric >= 4.0);
    
    // Calculate median price
    const sortedPrices = products.map(p => p.price_numeric).sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    
    // Calculate standard deviation
    const mean = stats.avg_price;
    const squaredDiffs = products.map(p => Math.pow(p.price_numeric - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / products.length;
    const stdDeviation = Math.sqrt(variance);
    
    // Calculate median rating
    const sortedRatings = products.map(p => p.rating_numeric).sort((a, b) => a - b);
    const medianRating = sortedRatings[Math.floor(sortedRatings.length / 2)];
    
    document.getElementById('analyticsDetails').innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="color: #ec4899; margin-bottom: 1rem;">📊 Market Analysis</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Price Range</p>
                    <p style="color: #f1f5f9; font-weight: 600;">₹${stats.min_price.toFixed(0)} - ₹${stats.max_price.toFixed(0)}</p>
                </div>
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Median Price</p>
                    <p style="color: #f1f5f9; font-weight: 600;">₹${medianPrice.toFixed(0)}</p>
                </div>
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Standard Deviation (Price)</p>
                    <p style="color: #f1f5f9; font-weight: 600;">₹${stdDeviation.toFixed(0)}</p>
                </div>
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Average Rating</p>
                    <p style="color: #f1f5f9; font-weight: 600;">${stats.avg_rating.toFixed(1)} ⭐</p>
                </div>
            </div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem;">
            <h4 style="color: #10b981; margin-bottom: 1rem;">⭐ Rating Statistics</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Median Rating</p>
                    <p style="color: #f1f5f9; font-weight: 600;">${medianRating.toFixed(1)} ⭐</p>
                </div>
                <div>
                    <p style="color: #94a3b8; margin-bottom: 0.5rem;">Products with 4+ Rating</p>
                    <p style="color: #f1f5f9; font-weight: 600;">${highRated.length} products (${(highRated.length/products.length*100).toFixed(0)}%)</p>
                </div>
            </div>
        </div>
    `;

    // Top Value Products
    const topValue = products.slice(0, 3);
    let topHTML = '';
    topValue.forEach((p, idx) => {
        topHTML += `
            <div style="background: rgba(236, 72, 153, 0.05); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h4 style="color: #ec4899; margin-bottom: 0.5rem;">#${idx + 1} ${p.title.substring(0, 60)}...</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; color: #94a3b8; font-size: 0.9rem;">
                            <div>Price: <strong style="color: #f1f5f9;">₹${p.price_numeric.toFixed(0)}</strong></div>
                            <div>Rating: <strong style="color: #f1f5f9;">${p.rating_numeric} ⭐</strong></div>
                            <div>Value: <strong style="color: #10b981;">${p.value_score.toFixed(2)}</strong></div>
                        </div>
                    </div>
                    <span class="badge badge-high">Best Value</span>
                </div>
                <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #e11d48);">
                    🔗 View Product
                </a>
            </div>
        `;
    });
    document.getElementById('topValueProducts').innerHTML = topHTML;
}

function displayFinderProducts() {
    const { products } = finderData;
    let html = '';
    products.forEach(p => {
        html += `
            <div class="product-card">
                <img src="${p.image_url || 'https://via.placeholder.com/200x200/1e293b/ec4899?text=No+Image'}" alt="${p.title}" class="product-image" onerror="this.src='https://via.placeholder.com/200x200/1e293b/ec4899?text=No+Image'">
                <div class="product-title">${p.title}</div>
                <div class="product-info">
                    <span class="info-label">Price:</span>
                    <span class="info-value" style="color: #ec4899;">₹${p.price_numeric.toFixed(2)}</span>
                </div>
                <div class="product-info">
                    <span class="info-label">Rating:</span>
                    <span class="info-value">${p.rating_numeric} ⭐</span>
                </div>
                <div class="product-info">
                    <span class="info-label">Value Score:</span>
                    <span class="info-value" style="color: #10b981;">${p.value_score.toFixed(2)}</span>
                </div>
                <div class="product-info">
                    <span class="info-label">Availability:</span>
                    <span class="info-value" style="color: #10b981;">${p.availability}</span>
                </div>
                <a href="${p.link}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #e11d48); width: 100%; margin-top: 1rem; justify-content: center;">
                    🔗 View on Snapdeal
                </a>
            </div>
        `;
    });
    document.getElementById('finderProductGrid').innerHTML = html;
}

function switchFinderTab(tab) {
    document.querySelectorAll('#finderResults .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#finderResults .tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    if (tab === 'comparison') {
        document.getElementById('finderComparison').classList.add('active');
    } else if (tab === 'products') {
        document.getElementById('finderProductsTab').classList.add('active');
    } else {
        document.getElementById('finderAnalytics').classList.add('active');
    }
}

function exportFinderCSV() {
    let csv = 'Title,Price,Rating,Value Score,Availability,Link\n';
    finderData.products.forEach(p => {
        csv += `"${p.title}",${p.price_numeric},${p.rating_numeric},${p.value_score.toFixed(2)},${p.availability},${p.link}\n`;
    });
    downloadCSV(csv, `finder_results_${finderData.query}.csv`);
}

// ========================================================================================
// UTILITY FUNCTIONS
// ========================================================================================

function showError(id, message) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id + 'Text').textContent = message;
}

function hideError(id) {
    document.getElementById(id).classList.add('hidden');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Initialize
console.log('🚀 E-Commerce Analytics Platform Loaded');
console.log('📊 Features: 5 ML Algorithms + ResNet50 Visual Search');
console.log('🔧 Make sure Flask backend is running on http://localhost:5000');