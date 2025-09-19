import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
} from '../../firebase/services';
import './Admin.css';

const EmployeeRatings = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [editingRating, setEditingRating] = useState(null);
  const [criteriaFormData, setCriteriaFormData] = useState({
    name: '',
    description: '',
    maxScore: 20,
    weight: 1
  });
  const [ratingFormData, setRatingFormData] = useState({
    employeeId: '',
    month: new Date().toISOString().substring(0, 7),
    ratings: {},
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, criteriaData] = await Promise.all([
        getAllDocuments('employees'),
        getAllDocuments('ratingCriteria')
      ]);

      setEmployees(employeesData.filter(emp => emp.status === 'active'));
      setCriteria(criteriaData);

      // Load ratings for selected month and employee
      const conditions = [
        { field: 'month', operator: '==', value: selectedMonth }
      ];

      if (selectedEmployee) {
        conditions.push({ field: 'employeeId', operator: '==', value: selectedEmployee });
      }

      const ratingsData = await queryDocuments('employeeRatings', conditions);
      setRatings(ratingsData);
    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeHistory = async () => {
    if (!selectedEmployee) return;

    try {
      const history = await getEmployeeRatingHistory(selectedEmployee);
      setEmployeeHistory(history);
    } catch (error) {
      console.error('Error loading employee history:', error);
    }
  };

  const handleCriteriaInputChange = (e) => {
    const { name, value, type } = e.target;
    setCriteriaFormData({
      ...criteriaFormData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };

  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingCriteria) {
        await updateDocument('ratingCriteria', editingCriteria.id, criteriaFormData);
      } else {
        await createDocument('ratingCriteria', criteriaFormData);
      }

      await loadData();
      resetCriteriaForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde du critère');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingInputChange = (criteriaId, value) => {
    const score = Math.min(Math.max(parseFloat(value) || 0, 0), 20);
    setRatingFormData({
      ...ratingFormData,
      ratings: {
        ...ratingFormData.ratings,
        [criteriaId]: score
      }
    });
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const totalScore = calculateTotalScore(ratingFormData.ratings);
      const ratingData = {
        ...ratingFormData,
        totalScore,
        ratingDate: new Date().toISOString()
      };

      if (editingRating) {
        // Update existing rating
        await updateDocument('employeeRatings', editingRating.id, ratingData);
      } else {
        // Check if rating already exists before creating
        const existingRating = ratings.find(
          rating => rating.employeeId === ratingFormData.employeeId && rating.month === ratingFormData.month
        );

        if (existingRating) {
          setError('Une notation existe déjà pour cet employé ce mois-ci. Utilisez le bouton "Modifier" pour la mettre à jour.');
          setLoading(false);
          return;
        }

        await createDocument('employeeRatings', ratingData);
      }

      await loadData();
      resetRatingForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde de la notation');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRating = (rating) => {
    setEditingRating(rating);
    setRatingFormData({
      employeeId: rating.employeeId,
      month: rating.month,
      ratings: rating.ratings || {},
      comments: rating.comments || ''
    });
    setShowRatingForm(true);
  };

  const handleEditCriteria = (criteria) => {
    setEditingCriteria(criteria);
    setCriteriaFormData({
      name: criteria.name,
      description: criteria.description || '',
      maxScore: criteria.maxScore || 20,
      weight: criteria.weight || 1
    });
    setShowCriteriaForm(true);
  };

  const handleDeleteCriteria = async (criteriaId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce critère ?')) {
      try {
        setLoading(true);
        await deleteDocument('ratingCriteria', criteriaId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteRating = async (ratingId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette notation ?')) {
      try {
        setLoading(true);
        await deleteDocument('employeeRatings', ratingId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetCriteriaForm = () => {
    setCriteriaFormData({
      name: '',
      description: '',
      maxScore: 20,
      weight: 1
    });
    setEditingCriteria(null);
    setShowCriteriaForm(false);
  };

  const resetRatingForm = () => {
    setRatingFormData({
      employeeId: '',
      month: new Date().toISOString().substring(0, 7),
      ratings: {},
      comments: ''
    });
    setEditingRating(null);
    setShowRatingForm(false);
  };

  const calculateTotalScore = (ratings) => {
    if (criteria.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    criteria.forEach(criterion => {
      const score = ratings[criterion.id] || 0;
      const weight = criterion.weight || 1;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const getEmployeeRating = (employeeId, month) => {
    return ratings.find(rating => rating.employeeId === employeeId && rating.month === month);
  };

  const getEmployeeAverage = (employeeId) => {
    const employeeRatings = ratings.filter(rating => rating.employeeId === employeeId);
    if (employeeRatings.length === 0) return 0;

    const total = employeeRatings.reduce((sum, rating) => sum + (rating.totalScore || 0), 0);
    return total / employeeRatings.length;
  };

  const getEmployeeRatingHistory = async (employeeId) => {
    try {
      const allRatings = await queryDocuments('employeeRatings', [
        { field: 'employeeId', operator: '==', value: employeeId }
      ]);
      return allRatings.sort((a, b) => new Date(b.month) - new Date(a.month));
    } catch (error) {
      console.error('Error fetching rating history:', error);
      return [];
    }
  };

  const getRatingColor = (score) => {
    if (score >= 16) return 'var(--accent-green)';
    if (score >= 12) return '#ff9800';
    if (score >= 8) return '#ff5722';
    return '#c62828';
  };

  const getRatingText = (score) => {
    if (score >= 16) return 'Excellent';
    if (score >= 12) return 'Bon';
    if (score >= 8) return 'Passable';
    return 'Insuffisant';
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
        <h1>Notes des Employés</h1>
        <div className="header-actions">
          <button
            className="add-button"
            onClick={() => setShowCriteriaForm(true)}
          >
            + Critère
          </button>
          <button
            className="add-button"
            onClick={() => setShowRatingForm(true)}
          >
            + Noter
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <div className="filter-group">
          <label>Mois:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="filter-group">
          <label>Employé:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="employee-filter"
          >
            <option value="">Tous les employés</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Criteria Management Form */}
      {showCriteriaForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCriteria ? 'Modifier' : 'Ajouter'} un Critère</h2>
              <button className="close-button" onClick={resetCriteriaForm}>×</button>
            </div>

            <form onSubmit={handleCriteriaSubmit} className="form">
              <div className="form-group">
                <label htmlFor="criteriaName">Nom du critère *</label>
                <input
                  type="text"
                  id="criteriaName"
                  name="name"
                  value={criteriaFormData.name}
                  onChange={handleCriteriaInputChange}
                  required
                  placeholder="Ex: Ponctualité, Qualité du travail..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="criteriaDescription">Description</label>
                <textarea
                  id="criteriaDescription"
                  name="description"
                  value={criteriaFormData.description}
                  onChange={handleCriteriaInputChange}
                  placeholder="Description du critère d'évaluation"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="maxScore">Score maximum</label>
                  <input
                    type="number"
                    id="maxScore"
                    name="maxScore"
                    value={criteriaFormData.maxScore}
                    onChange={handleCriteriaInputChange}
                    min="1"
                    max="20"
                    step="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="weight">Poids (coefficient)</label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    value={criteriaFormData.weight}
                    onChange={handleCriteriaInputChange}
                    min="0.1"
                    max="5"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetCriteriaForm} className="cancel-button">
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

      {/* Rating Form */}
      {showRatingForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>{editingRating ? 'Modifier la Notation' : 'Noter un Employé'}</h2>
              <button className="close-button" onClick={resetRatingForm}>×</button>
            </div>

            <form onSubmit={handleRatingSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ratingEmployee">Employé *</label>
                  <select
                    id="ratingEmployee"
                    name="employeeId"
                    value={ratingFormData.employeeId}
                    onChange={(e) => setRatingFormData({...ratingFormData, employeeId: e.target.value})}
                    required
                    disabled={editingRating}
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="ratingMonth">Mois *</label>
                  <input
                    type="month"
                    id="ratingMonth"
                    name="month"
                    value={ratingFormData.month}
                    onChange={(e) => setRatingFormData({...ratingFormData, month: e.target.value})}
                    required
                    disabled={editingRating}
                  />
                </div>
              </div>

              <div className="criteria-ratings">
                <h3>Évaluation par critères</h3>
                {criteria.map(criterion => (
                  <div key={criterion.id} className="criteria-rating-row">
                    <div className="criteria-info">
                      <h4>{criterion.name}</h4>
                      {criterion.description && (
                        <p className="criteria-description">{criterion.description}</p>
                      )}
                      <span className="criteria-details">
                        Max: {criterion.maxScore}/20 | Poids: {criterion.weight}
                      </span>
                    </div>
                    <div className="rating-input">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={ratingFormData.ratings[criterion.id] || ''}
                        onChange={(e) => handleRatingInputChange(criterion.id, e.target.value)}
                        placeholder="0-20"
                      />
                      <span>/20</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="total-score">
                <strong>Score total: {calculateTotalScore(ratingFormData.ratings).toFixed(1)}/20</strong>
              </div>

              <div className="form-group">
                <label htmlFor="comments">Commentaires</label>
                <textarea
                  id="comments"
                  name="comments"
                  value={ratingFormData.comments}
                  onChange={(e) => setRatingFormData({...ratingFormData, comments: e.target.value})}
                  placeholder="Commentaires sur la performance de l'employé"
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetRatingForm} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Sauvegarde...' : editingRating ? 'Modifier' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="admin-main">
        {/* Criteria Section */}
        <section className="criteria-section">
          <h2>Critères d'Évaluation</h2>
          {criteria.length > 0 ? (
            <div className="criteria-grid">
              {criteria.map(criterion => (
                <div key={criterion.id} className="criteria-card">
                  <h3>{criterion.name}</h3>
                  {criterion.description && (
                    <p className="criteria-description">{criterion.description}</p>
                  )}
                  <div className="criteria-meta">
                    <span>Max: {criterion.maxScore}/20</span>
                    <span>Poids: {criterion.weight}</span>
                  </div>
                  <div className="criteria-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEditCriteria(criterion)}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteCriteria(criterion.id)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Aucun critère d'évaluation défini</p>
              <button
                className="add-button"
                onClick={() => setShowCriteriaForm(true)}
              >
                + Ajouter un critère
              </button>
            </div>
          )}
        </section>

        {/* Ratings Section */}
        <section className="ratings-section">
          <h2>Évaluations - {new Date(selectedMonth).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</h2>
          {selectedEmployee ? (
            // Single employee view
            <div className="employee-ratings">
              {(() => {
                const employee = employees.find(emp => emp.id === selectedEmployee);
                const employeeRating = getEmployeeRating(selectedEmployee, selectedMonth);
                const average = getEmployeeAverage(selectedEmployee);

                return (
                  <div className="employee-rating-card">
                    <div className="employee-info">
                      <h3>{employee?.fullName}</h3>
                      <div className="rating-summary">
                        <div className="current-rating">
                          <span>Note du mois:</span>
                          <span
                            className="rating-score"
                            style={{ color: getRatingColor(employeeRating?.totalScore || 0) }}
                          >
                            {employeeRating ? employeeRating.totalScore.toFixed(1) : 'Non noté'}/20
                          </span>
                        </div>
                        <div className="average-rating">
                          <span>Moyenne générale:</span>
                          <span
                            className="rating-score"
                            style={{ color: getRatingColor(average) }}
                          >
                            {average.toFixed(1)}/20
                          </span>
                        </div>
                      </div>
                    </div>

                    {employeeRating && (
                      <div className="rating-details">
                        <h4>Détails de l'évaluation - {new Date(selectedMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h4>
                        {criteria.map(criterion => (
                          <div key={criterion.id} className="rating-detail-row">
                            <span>{criterion.name}:</span>
                            <span
                              style={{ color: getRatingColor(employeeRating.ratings[criterion.id] || 0) }}
                            >
                              {(employeeRating.ratings[criterion.id] || 0).toFixed(1)}/20
                            </span>
                          </div>
                        ))}
                        {employeeRating.comments && (
                          <div className="rating-comments">
                            <h5>Commentaires:</h5>
                            <p>{employeeRating.comments}</p>
                          </div>
                        )}
                        <div className="rating-actions">
                          <button
                            className="edit-button"
                            onClick={() => handleEditRating(employeeRating)}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteRating(employeeRating.id)}
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Historique complet des notations */}
                    {employeeHistory.length > 0 && (
                      <div className="rating-history">
                        <h4>Historique des évaluations</h4>
                        <div className="history-grid">
                          {employeeHistory.map(historyRating => (
                            <div key={historyRating.id} className="history-card">
                              <div className="history-header">
                                <h5>{new Date(historyRating.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h5>
                                <span
                                  className="history-total-score"
                                  style={{ color: getRatingColor(historyRating.totalScore) }}
                                >
                                  {historyRating.totalScore.toFixed(1)}/20
                                </span>
                              </div>

                              <div className="history-criteria">
                                {criteria.map(criterion => (
                                  <div key={criterion.id} className="history-criteria-row">
                                    <span className="criteria-name">{criterion.name}:</span>
                                    <span
                                      className="criteria-score"
                                      style={{ color: getRatingColor(historyRating.ratings[criterion.id] || 0) }}
                                    >
                                      {(historyRating.ratings[criterion.id] || 0).toFixed(1)}/20
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {historyRating.comments && (
                                <div className="history-comments">
                                  <strong>Commentaires:</strong> {historyRating.comments}
                                </div>
                              )}

                              <div className="history-actions">
                                <button
                                  className="edit-button small"
                                  onClick={() => handleEditRating(historyRating)}
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  className="delete-button small"
                                  onClick={() => handleDeleteRating(historyRating.id)}
                                >
                                  🗑️ Supprimer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            // All employees view
            <div className="all-employees-ratings">
              {employees.map(employee => {
                const employeeRating = getEmployeeRating(employee.id, selectedMonth);
                const average = getEmployeeAverage(employee.id);

                return (
                  <div key={employee.id} className="employee-summary-card">
                    <div className="employee-header">
                      <h3>{employee.fullName}</h3>
                      <span className="employee-position">{employee.position}</span>
                    </div>

                    <div className="rating-summary">
                      <div className="rating-item">
                        <span>Note du mois:</span>
                        <span
                          className="rating-score"
                          style={{ color: getRatingColor(employeeRating?.totalScore || 0) }}
                        >
                          {employeeRating ? employeeRating.totalScore.toFixed(1) : 'Non noté'}/20
                        </span>
                      </div>
                      <div className="rating-item">
                        <span>Moyenne générale:</span>
                        <span
                          className="rating-score"
                          style={{ color: getRatingColor(average) }}
                        >
                          {average.toFixed(1)}/20
                        </span>
                      </div>
                      <div className="rating-status">
                        {getRatingText(employeeRating?.totalScore || average)}
                      </div>
                    </div>

                    {/* Show detailed scores by criteria for current month */}
                    {employeeRating && (
                      <div className="criteria-scores">
                        <h4>Notes par critère ({new Date(selectedMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}):</h4>
                        <div className="criteria-scores-grid">
                          {criteria.map(criterion => (
                            <div key={criterion.id} className="criteria-score-item">
                              <span className="criteria-name">{criterion.name}:</span>
                              <span
                                className="criteria-score"
                                style={{ color: getRatingColor(employeeRating.ratings[criterion.id] || 0) }}
                              >
                                {(employeeRating.ratings[criterion.id] || 0).toFixed(1)}/20
                              </span>
                            </div>
                          ))}
                        </div>
                        {employeeRating.comments && (
                          <div className="monthly-comments">
                            <strong>Commentaires:</strong> {employeeRating.comments}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="employee-quick-actions">
                      <button
                        className="view-details-button"
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        👁️ Voir détails
                      </button>
                      {employeeRating && (
                        <>
                          <button
                            className="edit-button small"
                            onClick={() => handleEditRating(employeeRating)}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            className="delete-button small"
                            onClick={() => handleDeleteRating(employeeRating.id)}
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default EmployeeRatings;