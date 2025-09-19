import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments
} from '../../firebase/services';
import './Client.css';

const ClientMenu = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stock, setStock] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadMenuData();
    loadCartFromStorage();
  }, []);

  const loadMenuData = async () => {
    try {
      setLoading(true);

      // Load all data
      const [productsData, categoriesData, stockData] = await Promise.all([
        getAllDocuments('products'),
        getAllDocuments('categories'),
        getAllDocuments('stock')
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setStock(stockData);

    } catch (error) {
      setError('Erreur lors du chargement du menu');
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCartToStorage = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const getAvailableStock = (productId) => {
    const today = new Date().toISOString().split('T')[0];
    const todayStock = stock.find(s =>
      s.productId === productId &&
      s.date === today
    );
    return todayStock ? todayStock.availableQuantity : 0;
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Catégorie inconnue';
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#gray';
  };

  const getFilteredProducts = () => {
    let filtered = products.filter(product => product.available);

    // Filtre par stock
    if (stockFilter === 'commandable') {
      filtered = filtered.filter(product => getAvailableStock(product.id) !== 0);
    } else if (stockFilter === 'non-commandable') {
      filtered = filtered.filter(product => getAvailableStock(product.id) === 0);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Trier par stock disponible (plus de stock en premier)
    return filtered.sort((a, b) => {
      const stockA = getAvailableStock(a.id);
      const stockB = getAvailableStock(b.id);
      return stockB - stockA;
    });
  };

  const addToCart = (product) => {
    const availableStock = getAvailableStock(product.id);
    const existingItem = cart.find(item => item.productId === product.id);


    if (availableStock <= 0) {
      setError('Ce produit n\'est plus disponible');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (existingItem) {
      // Vérifier si on peut ajouter +1 sans dépasser le stock
      if (existingItem.quantity + 1 > availableStock) {
        setError(`Stock insuffisant - Stock: ${availableStock}, Dans panier: ${existingItem.quantity}`);
        setTimeout(() => setError(''), 3000);
        return;
      }

      const newCart = cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCartToStorage(newCart);
    } else {
      const newItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      };
      saveCartToStorage([...cart, newItem]);
    }
  };

  const getCartItemQuantity = (productId) => {
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' Ar';
  };

  return (
    <div className="client-container">
      <header className="client-header">
        <button
          className="back-button"
          onClick={() => navigate('/client/dashboard')}
        >
          ← Retour
        </button>
        <h1>Menu du Jour</h1>
        <div className="header-actions">
          <button
            className="cart-button"
            onClick={() => navigate('/client/cart')}
          >
            🛒 Panier ({getTotalCartItems()})
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Search and Filters */}
      <div className="menu-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="stock-filters">
          <button
            className={`filter-button ${stockFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStockFilter('all')}
          >
            Tous les plats
          </button>
          <button
            className={`filter-button ${stockFilter === 'commandable' ? 'active' : ''}`}
            onClick={() => setStockFilter('commandable')}
          >
            Commandable
          </button>
          <button
            className={`filter-button ${stockFilter === 'non-commandable' ? 'active' : ''}`}
            onClick={() => setStockFilter('non-commandable')}
          >
            Non commandable
          </button>
        </div>

        <div className="category-filters">
          <button
            className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Tous
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              className={`filter-button ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : 'transparent',
                borderColor: category.color,
                color: selectedCategory === category.id ? 'white' : category.color
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <main className="client-main">
        <div className="menu-container">
          {loading ? (
            <div className="loading">Chargement du menu...</div>
          ) : getFilteredProducts().length > 0 ? (
            <div className="products-grid">
              {getFilteredProducts().map(product => {
                const availableStock = getAvailableStock(product.id);
                const cartQuantity = getCartItemQuantity(product.id);
                const isOutOfStock = availableStock <= 0;
                const isLowStock = availableStock > 0 && availableStock <= 5;

                return (
                  <div key={product.id} className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
                    {product.image && (
                      <div className="product-image">
                        <img src={product.image} alt={product.name} />
                        {isOutOfStock && (
                          <div className="stock-overlay">
                            <span>Rupture de stock</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="product-content">
                      <div className="product-header">
                        <h3>{product.name}</h3>
                        <div
                          className="category-badge"
                          style={{ backgroundColor: getCategoryColor(product.categoryId) }}
                        >
                          {getCategoryName(product.categoryId)}
                        </div>
                      </div>

                      <p className="product-description">{product.description}</p>

                      {product.ingredients && (
                        <div className="product-ingredients">
                          <strong>Ingrédients:</strong> {product.ingredients}
                        </div>
                      )}

                      {product.allergens && (
                        <div className="product-allergens">
                          <strong>Allergènes:</strong> {product.allergens}
                        </div>
                      )}

                      <div className="product-footer">
                        <div className="product-price">
                          {formatPrice(product.price)}
                        </div>

                        <div className="stock-info">
                          {isOutOfStock ? (
                            <span className="stock-status out">Rupture de stock</span>
                          ) : isLowStock ? (
                            <span className="stock-status low">
                              Plus que {availableStock} disponible{availableStock > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="stock-status available">
                              {availableStock} disponible{availableStock > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="product-actions">
                          {cartQuantity > 0 && (
                            <div className="cart-quantity">
                              Dans le panier: {cartQuantity}
                            </div>
                          )}

                          <button
                            className="add-to-cart-button"
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock || cartQuantity >= availableStock}
                          >
                            {isOutOfStock
                              ? 'Indisponible'
                              : cartQuantity >= availableStock
                                ? 'Stock max atteint'
                                : '+ Ajouter au panier'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-menu">
              <h3>Aucun plat disponible</h3>
              <p>
                {searchTerm || selectedCategory !== 'all'
                  ? 'Aucun plat ne correspond à vos critères de recherche'
                  : 'Le menu n\'est pas encore disponible pour aujourd\'hui'
                }
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button
                  className="reset-filters-button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Quick Cart Summary */}
      {cart.length > 0 && (
        <div className="quick-cart-summary">
          <div className="cart-summary-content">
            <span className="cart-summary-text">
              {getTotalCartItems()} article{getTotalCartItems() > 1 ? 's' : ''} dans le panier
            </span>
            <span className="cart-summary-total">
              {formatPrice(cart.reduce((total, item) => total + (item.price * item.quantity), 0))}
            </span>
            <button
              className="view-cart-button"
              onClick={() => navigate('/client/cart')}
            >
              Voir le panier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;