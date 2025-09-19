import React, { useState, useEffect, useCallback } from 'react';
import { getAllDocuments, updateDocument } from '../../firebase/services';
import './Admin.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getAllDocuments('orders');
      allOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
      setOrders(allOrders);
    } catch (error) {
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (items, reduce = true) => {
    try {
      const allProducts = await getAllDocuments('products');
      const allStocks = await getAllDocuments('stock');

      console.log('🔍 Produits disponibles:', allProducts.map(p => ({ id: p.id, name: p.name })));
      console.log('📊 Stocks disponibles:', allStocks.map(s => ({
        id: s.id,
        productId: s.productId,
        currentStock: s.currentStock
      })));
      console.log('📦 Articles de la commande:', items);

      const stockUpdates = [];

      for (const item of items) {
        console.log(`\n🔎 Traitement de l'article: "${item.name}"`);

        // 1. Trouver le produit par nom
        let product = allProducts.find(p => p.name === item.name);

        if (!product) {
          product = allProducts.find(p =>
            p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
        }

        if (!product) {
          product = allProducts.find(p =>
            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(p.name.toLowerCase())
          );
        }

        if (product) {
          console.log(`✅ Produit trouvé: "${product.name}" (ID: ${product.id})`);

          // 2. Trouver l'entrée de stock par productId
          const stockEntry = allStocks.find(s => s.productId === product.id);

          if (stockEntry) {
            const currentStock = Number(stockEntry.currentStock) || 0;
            const itemQuantity = Number(item.quantity) || 0;

            if (reduce) {
              // Livraison: réduire currentStock et augmenter soldQuantity
              const newCurrentStock = Math.max(0, currentStock - itemQuantity);
              const newSoldQuantity = (Number(stockEntry.soldQuantity) || 0) + itemQuantity;

              console.log(`📊 ${product.name}: currentStock ${currentStock} - ${itemQuantity} = ${newCurrentStock}`);
              console.log(`📊 ${product.name}: soldQuantity ${stockEntry.soldQuantity || 0} + ${itemQuantity} = ${newSoldQuantity}`);

              await updateDocument('stock', stockEntry.id, {
                currentStock: newCurrentStock,
                soldQuantity: newSoldQuantity,
                updatedAt: new Date()
              });

              stockUpdates.push({
                productId: product.id,
                productName: product.name,
                stockId: stockEntry.id,
                oldCurrentStock: currentStock,
                newCurrentStock: newCurrentStock,
                soldQuantity: newSoldQuantity,
                change: -itemQuantity
              });
            } else {
              // Ajout de stock
              const newCurrentStock = currentStock + itemQuantity;
              const newAddedStock = (Number(stockEntry.addedStock) || 0) + itemQuantity;

              console.log(`📊 ${product.name}: currentStock ${currentStock} + ${itemQuantity} = ${newCurrentStock}`);

              await updateDocument('stock', stockEntry.id, {
                currentStock: newCurrentStock,
                addedStock: newAddedStock,
                updatedAt: new Date()
              });

              stockUpdates.push({
                productId: product.id,
                productName: product.name,
                stockId: stockEntry.id,
                oldCurrentStock: currentStock,
                newCurrentStock: newCurrentStock,
                change: itemQuantity
              });
            }
          } else {
            console.warn(`⚠️ Entrée de stock non trouvée pour le produit: "${product.name}" (ID: ${product.id})`);
          }
        } else {
          console.warn(`⚠️ Produit non trouvé: "${item.name}"`);
          console.log('🔍 Noms de produits disponibles:', allProducts.map(p => p.name));
        }
      }

      console.log('✅ Mises à jour du stock terminées:', stockUpdates);
      return stockUpdates;

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du stock:', error);
      throw error;
    }
  };

  const addToSales = async (order) => {
    try {
      const salesData = {
        orderId: order.id,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
        items: order.items,
        totalAmount: order.subtotal,
        saleDate: new Date().toISOString(),
        originalOrderDate: order.orderDate
      };

      await getAllDocuments('sales').then(async (existingSales) => {
        const existingSale = existingSales.find(sale => sale.orderId === order.id);
        if (!existingSale) {
          const { createDocument } = await import('../../firebase/services');
          await createDocument('sales', salesData);
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux ventes:', error);
      throw error;
    }
  };

  const handleOrderAction = async (orderId, action, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));

      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      let updateData = {};

      switch (action) {
        case 'deliver':
          console.log('🚚 Début de la livraison pour la commande:', order.id);
          console.log('📋 Articles à traiter:', order.items);

          updateData = {
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
            deliveredBy: localStorage.getItem('userEmail') || 'admin'
          };

          // Réduire le stock AVANT de mettre à jour le statut
          console.log('📦 Réduction du stock en cours...');
          const stockUpdates = await updateStock(order.items, true);

          // Ajouter les détails de stock à la commande
          updateData.stockUpdates = stockUpdates;

          // Ajouter aux ventes
          console.log('💰 Ajout aux ventes en cours...');
          await addToSales(order);

          console.log('✅ Livraison terminée avec succès');
          break;

        case 'refuse':
          updateData = {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: localStorage.getItem('userEmail') || 'admin',
            cancellationReason: reason || 'Refusée par l\'administration'
          };
          break;

        case 'pending':
          updateData = {
            status: 'pending',
            pendingReason: reason || 'En attente de traitement'
          };
          break;

        case 'confirm':
          updateData = {
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
            confirmedBy: localStorage.getItem('userEmail') || 'admin'
          };
          break;

        case 'prepare':
          updateData = {
            status: 'preparing',
            preparingAt: new Date().toISOString()
          };
          break;

        case 'ready':
          updateData = {
            status: 'ready',
            readyAt: new Date().toISOString()
          };
          break;

        default:
          return;
      }

      await updateDocument('orders', orderId, updateData);
      await loadOrders();

    } catch (error) {
      setError(`Erreur lors de l'action: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const checkStockAvailability = useCallback(async (items) => {
    try {
      const allProducts = await getAllDocuments('products');
      const allStocks = await getAllDocuments('stock');

      const unavailableItems = [];
      const foundProducts = [];

      for (const item of items) {
        // Trouver le produit par nom
        let product = allProducts.find(p => p.name === item.name);

        if (!product) {
          product = allProducts.find(p =>
            p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
        }

        if (!product) {
          product = allProducts.find(p =>
            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(p.name.toLowerCase())
          );
        }

        if (product) {
          // Trouver le stock correspondant par productId
          const stockEntry = allStocks.find(s => s.productId === product.id);

          if (stockEntry) {
            const currentStock = Number(stockEntry.currentStock) || 0;
            const itemQuantity = Number(item.quantity) || 0;

            foundProducts.push({
              itemName: item.name,
              productName: product.name,
              productId: product.id,
              requested: itemQuantity,
              available: currentStock,
              sufficient: currentStock >= itemQuantity
            });

            if (currentStock < itemQuantity) {
              unavailableItems.push({
                name: item.name,
                productName: product.name,
                requested: itemQuantity,
                available: currentStock,
                shortage: itemQuantity - currentStock
              });
            }
          } else {
            unavailableItems.push({
              name: item.name,
              productName: product.name,
              requested: item.quantity,
              available: 0,
              shortage: item.quantity,
              noStockEntry: true
            });
          }
        } else {
          unavailableItems.push({
            name: item.name,
            requested: item.quantity,
            available: 0,
            shortage: item.quantity,
            notFound: true
          });
        }
      }

      if (unavailableItems.length > 0) {
        const messages = unavailableItems.map(item => {
          if (item.notFound) {
            return `${item.name}: produit non trouvé`;
          }
          if (item.noStockEntry) {
            return `${item.name}: entrée de stock manquante`;
          }
          return `${item.name}: stock insuffisant (demandé: ${item.requested}, disponible: ${item.available})`;
        });

        const result = {
          available: false,
          message: `Stock insuffisant:\n${messages.join('\n')}`,
          details: unavailableItems
        };

        return result;
      }

      const result = {
        available: true,
        message: 'Stock suffisant pour tous les articles',
        details: foundProducts
      };

      return result;

    } catch (error) {
      console.error('❌ Erreur lors de la vérification du stock:', error);
      return {
        available: false,
        message: 'Erreur lors de la vérification du stock: ' + error.message
      };
    }
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' Ar';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
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
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const ActionButtons = ({ order }) => {
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [reason, setReason] = useState('');
    const [actionType, setActionType] = useState('');
    const [stockCheck, setStockCheck] = useState({ available: true, message: '' });

    // Vérifier le stock quand on arrive sur "ready"
    useEffect(() => {
      if (order.status === 'ready') {
        const verifyStock = async () => {
          const result = await checkStockAvailability(order.items);
          setStockCheck(result);
        };

        verifyStock();
      }
    }, [order.status, order.items, order.id]);

    const handleActionWithReason = (type) => {
      setActionType(type);
      setShowReasonModal(true);
    };

    const handleDelivery = async () => {
      const stockVerification = await checkStockAvailability(order.items);

      if (!stockVerification.available) {
        setError(`Impossible de livrer la commande:\n${stockVerification.message}`);
        return;
      }

      handleOrderAction(order.id, 'deliver');
    };

    const confirmAction = () => {
      handleOrderAction(order.id, actionType, reason);
      setShowReasonModal(false);
      setReason('');
    };

    return (
      <div className="order-actions">
        {order.status === 'pending' && (
          <>
            <button
              className="action-btn confirm-btn"
              onClick={() => handleOrderAction(order.id, 'confirm')}
              disabled={actionLoading[order.id]}
            >
              ✓ Confirmer
            </button>
            <button
              className="action-btn refuse-btn"
              onClick={() => handleActionWithReason('refuse')}
              disabled={actionLoading[order.id]}
            >
              ✗ Refuser
            </button>
          </>
        )}

        {order.status === 'confirmed' && (
          <>
            <button
              className="action-btn prepare-btn"
              onClick={() => handleOrderAction(order.id, 'prepare')}
              disabled={actionLoading[order.id]}
            >
              👨‍🍳 Préparer
            </button>
            <button
              className="action-btn refuse-btn"
              onClick={() => handleActionWithReason('refuse')}
              disabled={actionLoading[order.id]}
            >
              ✗ Annuler
            </button>
          </>
        )}

        {order.status === 'preparing' && (
          <>
            <button
              className="action-btn ready-btn"
              onClick={() => handleOrderAction(order.id, 'ready')}
              disabled={actionLoading[order.id]}
            >
              ✅ Prêt
            </button>
          </>
        )}

        {order.status === 'ready' && (
          <>
            <button
              className="action-btn deliver-btn"
              onClick={handleDelivery}
              disabled={actionLoading[order.id] || !stockCheck.available}
            >
              🚚 Livrer
            </button>
            {!stockCheck.available && (
              <div className="stock-warning">
                <span>⚠️ Stock insuffisant</span>
                <small title={stockCheck.message}>Voir détails</small>
              </div>
            )}
            {stockCheck.available && (
              <div className="stock-ok">
                <span>✅ Stock suffisant</span>
              </div>
            )}
          </>
        )}

        {['delivered', 'cancelled'].includes(order.status) && (
          <span className="status-final">
            {order.status === 'delivered' ? '✅ Livrée' : '❌ Annulée'}
          </span>
        )}

        {actionLoading[order.id] && (
          <span className="loading-action">⏳</span>
        )}

        {showReasonModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>
                {actionType === 'refuse' ? 'Raison du refus' : 'Raison de la mise en attente'}
              </h3>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Saisissez la raison..."
                rows={3}
              />
              <div className="modal-actions">
                <button onClick={() => setShowReasonModal(false)}>Annuler</button>
                <button onClick={confirmAction} className="confirm-btn">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📋 Gestion des Commandes</h1>
        <div className="order-filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Toutes les commandes</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="preparing">En préparation</option>
            <option value="ready">Prêtes</option>
            <option value="delivered">Livrées</option>
            <option value="cancelled">Annulées</option>
          </select>
          <button onClick={loadOrders} className="refresh-btn">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-content">
        {loading ? (
          <div className="loading">Chargement des commandes...</div>
        ) : filteredOrders.length > 0 ? (
          <div className="orders-management-list">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-management-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>#{order.id.slice(-8).toUpperCase()}</h3>
                    <p className="order-date">{formatDate(order.orderDate)}</p>
                    <div
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusText(order.status)}
                    </div>
                  </div>
                  <div className="order-amount">
                    <span className="amount">{formatPrice(order.subtotal)}</span>
                  </div>
                </div>

                <div className="client-info">
                  <p><strong>Client:</strong> {order.clientName}</p>
                  <p><strong>Email:</strong> {order.clientEmail}</p>
                </div>

                <div className="order-items">
                  <h4>Articles commandés:</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}x {item.name} - {formatPrice(item.price * item.quantity)}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.note && (
                  <div className="order-note">
                    <strong>Note:</strong> {order.note}
                  </div>
                )}

                <ActionButtons order={order} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Aucune commande trouvée</h2>
            <p>
              {filter === 'all'
                ? 'Aucune commande n\'a été passée pour le moment'
                : `Aucune commande ${getStatusText(filter).toLowerCase()}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;