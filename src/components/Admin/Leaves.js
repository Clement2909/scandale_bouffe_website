import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument
} from '../../firebase/services';
import './Admin.css';

const Leaves = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');
  const [balanceFormData, setBalanceFormData] = useState({
    employeeId: '',
    year: new Date().getFullYear(),
    totalDays: 25,
    usedDays: 0,
    remainingDays: 25
  });
  const [leaveFormData, setLeaveFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    startPeriod: 'morning',
    endPeriod: 'afternoon',
    type: 'vacation',
    reason: '',
    status: 'pending',
    days: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const leaveTypes = [
    { value: 'vacation', label: 'Congés payés' },
    { value: 'sick', label: 'Arrêt maladie' },
    { value: 'personal', label: 'Congé personnel' },
    { value: 'maternity', label: 'Congé maternité' },
    { value: 'paternity', label: 'Congé paternité' },
    { value: 'unpaid', label: 'Congé sans solde' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, leavesData, balancesData] = await Promise.all([
        getAllDocuments('employees'),
        getAllDocuments('leaves'),
        getAllDocuments('leaveBalances')
      ]);
      setEmployees(employeesData);
      setLeaves(leavesData);
      setLeaveBalances(balancesData);
    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
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

  const handleBalanceInputChange = (e) => {
    const { name, value } = e.target;
    setBalanceFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'totalDays' || name === 'usedDays') {
        const total = parseFloat(updated.totalDays) || 0;
        const used = parseFloat(updated.usedDays) || 0;
        updated.remainingDays = Math.max(0, total - used);
      }

      return updated;
    });
  };

  const handleLeaveInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'startDate' || name === 'endDate' || name === 'startPeriod' || name === 'endPeriod') {
        updated.days = calculateDays(updated.startDate, updated.endDate, updated.startPeriod, updated.endPeriod);
      }

      return updated;
    });
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const balanceData = {
        ...balanceFormData,
        totalDays: parseFloat(balanceFormData.totalDays) || 0,
        usedDays: parseFloat(balanceFormData.usedDays) || 0,
        remainingDays: parseFloat(balanceFormData.remainingDays) || 0,
        year: parseInt(balanceFormData.year)
      };

      if (editingBalance) {
        await updateDocument('leaveBalances', editingBalance.id, balanceData);
      } else {
        await createDocument('leaveBalances', balanceData);
      }

      await loadData();
      resetBalanceForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const leaveData = {
        ...leaveFormData,
        days: calculateDays(leaveFormData.startDate, leaveFormData.endDate, leaveFormData.startPeriod, leaveFormData.endPeriod),
        requestDate: new Date().toISOString()
      };

      if (editingLeave) {
        await updateDocument('leaves', editingLeave.id, leaveData);
      } else {
        await createDocument('leaves', leaveData);
      }

      await loadData();
      resetLeaveForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveStatusChange = async (leaveId, newStatus) => {
    try {
      setLoading(true);
      const leave = leaves.find(l => l.id === leaveId);

      await updateDocument('leaves', leaveId, {
        status: newStatus,
        reviewDate: new Date().toISOString()
      });

      // Si approuvé et type vacation, mettre à jour le solde
      if (newStatus === 'approved' && leave.type === 'vacation') {
        const balance = leaveBalances.find(b =>
          b.employeeId === leave.employeeId &&
          b.year === new Date(leave.startDate).getFullYear()
        );

        if (balance) {
          const newUsedDays = balance.usedDays + leave.days;
          const newRemainingDays = balance.totalDays - newUsedDays;

          await updateDocument('leaveBalances', balance.id, {
            usedDays: newUsedDays,
            remainingDays: Math.max(0, newRemainingDays)
          });
        }
      }

      await loadData();
    } catch (error) {
      setError('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBalance = (balance) => {
    setEditingBalance(balance);
    setBalanceFormData({
      employeeId: balance.employeeId,
      year: balance.year,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      remainingDays: balance.remainingDays
    });
    setShowBalanceForm(true);
  };

  const handleDeleteBalance = async (balanceId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce solde de congés ?')) {
      try {
        setLoading(true);
        await deleteDocument('leaveBalances', balanceId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      try {
        setLoading(true);
        await deleteDocument('leaves', leaveId);
        await loadData();
      } catch (error) {
        setError('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetBalanceForm = () => {
    setBalanceFormData({
      employeeId: '',
      year: new Date().getFullYear(),
      totalDays: 25,
      usedDays: 0,
      remainingDays: 25
    });
    setEditingBalance(null);
    setShowBalanceForm(false);
  };

  const resetLeaveForm = () => {
    setLeaveFormData({
      employeeId: '',
      startDate: '',
      endDate: '',
      startPeriod: 'morning',
      endPeriod: 'afternoon',
      type: 'vacation',
      reason: '',
      status: 'pending',
      days: 0
    });
    setEditingLeave(null);
    setShowLeaveForm(false);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.fullName || `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';
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

  const filterLeavesByStatus = (status) => {
    return leaves.filter(leave => leave.status === status);
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
        <h1>Gestion des Congés</h1>
        <div className="header-actions">
          <button
            className="add-button"
            onClick={() => setShowBalanceForm(true)}
          >
            + Solde Congés
          </button>
          <button
            className="add-button"
            onClick={() => setShowLeaveForm(true)}
          >
            + Demande Congé
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Demandes de Congés ({leaves.length})
        </button>
        <button
          className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Soldes Congés ({leaveBalances.length})
        </button>
      </div>

      {/* Balance Form Modal */}
      {showBalanceForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingBalance ? 'Modifier' : 'Ajouter'} un Solde de Congés</h2>
              <button className="close-button" onClick={resetBalanceForm}>×</button>
            </div>

            <form onSubmit={handleBalanceSubmit} className="form">
              <div className="form-group">
                <label htmlFor="employeeId">Employé *</label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={balanceFormData.employeeId}
                  onChange={handleBalanceInputChange}
                  required
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="year">Année *</label>
                  <input
                    type="number"
                    id="year"
                    name="year"
                    value={balanceFormData.year}
                    onChange={handleBalanceInputChange}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="totalDays">Total Jours *</label>
                  <input
                    type="number"
                    id="totalDays"
                    name="totalDays"
                    value={balanceFormData.totalDays}
                    onChange={handleBalanceInputChange}
                    min="0"
                    step="0.5"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="usedDays">Jours Utilisés</label>
                  <input
                    type="number"
                    id="usedDays"
                    name="usedDays"
                    value={balanceFormData.usedDays}
                    onChange={handleBalanceInputChange}
                    min="0"
                    step="0.5"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="remainingDays">Jours Restants</label>
                  <input
                    type="number"
                    id="remainingDays"
                    name="remainingDays"
                    value={balanceFormData.remainingDays}
                    readOnly
                    className="readonly"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetBalanceForm} className="cancel-button">
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

      {/* Leave Form Modal */}
      {showLeaveForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingLeave ? 'Modifier' : 'Ajouter'} une Demande de Congé</h2>
              <button className="close-button" onClick={resetLeaveForm}>×</button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="form">
              <div className="form-group">
                <label htmlFor="employeeId">Employé *</label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={leaveFormData.employeeId}
                  onChange={handleLeaveInputChange}
                  required
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Date de Début *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={leaveFormData.startDate}
                    onChange={handleLeaveInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startPeriod">Période de Début *</label>
                  <select
                    id="startPeriod"
                    name="startPeriod"
                    value={leaveFormData.startPeriod}
                    onChange={handleLeaveInputChange}
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
                    value={leaveFormData.endDate}
                    onChange={handleLeaveInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endPeriod">Période de Fin *</label>
                  <select
                    id="endPeriod"
                    name="endPeriod"
                    value={leaveFormData.endPeriod}
                    onChange={handleLeaveInputChange}
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
                    value={leaveFormData.type}
                    onChange={handleLeaveInputChange}
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
                    value={leaveFormData.days}
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
                  value={leaveFormData.reason}
                  onChange={handleLeaveInputChange}
                  rows="3"
                  placeholder="Motif de la demande de congé"
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  name="status"
                  value={leaveFormData.status}
                  onChange={handleLeaveInputChange}
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetLeaveForm} className="cancel-button">
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
        {activeTab === 'requests' && (
          <div className="leaves-section">
            <div className="leave-stats">
              <div className="stat-card">
                <h3>En Attente</h3>
                <div className="stat-number">{filterLeavesByStatus('pending').length}</div>
              </div>
              <div className="stat-card">
                <h3>Approuvées</h3>
                <div className="stat-number">{filterLeavesByStatus('approved').length}</div>
              </div>
              <div className="stat-card">
                <h3>Rejetées</h3>
                <div className="stat-number">{filterLeavesByStatus('rejected').length}</div>
              </div>
            </div>

            {loading && leaves.length === 0 ? (
              <div className="loading">Chargement des demandes...</div>
            ) : (
              <div className="cards-grid">
                {leaves.map(leave => (
                  <div key={leave.id} className="card">
                    <div className="card-header">
                      <h3>{getEmployeeName(leave.employeeId)}</h3>
                      <div
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(leave.status) }}
                      >
                        {getStatusText(leave.status)}
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="detail-row">
                        <span>Type:</span>
                        <span>{getLeaveTypeLabel(leave.type)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Période:</span>
                        <span>
                          {formatLeavePeriod(leave.startDate, leave.endDate, leave.startPeriod || 'morning', leave.endPeriod || 'afternoon')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Durée:</span>
                        <span>{leave.days} jour{leave.days > 1 ? 's' : ''}</span>
                      </div>
                      {leave.reason && (
                        <div className="detail-row">
                          <span>Motif:</span>
                          <span>{leave.reason}</span>
                        </div>
                      )}
                      {leave.requestDate && (
                        <div className="detail-row">
                          <span>Demandé le:</span>
                          <span>{new Date(leave.requestDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      {leave.status === 'pending' && (
                        <>
                          <button
                            className="approve-button"
                            onClick={() => handleLeaveStatusChange(leave.id, 'approved')}
                          >
                            ✓ Approuver
                          </button>
                          <button
                            className="reject-button"
                            onClick={() => handleLeaveStatusChange(leave.id, 'rejected')}
                          >
                            ✗ Rejeter
                          </button>
                        </>
                      )}
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteLeave(leave.id)}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))}

                {leaves.length === 0 && !loading && (
                  <div className="empty-state">
                    <h3>Aucune demande de congé</h3>
                    <p>Les demandes de congés apparaîtront ici</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="balances-section">
            {loading && leaveBalances.length === 0 ? (
              <div className="loading">Chargement des soldes...</div>
            ) : (
              <div className="cards-grid">
                {leaveBalances.map(balance => (
                  <div key={balance.id} className="card">
                    <div className="card-header">
                      <h3>{getEmployeeName(balance.employeeId)}</h3>
                      <div className="year-badge">
                        {balance.year}
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="balance-summary">
                        <div className="balance-item">
                          <span className="balance-label">Total:</span>
                          <span className="balance-value">{balance.totalDays} jours</span>
                        </div>
                        <div className="balance-item">
                          <span className="balance-label">Utilisés:</span>
                          <span className="balance-value used">{balance.usedDays} jours</span>
                        </div>
                        <div className="balance-item">
                          <span className="balance-label">Restants:</span>
                          <span className="balance-value remaining">{balance.remainingDays} jours</span>
                        </div>
                      </div>

                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(balance.usedDays / balance.totalDays) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEditBalance(balance)}
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteBalance(balance.id)}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))}

                {leaveBalances.length === 0 && !loading && (
                  <div className="empty-state">
                    <h3>Aucun solde de congés</h3>
                    <p>Commencez par ajouter des soldes de congés pour vos employés</p>
                    <button
                      className="add-button"
                      onClick={() => setShowBalanceForm(true)}
                    >
                      + Ajouter un solde
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaves;