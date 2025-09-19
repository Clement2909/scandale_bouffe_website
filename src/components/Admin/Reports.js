import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  getAllDocuments,
  queryDocuments
} from '../../firebase/services';
import './Admin.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Reports = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = useCallback(async () => {
    // Don't generate report if values are not properly set
    if (reportType === 'monthly' && !selectedMonth) return;
    if (reportType === 'yearly' && !selectedYear) return;
    if (reportType === 'daily' && !selectedDate) return;

    setLoading(true);
    setError('');

    try {
      let data;
      switch (reportType) {
        case 'daily':
          data = await generateDailyReport();
          break;
        case 'monthly':
          data = await generateMonthlyReport();
          break;
        case 'yearly':
          data = await generateYearlyReport();
          break;
        default:
          data = await generateDailyReport();
      }
      setReportData(data);
    } catch (error) {
      setError('Erreur lors de la génération du rapport');
      console.error('Report generation error:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    // Clear previous report data when changing report type
    setReportData(null);
    // Generate report after a small delay to let the UI update
    const timer = setTimeout(() => {
      generateReport();
    }, 100);

    return () => clearTimeout(timer);
  }, [generateReport]);

  const generateDailyReport = async () => {
    if (!selectedDate) {
      throw new Error('Date non sélectionnée');
    }

    const [expenses, stock, products, categories] = await Promise.all([
      queryDocuments('expenses', [
        { field: 'date', operator: '==', value: selectedDate }
      ]),
      queryDocuments('stock', [
        { field: 'date', operator: '==', value: selectedDate }
      ]),
      getAllDocuments('products'),
      getAllDocuments('categories')
    ]);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.totalExpense || 0), 0);

    let totalSales = 0;
    let totalStockValue = 0;
    let soldItems = [];

    stock.forEach(stockItem => {
      const product = products.find(p => p.id === stockItem.productId);
      if (product) {
        const soldQuantity = stockItem.soldQuantity || 0;
        const remainingStock = stockItem.currentStock || 0;

        totalSales += soldQuantity * product.price;
        totalStockValue += remainingStock * product.price;

        if (soldQuantity > 0) {
          soldItems.push({
            name: product.name,
            quantity: soldQuantity,
            value: soldQuantity * product.price
          });
        }
      }
    });

    const profit = totalSales - totalExpenses;

    // Generate charts data
    const expensesByCategory = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Autres';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + exp.totalExpense;
    });

    const salesByCategory = {};
    stock.forEach(stockItem => {
      const product = products.find(p => p.id === stockItem.productId);
      if (product && stockItem.soldQuantity > 0) {
        const category = categories.find(c => c.id === product.categoryId);
        const categoryName = category?.name || 'Autres';
        salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) +
          (stockItem.soldQuantity * product.price);
      }
    });

    return {
      type: 'daily',
      date: selectedDate,
      summary: {
        totalExpenses,
        totalSales,
        totalStockValue,
        profit,
        profitMargin: totalSales > 0 ? ((profit / totalSales) * 100) : 0
      },
      soldItems,
      charts: {
        expenses: {
          labels: Object.keys(expensesByCategory),
          data: Object.values(expensesByCategory)
        },
        sales: {
          labels: Object.keys(salesByCategory),
          data: Object.values(salesByCategory)
        }
      }
    };
  };

  const generateMonthlyReport = async () => {
    if (!selectedMonth) {
      throw new Error('Mois non sélectionné');
    }

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-31`;

    // Get all data for the month
    const [allExpenses, allStock, products] = await Promise.all([
      getAllDocuments('expenses'),
      getAllDocuments('stock'),
      getAllDocuments('products')
    ]);

    // Filter by month
    const monthlyExpenses = allExpenses.filter(exp => {
      if (!exp.date) return false;
      return exp.date >= startDate && exp.date <= endDate;
    });

    const monthlyStock = allStock.filter(stock => {
      if (!stock.date) return false;
      return stock.date >= startDate && stock.date <= endDate;
    });

    // Calculate daily totals
    const dailyTotals = {};

    monthlyExpenses.forEach(exp => {
      if (!exp.date) return;
      if (!dailyTotals[exp.date]) {
        dailyTotals[exp.date] = { expenses: 0, sales: 0 };
      }
      dailyTotals[exp.date].expenses += exp.totalExpense || 0;
    });

    monthlyStock.forEach(stockItem => {
      if (!stockItem.date) return;
      const product = products.find(p => p.id === stockItem.productId);
      if (product && stockItem.soldQuantity > 0) {
        if (!dailyTotals[stockItem.date]) {
          dailyTotals[stockItem.date] = { expenses: 0, sales: 0 };
        }
        dailyTotals[stockItem.date].sales += stockItem.soldQuantity * product.price;
      }
    });

    const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + (exp.totalExpense || 0), 0);
    let totalSales = 0;

    monthlyStock.forEach(stockItem => {
      const product = products.find(p => p.id === stockItem.productId);
      if (product) {
        totalSales += (stockItem.soldQuantity || 0) * product.price;
      }
    });

    const profit = totalSales - totalExpenses;

    return {
      type: 'monthly',
      period: selectedMonth,
      summary: {
        totalExpenses,
        totalSales,
        profit,
        profitMargin: totalSales > 0 ? ((profit / totalSales) * 100) : 0,
        daysActive: Object.keys(dailyTotals).length
      },
      charts: {
        daily: {
          labels: Object.keys(dailyTotals).sort(),
          expenses: Object.keys(dailyTotals).sort().map(date => dailyTotals[date].expenses),
          sales: Object.keys(dailyTotals).sort().map(date => dailyTotals[date].sales),
          profit: Object.keys(dailyTotals).sort().map(date =>
            dailyTotals[date].sales - dailyTotals[date].expenses
          )
        }
      }
    };
  };

  const generateYearlyReport = async () => {
    if (!selectedYear) {
      throw new Error('Année non sélectionnée');
    }

    const [allExpenses, allStock, products] = await Promise.all([
      getAllDocuments('expenses'),
      getAllDocuments('stock'),
      getAllDocuments('products')
    ]);

    // Filter by year
    const yearlyExpenses = allExpenses.filter(exp => {
      if (!exp.date) return false;
      return exp.date.startsWith(selectedYear);
    });

    const yearlyStock = allStock.filter(stock => {
      if (!stock.date) return false;
      return stock.date.startsWith(selectedYear);
    });

    // Calculate monthly totals
    const monthlyTotals = {};

    yearlyExpenses.forEach(exp => {
      if (!exp.date) return;
      const month = exp.date.substring(0, 7);
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { expenses: 0, sales: 0 };
      }
      monthlyTotals[month].expenses += exp.totalExpense || 0;
    });

    yearlyStock.forEach(stockItem => {
      if (!stockItem.date) return;
      const product = products.find(p => p.id === stockItem.productId);
      if (product && stockItem.soldQuantity > 0) {
        const month = stockItem.date.substring(0, 7);
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = { expenses: 0, sales: 0 };
        }
        monthlyTotals[month].sales += stockItem.soldQuantity * product.price;
      }
    });

    const totalExpenses = yearlyExpenses.reduce((sum, exp) => sum + (exp.totalExpense || 0), 0);
    let totalSales = 0;

    yearlyStock.forEach(stockItem => {
      const product = products.find(p => p.id === stockItem.productId);
      if (product) {
        totalSales += (stockItem.soldQuantity || 0) * product.price;
      }
    });

    const profit = totalSales - totalExpenses;

    return {
      type: 'yearly',
      period: selectedYear,
      summary: {
        totalExpenses,
        totalSales,
        profit,
        profitMargin: totalSales > 0 ? ((profit / totalSales) * 100) : 0,
        monthsActive: Object.keys(monthlyTotals).length
      },
      charts: {
        monthly: {
          labels: Object.keys(monthlyTotals).sort(),
          expenses: Object.keys(monthlyTotals).sort().map(month => monthlyTotals[month].expenses),
          sales: Object.keys(monthlyTotals).sort().map(month => monthlyTotals[month].sales),
          profit: Object.keys(monthlyTotals).sort().map(month =>
            monthlyTotals[month].sales - monthlyTotals[month].expenses
          )
        }
      }
    };
  };

  const renderCharts = () => {
    if (!reportData || !reportData.charts) return null;

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Rapport ${reportType === 'daily' ? 'Quotidien' : reportType === 'monthly' ? 'Mensuel' : 'Annuel'}`
        },
      },
    };

    const pieOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        },
      },
    };

    if (reportType === 'daily') {
      return (
        <div className="charts-grid">
          {reportData.charts.expenses && reportData.charts.expenses.labels && reportData.charts.expenses.labels.length > 0 && (
            <div className="chart-container">
              <h3>Dépenses par Catégorie</h3>
              <Pie
                data={{
                  labels: reportData.charts.expenses.labels,
                  datasets: [{
                    data: reportData.charts.expenses.data,
                    backgroundColor: [
                      '#8B4513', '#A0522D', '#D2B48C', '#228B22',
                      '#696969', '#90EE90', '#F5F5DC', '#FFB6C1'
                    ]
                  }]
                }}
                options={pieOptions}
              />
            </div>
          )}

          {reportData.charts.sales && reportData.charts.sales.labels && reportData.charts.sales.labels.length > 0 && (
            <div className="chart-container">
              <h3>Ventes par Catégorie</h3>
              <Pie
                data={{
                  labels: reportData.charts.sales.labels,
                  datasets: [{
                    data: reportData.charts.sales.data,
                    backgroundColor: [
                      '#228B22', '#90EE90', '#8B4513', '#A0522D',
                      '#D2B48C', '#696969', '#F5F5DC', '#FFB6C1'
                    ]
                  }]
                }}
                options={pieOptions}
              />
            </div>
          )}
        </div>
      );
    }

    if (reportType === 'monthly' || reportType === 'yearly') {
      const chartData = reportType === 'monthly' ? reportData.charts.daily : reportData.charts.monthly;

      // Check if chartData exists and has required properties
      if (!chartData || !chartData.labels || !chartData.sales || !chartData.expenses || !chartData.profit) {
        return <div className="loading">Génération des graphiques...</div>;
      }

      return (
        <div className="charts-grid">
          <div className="chart-container full-width">
            <h3>Évolution {reportType === 'monthly' ? 'Quotidienne' : 'Mensuelle'}</h3>
            <Line
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: 'Ventes',
                    data: chartData.sales,
                    borderColor: '#228B22',
                    backgroundColor: 'rgba(34, 139, 34, 0.1)',
                    tension: 0.1
                  },
                  {
                    label: 'Dépenses',
                    data: chartData.expenses,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.1
                  },
                  {
                    label: 'Profit',
                    data: chartData.profit,
                    borderColor: '#696969',
                    backgroundColor: 'rgba(105, 105, 105, 0.1)',
                    tension: 0.1
                  }
                ]
              }}
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value + ' Ar';
                      }
                    }
                  }
                }
              }}
            />
          </div>

          <div className="chart-container">
            <h3>Répartition des Ventes vs Dépenses</h3>
            <Bar
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: 'Ventes',
                    data: chartData.sales,
                    backgroundColor: 'rgba(34, 139, 34, 0.8)',
                  },
                  {
                    label: 'Dépenses',
                    data: chartData.expenses,
                    backgroundColor: 'rgba(139, 69, 19, 0.8)',
                  }
                ]
              }}
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value + ' Ar';
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <button
          className="back-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          ← Retour
        </button>
        <h1>Récapitulatifs et Rapports</h1>
        <button
          className="add-button"
          onClick={generateReport}
          disabled={loading}
        >
          🔄 Actualiser
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <div className="report-type-selector">
          <label>Type de rapport:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="report-type-select"
          >
            <option value="daily">Quotidien</option>
            <option value="monthly">Mensuel</option>
            <option value="yearly">Annuel</option>
          </select>
        </div>

        {reportType === 'daily' && (
          <div className="date-filter">
            <label>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="date-filter">
            <label>Mois:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="date-input"
            />
          </div>
        )}

        {reportType === 'yearly' && (
          <div className="date-filter">
            <label>Année:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="date-input"
            >
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <main className="admin-main">
        {loading ? (
          <div className="loading">Génération du rapport...</div>
        ) : reportData ? (
          <>
            <div className="summary-cards">
              <div className="summary-card expenses">
                <h3>Dépenses Totales</h3>
                <div className="amount">{reportData.summary.totalExpenses.toFixed(2)} Ar</div>
              </div>

              <div className="summary-card sales">
                <h3>Ventes Totales</h3>
                <div className="amount">{reportData.summary.totalSales.toFixed(2)} Ar</div>
              </div>

              <div className={`summary-card profit ${reportData.summary.profit >= 0 ? 'positive' : 'negative'}`}>
                <h3>{reportData.summary.profit >= 0 ? 'Bénéfice' : 'Perte'}</h3>
                <div className="amount">{reportData.summary.profit.toFixed(2)} Ar</div>
                <div className="margin">
                  Marge: {reportData.summary.profitMargin.toFixed(1)}%
                </div>
              </div>

              {reportData.summary.totalStockValue !== undefined && (
                <div className="summary-card stock">
                  <h3>Valeur Stock Restant</h3>
                  <div className="amount">{reportData.summary.totalStockValue.toFixed(2)} Ar</div>
                </div>
              )}
            </div>

            {reportData.soldItems && reportData.soldItems.length > 0 && (
              <div className="sold-items-section">
                <h3>Produits Vendus</h3>
                <div className="sold-items-grid">
                  {reportData.soldItems.map((item, index) => (
                    <div key={index} className="sold-item">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">Qté: {item.quantity}</span>
                      <span className="item-value">{item.value.toFixed(2)} Ar</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportData && reportData.summary && renderCharts()}
          </>
        ) : (
          <div className="empty-state">
            <h3>Aucune donnée disponible</h3>
            <p>Sélectionnez une période pour générer un rapport</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;