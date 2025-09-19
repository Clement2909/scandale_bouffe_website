import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument
} from '../../firebase/services';
import './Admin.css';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    ingredients: [],
    allergens: [],
    available: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getAllDocuments('products'),
        getAllDocuments('categories')
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Fonction de filtrage simplifiée
  const filteredProducts = products.filter(product => {
    // Filtre par fourchette de prix
    if (priceFilter.min && product.price < parseFloat(priceFilter.min)) {
      return false;
    }
    if (priceFilter.max && product.price > parseFloat(priceFilter.max)) {
      return false;
    }

    // Filtre par disponibilité
    if (availabilityFilter !== 'all') {
      const isAvailable = availabilityFilter === 'available';
      if (product.available !== isAvailable) {
        return false;
      }
    }

    return true;
  });

  // Fonction pour réinitialiser tous les filtres
  const clearAllFilters = () => {
    setPriceFilter({ min: '', max: '' });
    setAvailabilityFilter('all');
  };

  // Statistiques de filtrage
  const filterStats = {
    total: products.length,
    filtered: filteredProducts.length,
    hasFilters: priceFilter.min || priceFilter.max || availabilityFilter !== 'all'
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Catégorie inconnue';
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#8B4513';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleArrayInputChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData({
      ...formData,
      [field]: items
    });
  };


  // Fonction pour formater les prix en Ariary
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-MG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom du produit est obligatoire');
      return false;
    }
    if (!formData.categoryId) {
      setError('Veuillez sélectionner une catégorie');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Le prix doit être supérieur à 0 Ar');
      return false;
    }
    if (parseFloat(formData.price) < 100) {
      setError('Le prix minimum est de 100 Ar');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const productData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        currency: 'MGA',
        priceDisplay: `${formatPrice(parseFloat(formData.price))} Ar`
      };

      // Ajouter l'image seulement si elle existe
      if (formData.image.trim()) {
        productData.image = formData.image.trim();
      }

      if (editingProduct) {
        await updateDocument('products', editingProduct.id, productData);
      } else {
        await createDocument('products', productData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoryId: product.categoryId,
      image: product.image || '',
      ingredients: product.ingredients || [],
      allergens: product.allergens || [],
      available: product.available !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        setLoading(true);
        await deleteDocument('products', productId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      image: '',
      ingredients: [],
      allergens: [],
      available: true
    });
    setEditingProduct(null);
    setShowForm(false);
    setError('');
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
        <h1>Gestion des Produits</h1>
        <button
          className="add-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Nouveau Produit
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-controls">
        <div className="filters-grid">
          {/* Filtre par prix */}
          <div className="filter-group">
            <label>Prix (Ar)</label>
            <div className="price-range">
              <input
                type="number"
                placeholder="Min"
                value={priceFilter.min}
                onChange={(e) => setPriceFilter({...priceFilter, min: e.target.value})}
                className="price-input"
                step="100"
                min="0"
              />
              <span className="price-separator">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceFilter.max}
                onChange={(e) => setPriceFilter({...priceFilter, max: e.target.value})}
                className="price-input"
                step="100"
                min="0"
              />
            </div>
          </div>

          {/* Filtre par disponibilité */}
          <div className="filter-group">
            <label>Disponibilité</label>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tous les produits</option>
              <option value="available">Disponibles uniquement</option>
              <option value="unavailable">Indisponibles uniquement</option>
            </select>
          </div>
        </div>

        {/* Statistiques et actions */}
        <div className="filter-stats">
          <div className="stats-info">
            <span className="result-count">
              {filteredProducts.length} sur {products.length} produit(s)
            </span>
            {filterStats.hasFilters && (
              <button
                onClick={clearAllFilters}
                className="clear-filters-btn"
              >
                🗑️ Effacer les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>{editingProduct ? 'Modifier' : 'Ajouter'} un Produit</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Nom du produit *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Romazava, Ravitoto, Vary amin'anana"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="categoryId">Catégorie *</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Prix (Ar) *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    step="100"
                    min="100"
                    placeholder="Ex: 25000"
                  />
                  <small className="form-help">
                    Prix en Ariary malgache (Ar) - Minimum 100 Ar
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="image">Image du produit (optionnel)</label>
                  <input
                    type="url"
                    id="image"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small className="form-help">
                    URL de l'image hébergée sur internet (ex: imgur, Google Photos, etc.)
                  </small>

                  {/* Prévisualisation de l'image URL */}
                  {formData.image && (
                    <div className="image-preview">
                      <div className="preview-header">
                        <span>Prévisualisation</span>
                      </div>
                      <div className="preview-image">
                        <img
                          src={formData.image}
                          alt="Prévisualisation"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div style={{display: 'none', color: '#c62828', padding: '20px', textAlign: 'center'}}>
                          ❌ Impossible de charger l'image. Vérifiez l'URL.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description du produit"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ingredients">Ingrédients (séparés par des virgules)</label>
                  <input
                    type="text"
                    id="ingredients"
                    value={formData.ingredients.join(', ')}
                    onChange={(e) => handleArrayInputChange('ingredients', e.target.value)}
                    placeholder="Ex: Viande de bœuf, Bredes mafana, Gingembre"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="allergens">Allergènes (séparés par des virgules)</label>
                  <input
                    type="text"
                    id="allergens"
                    value={formData.allergens.join(', ')}
                    onChange={(e) => handleArrayInputChange('allergens', e.target.value)}
                    placeholder="Ex: Gluten, Lactose, Arachides"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                  />
                  Produit disponible
                </label>
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
        {loading && products.length === 0 ? (
          <div className="loading">Chargement des produits...</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-header">
                  <div
                    className="product-category-badge"
                    style={{ backgroundColor: getCategoryColor(product.categoryId) }}
                  >
                    {getCategoryName(product.categoryId)}
                  </div>
                  <div className={`product-status ${product.available ? 'available' : 'unavailable'}`}>
                    {product.available ? 'Disponible' : 'Indisponible'}
                  </div>
                </div>

                {product.image && (
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                )}

                <div className="product-content">
                  <h3>{product.name}</h3>
                  <div className="product-price">{formatPrice(product.price)} Ar</div>

                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}

                  {product.ingredients && product.ingredients.length > 0 && (
                    <div className="product-ingredients">
                      <strong>Ingrédients:</strong> {product.ingredients.join(', ')}
                    </div>
                  )}

                  {product.allergens && product.allergens.length > 0 && (
                    <div className="product-allergens">
                      <strong>Allergènes:</strong> {product.allergens.join(', ')}
                    </div>
                  )}
                </div>

                <div className="product-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(product)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(product.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && !loading && (
              <div className="empty-state">
                {filterStats.hasFilters ? (
                  <>
                    <h3>🔍 Aucun résultat</h3>
                    <p>Aucun produit ne correspond à vos critères de recherche</p>
                    <button
                      onClick={clearAllFilters}
                      className="clear-filters-btn large"
                    >
                      Effacer tous les filtres
                    </button>
                  </>
                ) : (
                  <>
                    <h3>🍽️ Aucun produit</h3>
                    <p>Commencez par créer votre premier produit</p>
                    <button
                      className="add-button"
                      onClick={() => {
                        resetForm();
                        setShowForm(true);
                      }}
                    >
                      + Créer un produit
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;