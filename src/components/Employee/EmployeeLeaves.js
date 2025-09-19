import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createDocument,
  queryDocuments
} from '../../firebase/services';
import './Employee.css';

const EmployeeLeaves = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [employee, setEmployee] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    startPeriod: 'morning', // 'morning' ou 'afternoon'
    endPeriod: 'afternoon',   // 'morning' ou 'afternoon'
    type: 'vacation',
    reason: '',
    days: 0
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const leaveTypes = [
    { value: 'vacation', label: 'Congés payés' },
    { value: 'sick', label: 'Arrêt maladie' },
    { value: 'personal', label: 'Congé personnel' },
    { value: 'maternity', label: 'Congé maternité' },
    { value: 'paternity', label: 'Congé paternité' },
    { value: 'unpaid', label: 'Congé sans solde' }
  ];

  useEffect(() => {
    loadEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployeeData = async () => {
    try {

      // Load employee
      const employees = await queryDocuments('employees', [
        { field: 'email', operator: '==', value: userEmail }
      ]);
      if (employees.length === 0) {
        setError('Employé non trouvé');
        setInitialLoading(false);
        return;
      }

      const employeeData = employees[0];
      setEmployee(employeeData);

      // Load leaves for this employee
      const employeeLeaves = await queryDocuments('leaves', [
        { field: 'employeeId', operator: '==', value: employeeData.id }
      ]);
      setLeaves(employeeLeaves.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)));

      // Load leave balance for current year
      const currentYear = new Date().getFullYear();
      const balances = await queryDocuments('leaveBalances', [
        { field: 'employeeId', operator: '==', value: employeeData.id }
      ]);
      const currentBalance = balances.find(b => b.year === currentYear);
      setLeaveBalance(currentBalance);

    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setInitialLoading(false);
    }
  };

  const calculateDays = (startDate, endDate, startPeriod, endPeriod) => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Si même jour
    if (start.toDateString() === end.toDateString()) {
      if (startPeriod === 'morning' && endPeriod === 'afternoon') {
        return 1; // Journée complète
      } else {
        return 0.5; // Demi-journée (matin OU après-midi)
      }
    }

    // Calcul pour plusieurs jours
    const timeDiff = end.getTime() - start.getTime();
    const daysDifference = Math.floor(timeDiff / (1000 * 3600 * 24));

    let totalDays = 0;

    // Premier jour
    if (startPeriod === 'morning') {
      totalDays += 1; // Journée complète du premier jour
    } else {
      totalDays += 0.5; // Seulement l'après-midi du premier jour
    }

    // Jours intermédiaires (journées complètes)
    if (daysDifference > 1) {
      totalDays += (daysDifference - 1);
    }

    // Dernier jour
    if (endPeriod === 'afternoon') {
      totalDays += 1; // Journée complète du dernier jour
    } else {
      totalDays += 0.5; // Seulement le matin du dernier jour
    }

    return totalDays;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'startDate' || name === 'endDate' || name === 'startPeriod' || name === 'endPeriod') {
        updated.days = calculateDays(updated.startDate, updated.endDate, updated.startPeriod, updated.endPeriod);
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.days <= 0) {
      setError('Veuillez sélectionner des dates valides');
      return;
    }

    // Check if enough leave days available for vacation type
    if (formData.type === 'vacation' && leaveBalance) {
      if (formData.days > leaveBalance.remainingDays) {
        setError(`Vous n'avez que ${leaveBalance.remainingDays} jours de congés disponibles`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const leaveData = {
        employeeId: employee.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startPeriod: formData.startPeriod,
        endPeriod: formData.endPeriod,
        type: formData.type,
        reason: formData.reason,
        days: formData.days,
        status: 'pending',
        requestDate: new Date().toISOString()
      };

      await createDocument('leaves', leaveData);
      await loadEmployeeData();
      resetForm();
      setSuccess('Demande de congé soumise avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erreur lors de la soumission de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      startDate: '',
      endDate: '',
      startPeriod: 'morning',
      endPeriod: 'afternoon',
      type: 'vacation',
      reason: '',
      days: 0
    });
    setShowForm(false);
  };

  const getLeaveTypeLabel = (type) => {
    const leaveType = leaveTypes.find(lt => lt.value === type);
    return leaveType ? leaveType.label : type;
  };

  const getPeriodLabel = (period) => {
    return period === 'morning' ? 'Matin' : 'Après-midi';
  };

  const formatLeavePeriod = (startDate, endDate, startPeriod, endPeriod) => {
    const start = new Date(startDate).toLocaleDateString('fr-FR');
    const end = new Date(endDate).toLocaleDateString('fr-FR');

    if (startDate === endDate) {
      if (startPeriod === 'morning' && endPeriod === 'afternoon') {
        return `${start} (journée complète)`;
      } else {
        return `${start} (${getPeriodLabel(startPeriod === endPeriod ? startPeriod : 'morning')})`;
      }
    } else {
      return `${start} (${getPeriodLabel(startPeriod)}) - ${end} (${getPeriodLabel(endPeriod)})`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--accent-green)';
      case 'rejected': return '#c62828';
      case 'pending': return '#ff9800';
      default: return 'var(--primary-gray)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'pending': return 'En attente';
      default: return 'Inconnu';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  if (initialLoading) {
    return (
      <div className="employee-container">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (!employee && !initialLoading) {
    return (
      <div className="employee-container">
        <div className="error-message">Employé non trouvé. Veuillez vous reconnecter.</div>
        <button onClick={() => navigate('/login')} className="back-button">
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="employee-container">
      <header className="employee-header">
        <button
          className="back-button"
          onClick={() => navigate('/employee/dashboard')}
        >
          ← Retour
        </button>
        <h1>Mes Congés</h1>
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Nouvelle Demande
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Leave Balance Summary */}
      <div className="leave-summary">
        <div className="summary-card">
          <h3>Solde Congés {new Date().getFullYear()}</h3>
          {leaveBalance ? (
            <div className="balance-details">
              <div className="balance-row">
                <span>Total alloué:</span>
                <span className="balance-total">{leaveBalance.totalDays} jours</span>
              </div>
              <div className="balance-row">
                <span>Utilisé:</span>
                <span className="balance-used">{leaveBalance.usedDays} jours</span>
              </div>
              <div className="balance-row">
                <span>Restant:</span>
                <span className="balance-remaining">{leaveBalance.remainingDays} jours</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(leaveBalance.usedDays / leaveBalance.totalDays) * 100}%`
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="no-balance">Aucun solde configuré pour cette année</p>
          )}
        </div>

        <div className="summary-card">
          <h3>Mes Demandes</h3>
          <div className="leave-stats">
            <div className="stat-item">
              <span className="stat-number pending">{leaves.filter(l => l.status === 'pending').length}</span>
              <span className="stat-label">En attente</span>
            </div>
            <div className="stat-item">
              <span className="stat-number approved">{leaves.filter(l => l.status === 'approved').length}</span>
              <span className="stat-label">Approuvées</span>
            </div>
            <div className="stat-item">
              <span className="stat-number rejected">{leaves.filter(l => l.status === 'rejected').length}</span>
              <span className="stat-label">Rejetées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Request Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Nouvelle Demande de Congé</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Date de Début *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startPeriod">Période de Début *</label>
                  <select
                    id="startPeriod"
                    name="startPeriod"
                    value={formData.startPeriod}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="morning">Matin</option>
                    <option value="afternoon">Après-midi</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="endDate">Date de Fin *</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endPeriod">Période de Fin *</label>
                  <select
                    id="endPeriod"
                    name="endPeriod"
                    value={formData.endPeriod}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="morning">Matin</option>
                    <option value="afternoon">Après-midi</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Type de Congé *</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="days">Nombre de Jours</label>
                  <input
                    type="number"
                    id="days"
                    name="days"
                    value={formData.days}
                    readOnly
                    className="readonly"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Motif</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Motif de votre demande de congé (optionnel)"
                />
              </div>

              {formData.type === 'vacation' && leaveBalance && (
                <div className="leave-info">
                  <p>
                    <strong>Jours disponibles:</strong> {leaveBalance.remainingDays} jours
                  </p>
                  {formData.days > leaveBalance.remainingDays && (
                    <p className="warning">
                      ⚠️ Vous demandez plus de jours que disponible
                    </p>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="save-button">
                  {submitting ? 'Soumission...' : 'Soumettre la Demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Requests List */}
      <main className="employee-main">
        <div className="leaves-container">
          <h2>Historique des Demandes</h2>

          {initialLoading ? (
            <div className="loading">Chargement des demandes...</div>
          ) : leaves.length > 0 ? (
            <div className="leaves-list">
              {leaves.map(leave => (
                <div key={leave.id} className="leave-card">
                  <div className="leave-header">
                    <div className="leave-type">
                      <h3>{getLeaveTypeLabel(leave.type)}</h3>
                      <span className="leave-duration">{leave.days} jour{leave.days > 1 ? 's' : ''}</span>
                    </div>
                    <div className="leave-status">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(leave.status) }}
                      >
                        {getStatusIcon(leave.status)} {getStatusText(leave.status)}
                      </span>
                    </div>
                  </div>

                  <div className="leave-details">
                    <div className="detail-row">
                      <span className="detail-label">Période:</span>
                      <span className="detail-value">
                        {formatLeavePeriod(leave.startDate, leave.endDate, leave.startPeriod || 'morning', leave.endPeriod || 'afternoon')}
                      </span>
                    </div>

                    {leave.reason && (
                      <div className="detail-row">
                        <span className="detail-label">Motif:</span>
                        <span className="detail-value">{leave.reason}</span>
                      </div>
                    )}

                    <div className="detail-row">
                      <span className="detail-label">Demandé le:</span>
                      <span className="detail-value">
                        {new Date(leave.requestDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {leave.reviewDate && (
                      <div className="detail-row">
                        <span className="detail-label">Traité le:</span>
                        <span className="detail-value">
                          {new Date(leave.reviewDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Aucune demande de congé</h3>
              <p>Vous n'avez pas encore fait de demande de congé</p>
              <button
                className="add-button"
                onClick={() => setShowForm(true)}
              >
                + Faire une demande
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeLeaves;