import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument
} from '../../firebase/services';
import './Admin.css';

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    items: [{ name: '', quantity: 1, unitPrice: '', total: 0 }],
    totalExpense: 0,
    description: '',
    category: 'Ingrédients'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expenseCategories = [
    'Ingrédients',
    'Équipement',
    'Maintenance',
    'Électricité',
    'Eau',
    'Gaz',
    'Marketing',
    'Autres'
  ];

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('expenses');
      setExpenses(data.filter(expense => expense.date === selectedDate));
    } catch (error) {
      setError('Erreur lors du chargement des dépenses');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadExpenses();
  }, [selectedDate, loadExpenses]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: selectedDate
    }));
  }, [selectedDate]);

  const calculateItemTotal = (quantity, unitPrice) => {
    return quantity * parseFloat(unitPrice || 0);
  };

  const calculateTotalExpense = (items) => {
    return items.reduce((total, item) => total + item.total, 0);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = calculateItemTotal(
        newItems[index].quantity,
        newItems[index].unitPrice
      );
    }

    const totalExpense = calculateTotalExpense(newItems);

    setFormData({
      ...formData,
      items: newItems,
      totalExpense
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unitPrice: '', total: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      const totalExpense = calculateTotalExpense(newItems);
      setFormData({
        ...formData,
        items: newItems,
        totalExpense
      });
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expenseData = {
        ...formData,
        totalExpense: calculateTotalExpense(formData.items)
      };

      if (editingExpense) {
        await updateDocument('expenses', editingExpense.id, expenseData);
      } else {
        await createDocument('expenses', expenseData);
      }

      await loadExpenses();
      resetForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      items: expense.items || [{ name: '', quantity: 1, unitPrice: '', total: 0 }],
      totalExpense: expense.totalExpense || 0,
      description: expense.description || '',
      category: expense.category || 'Ingrédients'
    });
    setShowForm(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        setLoading(true);
        await deleteDocument('expenses', expenseId);
        await loadExpenses();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: selectedDate,
      items: [{ name: '', quantity: 1, unitPrice: '', total: 0 }],
      totalExpense: 0,
      description: '',
      category: 'Ingrédients'
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const getTotalForDay = () => {
    return expenses.reduce((total, expense) => total + (expense.totalExpense || 0), 0);
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
        <h1>Gestion des Dépenses</h1>
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Nouvelle Dépense
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
        <div className="daily-total">
          <strong>Total du jour: {getTotalForDay().toFixed(2)} Ar</strong>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>{editingExpense ? 'Modifier' : 'Ajouter'} une Dépense</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Catégorie *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {expenseCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de la dépense"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Articles achetés</label>
                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <input
                        type="text"
                        placeholder="Nom de l'article"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Quantité"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Prix unitaire"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        step="0.01"
                        min="0"
                        required
                      />
                      <div className="item-total">
                        {item.total.toFixed(2)} Ar
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() => removeItem(index)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-item-button"
                    onClick={addItem}
                  >
                    + Ajouter un article
                  </button>
                </div>
              </div>

              <div className="total-expense">
                <strong>Total de la dépense: {formData.totalExpense.toFixed(2)} Ar</strong>
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
        {loading && expenses.length === 0 ? (
          <div className="loading">Chargement des dépenses...</div>
        ) : (
          <div className="expenses-list">
            {expenses.map(expense => (
              <div key={expense.id} className="expense-card">
                <div className="expense-header">
                  <div className="expense-category">
                    {expense.category}
                  </div>
                  <div className="expense-total">
                    {expense.totalExpense?.toFixed(2)} Ar
                  </div>
                </div>

                <div className="expense-content">
                  <div className="expense-date">
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </div>

                  {expense.description && (
                    <p className="expense-description">{expense.description}</p>
                  )}

                  <div className="expense-items">
                    <h4>Articles:</h4>
                    {expense.items?.map((item, index) => (
                      <div key={index} className="expense-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-details">
                          {item.quantity} x {item.unitPrice}Ar = {item.total?.toFixed(2)}Ar
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="expense-meta">
                    <small>
                      Créé le: {new Date(expense.createdAt?.seconds * 1000).toLocaleString('fr-FR')}
                    </small>
                  </div>
                </div>

                <div className="expense-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(expense)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(expense.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}

            {expenses.length === 0 && !loading && (
              <div className="empty-state">
                <h3>Aucune dépense trouvée</h3>
                <p>Aucune dépense enregistrée pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
                <button
                  className="add-button"
                  onClick={() => setShowForm(true)}
                >
                  + Ajouter une dépense
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Expenses;