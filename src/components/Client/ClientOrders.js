import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryDocuments, getAllDocuments } from '../../firebase/services';
import './Client.css';

const ClientOrders = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [orders, setOrders] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrdersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrdersData = async () => {
    try {
      setLoading(true);

      // Load client data first
      const clients = await queryDocuments('clients', [
        { field: 'email', operator: '==', value: userEmail }
      ]);

      if (clients.length > 0) {
        const clientData = clients[0];
        setClient(clientData);

        // Load orders for this client
        const allOrders = await getAllDocuments('orders');
        const clientOrders = allOrders.filter(order => order.clientId === clientData.id);

        // Sort by date (most recent first)
        clientOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        setOrders(clientOrders);
      } else {
        setError('Client non trouvé');
      }
    } catch (error) {
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' Ar';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'preparing': return '#9b59b6';
      case 'ready': return '#2ecc71';
      case 'delivered': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente de confirmation';
      case 'confirmed': return 'Confirmée par le restaurant';
      case 'preparing': return 'En cours de préparation';
      case 'ready': return 'Prête pour retrait';
      case 'delivered': return 'Commande livrée';
      case 'cancelled': return 'Commande annulée';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '🍽️';
      case 'delivered': return '🎉';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusMessage = (order) => {
    switch (order.status) {
      case 'pending':
        return 'Votre commande est en attente de confirmation par notre équipe.';
      case 'confirmed':
        return 'Excellente nouvelle ! Votre commande a été confirmée et sera bientôt préparée.';
      case 'preparing':
        return 'Nos chefs préparent votre commande avec soin. Plus que quelques minutes !';
      case 'ready':
        return 'Votre commande est prête ! Vous pouvez venir la récupérer au restaurant.';
      case 'delivered':
        return `Commande livrée le ${order.deliveredAt ? formatDate(order.deliveredAt) : 'N/A'}. Merci pour votre confiance !`;
      case 'cancelled':
        return `Commande annulée. ${order.cancellationReason || 'Aucune raison spécifiée.'}`;
      default:
        return 'Statut de la commande non défini.';
    }
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
        <h1>Mes Commandes</h1>
        <div className="user-info">
          {client && (client.fullName || `${client.firstName} ${client.lastName}`)}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <main className="client-main">
        <div className="orders-container">
          {loading ? (
            <div className="loading">Chargement des commandes...</div>
          ) : orders.length > 0 ? (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="invoice-card">
                  {/* En-tête de la facture */}
                  <div className="invoice-header">
                    <div className="restaurant-info">
                      <h2>🍽️ Scandale Bouffe</h2>
                      <p>L'Art Culinaire Malgache</p>
                    </div>
                    <div className="invoice-details">
                      <h3>FACTURE #{order.id.slice(-8).toUpperCase()}</h3>
                      <p><strong>Date:</strong> {formatDate(order.orderDate)}</p>
                      <div
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {getStatusIcon(order.status)} {getStatusText(order.status)}
                      </div>
                    </div>
                  </div>

                  {/* Informations client */}
                  <div className="invoice-client-info">
                    <div className="client-section">
                      <h4>Facturé à :</h4>
                      <p><strong>{order.clientName}</strong></p>
                      <p>{order.clientEmail}</p>
                    </div>
                    <div className="delivery-section">
                      <h4>Livraison :</h4>
                      <p>📍 Retrait en magasin</p>
                      {order.deliveryDate && (
                        <p>📅 {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>

                  {/* Tableau des articles */}
                  <div className="invoice-items">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Article</th>
                          <th>Prix unitaire</th>
                          <th>Quantité</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, index) => (
                          <tr key={index}>
                            <td className="item-name">{item.name}</td>
                            <td className="item-unit-price">{formatPrice(item.price)}</td>
                            <td className="item-quantity">{item.quantity}</td>
                            <td className="item-total">{formatPrice(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Statut détaillé de la commande */}
                  <div className="order-status-section">
                    <h4>📋 Statut de votre commande :</h4>
                    <div className="status-message">
                      <div className="status-icon-large">{getStatusIcon(order.status)}</div>
                      <p>{getStatusMessage(order)}</p>
                    </div>

                    {/* Timeline des statuts */}
                    <div className="status-timeline">
                      <div className={`timeline-step ${['pending', 'confirmed', 'preparing', 'ready', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                        <div className="step-icon">⏳</div>
                        <span>Commande reçue</span>
                      </div>
                      <div className={`timeline-step ${['confirmed', 'preparing', 'ready', 'delivered'].includes(order.status) ? 'completed' : order.status === 'cancelled' ? 'cancelled' : ''}`}>
                        <div className="step-icon">✅</div>
                        <span>Confirmée</span>
                      </div>
                      <div className={`timeline-step ${['preparing', 'ready', 'delivered'].includes(order.status) ? 'completed' : order.status === 'cancelled' ? 'cancelled' : ''}`}>
                        <div className="step-icon">👨‍🍳</div>
                        <span>En préparation</span>
                      </div>
                      <div className={`timeline-step ${['ready', 'delivered'].includes(order.status) ? 'completed' : order.status === 'cancelled' ? 'cancelled' : ''}`}>
                        <div className="step-icon">🍽️</div>
                        <span>Prête</span>
                      </div>
                      <div className={`timeline-step ${order.status === 'delivered' ? 'completed' : order.status === 'cancelled' ? 'cancelled' : ''}`}>
                        <div className="step-icon">🎉</div>
                        <span>Livrée</span>
                      </div>
                    </div>

                    {/* Informations supplémentaires selon le statut */}
                    {order.status === 'confirmed' && order.confirmedAt && (
                      <div className="status-detail">
                        <small>✅ Confirmée le {formatDate(order.confirmedAt)} par {order.confirmedBy}</small>
                      </div>
                    )}
                    {order.status === 'preparing' && order.preparingAt && (
                      <div className="status-detail">
                        <small>👨‍🍳 Mise en préparation le {formatDate(order.preparingAt)}</small>
                      </div>
                    )}
                    {order.status === 'ready' && order.readyAt && (
                      <div className="status-detail">
                        <small>🍽️ Prête depuis le {formatDate(order.readyAt)}</small>
                      </div>
                    )}
                    {order.status === 'delivered' && order.deliveredAt && (
                      <div className="status-detail">
                        <small>🎉 Livrée le {formatDate(order.deliveredAt)} par {order.deliveredBy}</small>
                      </div>
                    )}
                    {order.status === 'cancelled' && order.cancelledAt && (
                      <div className="status-detail cancelled">
                        <small>❌ Annulée le {formatDate(order.cancelledAt)} par {order.cancelledBy}</small>
                        {order.cancellationReason && <p><strong>Raison :</strong> {order.cancellationReason}</p>}
                      </div>
                    )}
                    {order.pendingReason && (
                      <div className="status-detail pending">
                        <small>⏳ <strong>Note :</strong> {order.pendingReason}</small>
                      </div>
                    )}
                  </div>

                  {/* Note de commande */}
                  {order.note && (
                    <div className="invoice-note">
                      <h4>Instructions spéciales :</h4>
                      <p>{order.note}</p>
                    </div>
                  )}

                  {/* Récapitulatif financier */}
                  <div className="invoice-summary">
                    <div className="summary-section">
                      <div className="summary-line">
                        <span>Sous-total ({order.items.reduce((total, item) => total + item.quantity, 0)} article{order.items.reduce((total, item) => total + item.quantity, 0) > 1 ? 's' : ''})</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="summary-line total-line">
                        <span><strong>TOTAL À PAYER</strong></span>
                        <span><strong>{formatPrice(order.subtotal)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Pied de facture */}
                  <div className="invoice-footer">
                    <div className="payment-info">
                      <p><strong>💳 Mode de paiement :</strong> À la livraison</p>
                      <p><strong>⏱️ Temps de préparation :</strong> 10-30 minutes</p>
                    </div>
                    <div className="thank-you">
                      <p><em>Merci pour votre confiance !</em></p>
                      <p><small>Pour toute question, contactez-nous au restaurant.</small></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <div className="empty-orders-icon">📋</div>
              <h2>Aucune commande</h2>
              <p>Vous n'avez pas encore passé de commande</p>
              <button
                className="browse-menu-button"
                onClick={() => navigate('/client/menu')}
              >
                Parcourir le menu
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientOrders;