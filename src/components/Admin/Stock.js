import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument
} from '../../firebase/services';
import './Admin.css';

const Stock = () => {
  const navigate = useNavigate();
  const [stockItems, setStockItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    productId: '',
    date: selectedDate,
    initialStock: 0,
    addedStock: 0,
    currentStock: 0,
    soldQuantity: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const syncSoldQuantities = useCallback(async (stockData, productsData) => {
    try {
      // Récupérer toutes les commandes livrées
      const allOrders = await getAllDocuments('orders');
      const deliveredOrders = allOrders.filter(order => order.status === 'delivered');

      // Calculer les quantités vendues par produit
      const soldQuantitiesByProduct = {};

      deliveredOrders.forEach(order => {
        order.items.forEach(item => {
          // Trouver le produit par nom
          const product = productsData.find(p =>
            p.name === item.name ||
            p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          );

          if (product) {
            if (!soldQuantitiesByProduct[product.id]) {
              soldQuantitiesByProduct[product.id] = 0;
            }
            soldQuantitiesByProduct[product.id] += Number(item.quantity) || 0;
          }
        });
      });

      // Mettre à jour les entrées de stock avec les vraies quantités vendues
      const updatePromises = stockData.map(async (stock) => {
        const realSoldQuantity = soldQuantitiesByProduct[stock.productId] || 0;

        if (stock.soldQuantity !== realSoldQuantity) {
          // Recalculer le stock actuel avec la vraie quantité vendue
          const newCurrentStock = calculateCurrentStock(
            stock.initialStock,
            stock.addedStock,
            realSoldQuantity
          );

          await updateDocument('stock', stock.id, {
            soldQuantity: realSoldQuantity,
            currentStock: newCurrentStock,
            updatedAt: new Date()
          });

          // Mettre à jour l'objet local
          stock.soldQuantity = realSoldQuantity;
          stock.currentStock = newCurrentStock;
        }
      });

      await Promise.all(updatePromises);

    } catch (error) {
      console.error('Erreur lors de la synchronisation des quantités vendues:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stockData, productsData, categoriesData] = await Promise.all([
        getAllDocuments('stock'),
        getAllDocuments('products'),
        getAllDocuments('categories')
      ]);

      // Synchroniser les quantités vendues avec les données réelles
      await syncSoldQuantities(stockData, productsData);

      setStockItems(stockData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [syncSoldQuantities]);

  const getProductInfo = (productId) => {
    return products.find(product => product.id === productId);
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(category => category.id === categoryId);
  };

  // useEffect hooks
  useEffect(() => {
    loadData();
  }, [selectedDate, loadData]);

  // Synchronisation automatique
  useEffect(() => {
    // Synchronisation silencieuse (sans loading)
    const syncSilently = async () => {
      try {
        const [stockData, productsData] = await Promise.all([
          getAllDocuments('stock'),
          getAllDocuments('products')
        ]);
        await syncSoldQuantities(stockData, productsData);
        setStockItems(stockData);
        setLastSyncTime(new Date());
      } catch (error) {
        console.log('Synchronisation silencieuse échouée:', error);
      }
    };

    // Synchronisation à intervalles réguliers (toutes les 5 secondes)
    const syncInterval = setInterval(syncSilently, 5000);

    // Synchronisation quand l'utilisateur revient sur l'onglet
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncSilently();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Nettoyage
    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncSoldQuantities]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: selectedDate
    }));
  }, [selectedDate]);

  const filteredStockItems = stockItems
    .filter(stock => stock.date === selectedDate)
    .filter(stock => {
      if (selectedCategory === 'all') return true;
      const product = getProductInfo(stock.productId);
      return product?.categoryId === selectedCategory;
    });

  const calculateCurrentStock = (initialStock, addedStock, soldQuantity) => {
    return (parseInt(initialStock) || 0) + (parseInt(addedStock) || 0) - (parseInt(soldQuantity) || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };

    // Auto-calculate current stock (soldQuantity is now read-only)
    if (name === 'initialStock' || name === 'addedStock') {
      newFormData.currentStock = calculateCurrentStock(
        newFormData.initialStock,
        newFormData.addedStock,
        newFormData.soldQuantity
      );
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const stockData = {
        ...formData,
        initialStock: parseInt(formData.initialStock) || 0,
        addedStock: parseInt(formData.addedStock) || 0,
        currentStock: calculateCurrentStock(
          formData.initialStock,
          formData.addedStock,
          formData.soldQuantity
        )
        // soldQuantity sera calculé automatiquement par syncSoldQuantities
      };

      if (editingStock) {
        await updateDocument('stock', editingStock.id, stockData);
      } else {
        // Check if stock already exists for this product and date
        const existingStock = stockItems.find(
          stock => stock.productId === formData.productId && stock.date === formData.date
        );

        if (existingStock) {
          setError('Le stock pour ce produit existe déjà pour cette date');
          setLoading(false);
          return;
        }

        await createDocument('stock', stockData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      productId: stock.productId,
      date: stock.date,
      initialStock: stock.initialStock || 0,
      addedStock: stock.addedStock || 0,
      currentStock: stock.currentStock || 0,
      soldQuantity: stock.soldQuantity || 0,
      notes: stock.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (stockId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce stock ?')) {
      try {
        setLoading(true);
        await deleteDocument('stock', stockId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddStock = async (stockId, quantity) => {
    const stockItem = stockItems.find(stock => stock.id === stockId);
    if (!stockItem) return;

    try {
      const newAddedStock = (stockItem.addedStock || 0) + quantity;
      const newCurrentStock = calculateCurrentStock(
        stockItem.initialStock,
        newAddedStock,
        stockItem.soldQuantity
      );

      await updateDocument('stock', stockId, {
        addedStock: newAddedStock,
        currentStock: newCurrentStock
      });

      await loadData();
    } catch (error) {
      setError('Erreur lors de l\'ajout du stock');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      date: selectedDate,
      initialStock: 0,
      addedStock: 0,
      currentStock: 0,
      soldQuantity: 0,
      notes: ''
    });
    setEditingStock(null);
    setShowForm(false);
  };

  const getAvailableProducts = () => {
    return products.filter(product =>
      !stockItems.find(stock => stock.productId === product.id && stock.date === selectedDate)
    );
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
        <div className="header-title-section">
          <h1>Gestion des Stocks</h1>
          {lastSyncTime && (
            <div className="sync-indicator">
              <span className="sync-dot">🟢</span>
              <small>Dernière sync: {lastSyncTime.toLocaleTimeString('fr-FR')}</small>
            </div>
          )}
        </div>
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Nouveau Stock
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <div className="date-filter">
          <label>Date sélectionnée:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-filter"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingStock ? 'Modifier' : 'Ajouter'} un Stock</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="productId">Produit *</label>
                  <select
                    id="productId"
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    required
                    disabled={editingStock}
                  >
                    <option value="">Sélectionner un produit</option>
                    {(editingStock ? products : getAvailableProducts()).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="date">Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    disabled={editingStock}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="initialStock">Stock initial</label>
                  <input
                    type="number"
                    id="initialStock"
                    name="initialStock"
                    value={formData.initialStock}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addedStock">Stock ajouté</label>
                  <input
                    type="number"
                    id="addedStock"
                    name="addedStock"
                    value={formData.addedStock}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="soldQuantity">Quantité vendue (auto)</label>
                  <div className="calculated-stock sold-readonly">
                    {formData.soldQuantity} (mis à jour automatiquement)
                  </div>
                  <small className="field-note">
                    Cette valeur est calculée automatiquement depuis les commandes livrées
                  </small>
                </div>

                <div className="form-group">
                  <label>Stock actuel (calculé)</label>
                  <div className="calculated-stock">
                    {formData.currentStock}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Notes ou commentaires"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="admin-main">
        {loading && stockItems.length === 0 ? (
          <div className="loading">Chargement des stocks...</div>
        ) : (
          <div className="stock-grid">
            {filteredStockItems.map(stock => {
              const product = getProductInfo(stock.productId);
              const category = product ? getCategoryInfo(product.categoryId) : null;

              return (
                <div key={stock.id} className="stock-card">
                  <div className="stock-header">
                    <div
                      className="stock-category-badge"
                      style={{ backgroundColor: category?.color || '#8B4513' }}
                    >
                      {category?.name || 'Catégorie inconnue'}
                    </div>
                    <div className={`stock-status ${stock.currentStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {stock.currentStock > 0 ? 'En stock' : 'Épuisé'}
                    </div>
                  </div>

                  <div className="stock-content">
                    <h3>{product?.name || 'Produit inconnu'}</h3>

                    <div className="stock-details">
                      <div className="stock-row">
                        <span>Stock initial:</span>
                        <span>{stock.initialStock || 0}</span>
                      </div>
                      <div className="stock-row">
                        <span>Stock ajouté:</span>
                        <span className="added">+{stock.addedStock || 0}</span>
                      </div>
                      <div className="stock-row">
                        <span>Quantité vendue:</span>
                        <span className="sold">-{stock.soldQuantity || 0}</span>
                      </div>
                      <div className="stock-row total">
                        <span>Stock actuel:</span>
                        <span className="current">{stock.currentStock || 0}</span>
                      </div>
                    </div>

                    {stock.notes && (
                      <div className="stock-notes">
                        <strong>Notes:</strong> {stock.notes}
                      </div>
                    )}

                    <div className="quick-actions">
                      <button
                        className="quick-add-button"
                        onClick={() => handleAddStock(stock.id, 5)}
                        title="Ajouter 5 au stock"
                      >
                        +5
                      </button>
                      <button
                        className="quick-add-button"
                        onClick={() => handleAddStock(stock.id, 10)}
                        title="Ajouter 10 au stock"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  <div className="stock-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(stock)}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(stock.id)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStockItems.length === 0 && !loading && (
              <div className="empty-state">
                <h3>Aucun stock trouvé</h3>
                <p>
                  Aucun stock enregistré pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}
                  {selectedCategory !== 'all' && ' dans cette catégorie'}
                </p>
                <button
                  className="add-button"
                  onClick={() => setShowForm(true)}
                >
                  + Ajouter un stock
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Stock;