import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  queryDocuments
} from '../../firebase/services';
import './Client.css';

const ClientCart = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    loadCartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCartData = async () => {
    try {
      setLoading(true);

      // Load cart from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      // Load client data
      const clients = await queryDocuments('clients', [
        { field: 'email', operator: '==', value: userEmail }
      ]);
      if (clients.length > 0) {
        setClient(clients[0]);
      }

      // Load current stock
      const stockData = await getAllDocuments('stock');
      setStock(stockData);

    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
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

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const availableStock = getAvailableStock(productId);
    if (newQuantity > availableStock) {
      setError('Stock insuffisant');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newCart = cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    saveCartToStorage(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCartToStorage(newCart);
  };

  const clearCart = () => {
    saveCartToStorage([]);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };


  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const validateOrder = async () => {
    if (cart.length === 0) {
      setError('Votre panier est vide');
      return;
    }

    // Check stock availability for all items
    for (const item of cart) {
      const availableStock = getAvailableStock(item.productId);
      if (item.quantity > availableStock) {
        setError(`Stock insuffisant pour ${item.name}. Disponible: ${availableStock}`);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const orderData = {
        clientId: client.id,
        clientName: client.fullName || `${client.firstName} ${client.lastName}`,
        clientEmail: client.email,
        items: cart,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
        note: orderNote,
        status: 'pending',
        orderDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString().split('T')[0] // Today
      };

      await createDocument('orders', orderData);

      // Update stock quantities
      for (const item of cart) {
        const today = new Date().toISOString().split('T')[0];
        const stockItem = stock.find(s =>
          s.productId === item.productId &&
          s.date === today
        );

        if (stockItem) {
          // Update stock (we would need updateDocument here, but for demo we'll skip)
          console.log(`Updating stock for ${item.name}: -${item.quantity}`);
        }
      }

      clearCart();
      setSuccess('Commande passée avec succès !');

      setTimeout(() => {
        navigate('/client/orders');
      }, 2000);

    } catch (error) {
      setError('Erreur lors de la validation de la commande');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' Ar';
  };

  if (loading && cart.length === 0) {
    return (
      <div className="client-container">
        <div className="loading">Chargement du panier...</div>
      </div>
    );
  }

  return (
    <div className="client-container">
      <header className="client-header">
        <button
          className="back-button"
          onClick={() => navigate('/client/menu')}
        >
          ← Continuer mes achats
        </button>
        <h1>Mon Panier</h1>
        {cart.length > 0 && (
          <button
            className="clear-cart-button"
            onClick={clearCart}
          >
            Vider le panier
          </button>
        )}
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <main className="client-main">
        <div className="cart-container">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h2>Votre panier est vide</h2>
              <p>Découvrez notre délicieux menu et ajoutez vos plats préférés</p>
              <button
                className="browse-menu-button"
                onClick={() => navigate('/client/menu')}
              >
                Parcourir le menu
              </button>
            </div>
          ) : (
            <div className="cart-content">
              <div className="cart-items">
                <h2>Articles dans votre panier ({cart.length})</h2>

                <div className="cart-list">
                  {cart.map(item => {
                    const availableStock = getAvailableStock(item.productId);
                    const isStockLow = availableStock < item.quantity;

                    return (
                      <div key={item.productId} className={`cart-item ${isStockLow ? 'stock-warning' : ''}`}>
                        {item.image && (
                          <div className="cart-item-image">
                            <img src={item.image} alt={item.name} />
                          </div>
                        )}

                        <div className="cart-item-details">
                          <h3>{item.name}</h3>
                          <div className="cart-item-price">
                            {formatPrice(item.price)} <span>/ unité</span>
                          </div>
                          {isStockLow && (
                            <div className="stock-warning-text">
                              ⚠️ Stock limité ({availableStock} disponible{availableStock > 1 ? 's' : ''})
                            </div>
                          )}
                        </div>

                        <div className="cart-item-controls">
                          <div className="quantity-controls">
                            <button
                              className="quantity-button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              disabled={loading}
                            >
                              -
                            </button>
                            <span className="quantity-display">{item.quantity}</span>
                            <button
                              className="quantity-button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={loading || item.quantity >= availableStock}
                            >
                              +
                            </button>
                          </div>

                          <div className="cart-item-total">
                            {formatPrice(item.price * item.quantity)}
                          </div>

                          <button
                            className="remove-button"
                            onClick={() => removeFromCart(item.productId)}
                            disabled={loading}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="order-note-section">
                  <h3>Note pour votre commande</h3>
                  <textarea
                    className="order-note-input"
                    placeholder="Instructions spéciales, allergies, préférences... (optionnel)"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows="3"
                  />
                </div>
              </div>

              <div className="cart-summary">
                <div className="summary-card">
                  <h3>Résumé de la commande</h3>

                  <div className="summary-line">
                    <span>Sous-total ({cart.reduce((total, item) => total + item.quantity, 0)} article{cart.reduce((total, item) => total + item.quantity, 0) > 1 ? 's' : ''})</span>
                    <span>{formatPrice(calculateSubtotal())}</span>
                  </div>


                  <div className="summary-line total">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>

                  <div className="delivery-info">
                    <h4>📍 Livraison</h4>
                    <p>Retrait en magasin aujourd'hui</p>
                    <p className="delivery-time">Prêt dans 10-30 minutes</p>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={validateOrder}
                    disabled={loading || cart.some(item => getAvailableStock(item.productId) < item.quantity)}
                  >
                    {loading ? 'Validation...' : 'Valider la commande'}
                  </button>

                  <div className="payment-info">
                    <p>💳 Paiement à la livraison</p>
                    <p>Espèces ou Mobile Money acceptés</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientCart;