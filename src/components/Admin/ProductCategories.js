import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  queryDocuments
} from '../../firebase/services';
import './Admin.css';

const ProductCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8B4513'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCollection('categories', (data) => {
      const sortedData = sortCategories(data, sortBy);
      setCategories(sortedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);


  const sortCategories = (data, sortField) => {
    return [...data].sort((a, b) => {
      if (sortField === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortField === 'createdAt') {
        return new Date(b.createdAt?.seconds * 1000) - new Date(a.createdAt?.seconds * 1000);
      }
      return 0;
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom de la catégorie est obligatoire');
      return false;
    }
    if (formData.name.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères');
      return false;
    }
    if (formData.name.length > 50) {
      setError('Le nom ne peut pas dépasser 50 caractères');
      return false;
    }
    return true;
  };

  const checkDuplicateName = async (name, excludeId = null) => {
    try {
      const existingCategories = await queryDocuments('categories', [
        { field: 'name', operator: '==', value: name.trim() }
      ]);
      return existingCategories.some(cat => cat.id !== excludeId);
    } catch (error) {
      console.error('Erreur vérification doublon:', error);
      return false;
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
    setSuccess('');

    // Validation
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Vérifier les doublons
      const isDuplicate = await checkDuplicateName(
        formData.name,
        editingCategory?.id
      );

      if (isDuplicate) {
        setError('Une catégorie avec ce nom existe déjà');
        setLoading(false);
        return;
      }

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        isActive: true
      };

      if (editingCategory) {
        await updateDocument('categories', editingCategory.id, categoryData);
        setSuccess('Catégorie modifiée avec succès!');
      } else {
        await createDocument('categories', categoryData);
        setSuccess('Catégorie créée avec succès!');
      }

      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setError(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#8B4513'
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?\n\nCette action est irréversible.`)) {
      try {
        setLoading(true);
        setError('');

        // Vérifier si des produits utilisent cette catégorie
        const productsUsingCategory = await queryDocuments('products', [
          { field: 'categoryId', operator: '==', value: categoryId }
        ]);

        if (productsUsingCategory.length > 0) {
          setError(`Impossible de supprimer cette catégorie car ${productsUsingCategory.length} produit(s) l'utilisent encore.`);
          setLoading(false);
          return;
        }

        await deleteDocument('categories', categoryId);
        setSuccess('Catégorie supprimée avec succès!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Erreur suppression:', error);
        setError(`Erreur lors de la suppression: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#8B4513'
    });
    setEditingCategory(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="admin-container">
      <header className="admin-header">
        <button
          className="back-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          ← Retour
        </button>
        <h1>Gestion des Catégories de Produits</h1>
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Nouvelle Catégorie
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCategory ? 'Modifier' : 'Ajouter'} une Catégorie</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="name">Nom de la catégorie *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Entrées, Plats principaux, Desserts"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de la catégorie"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Couleur d'affichage</label>
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={loading || !formData.name.trim()} className="save-button">
                  {loading ? (
                    <>
                      <span className="button-spinner"></span>
                      {editingCategory ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    editingCategory ? 'Modifier' : 'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="sort-controls">
          <label htmlFor="sortBy">Trier par:</label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Nom (A-Z)</option>
            <option value="createdAt">Date de création</option>
          </select>
        </div>

        <div className="stats">
          <span className="category-count">
            {filteredCategories.length} catégorie(s) trouvée(s)
          </span>
        </div>
      </div>

      <main className="admin-main">
        {loading && categories.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Chargement des catégories...</p>
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.map(category => (
              <div key={category.id} className="category-card">
                <div
                  className="category-color"
                  style={{ backgroundColor: category.color || '#8B4513' }}
                ></div>
                <div className="category-content">
                  <h3>{category.name}</h3>
                  {category.description && (
                    <p className="category-description">{category.description}</p>
                  )}
                  <div className="category-meta">
                    <small>
                      Créé le: {category.createdAt ? new Date(category.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </small>
                    {category.updatedAt && category.updatedAt.seconds !== category.createdAt?.seconds && (
                      <small>
                        Modifié le: {new Date(category.updatedAt.seconds * 1000).toLocaleDateString('fr-FR')}
                      </small>
                    )}
                  </div>
                </div>
                <div className="category-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(category)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(category.id, category.name)}
                    disabled={loading}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && categories.length > 0 && (
              <div className="empty-state">
                <h3>🔍 Aucun résultat</h3>
                <p>Aucune catégorie ne correspond à votre recherche "{searchTerm}"</p>
                <button
                  className="clear-search-button"
                  onClick={() => setSearchTerm('')}
                >
                  Effacer la recherche
                </button>
              </div>
            )}

            {categories.length === 0 && !loading && (
              <div className="empty-state">
                <h3>📁 Aucune catégorie</h3>
                <p>Commencez par créer votre première catégorie de produits</p>
                <button
                  className="add-button"
                  onClick={() => setShowForm(true)}
                >
                  + Créer une catégorie
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductCategories;