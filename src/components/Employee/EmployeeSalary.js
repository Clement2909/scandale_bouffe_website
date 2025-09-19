import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createDocument,
  queryDocuments
} from '../../firebase/services';
import './Employee.css';

const EmployeeSalary = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [employee, setEmployee] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceFormData, setAdvanceFormData] = useState({
    amount: '',
    reason: '',
    requestedDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('salaries');

  useEffect(() => {
    loadEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      // Load employee
      const employees = await queryDocuments('employees', [
        { field: 'email', operator: '==', value: userEmail }
      ]);
      if (employees.length === 0) {
        setError('Employé non trouvé');
        setLoading(false);
        return;
      }

      const employeeData = employees[0];
      setEmployee(employeeData);

      // Load salaries for this employee
      const employeeSalaries = await queryDocuments('salaries', [
        { field: 'employeeId', operator: '==', value: employeeData.id }
      ]);
      setSalaries(employeeSalaries.sort((a, b) => new Date(b.month) - new Date(a.month)));

      // Load advance requests for this employee
      const employeeAdvances = await queryDocuments('advances', [
        { field: 'employeeId', operator: '==', value: employeeData.id }
      ]);
      setAdvances(employeeAdvances.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)));

    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceInputChange = (e) => {
    setAdvanceFormData({
      ...advanceFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!advanceFormData.amount || parseFloat(advanceFormData.amount) <= 0) {
      setError('Veuillez entrer un montant valide');
      setLoading(false);
      return;
    }

    if (!advanceFormData.reason.trim()) {
      setError('Veuillez indiquer le motif de votre demande');
      setLoading(false);
      return;
    }

    try {
      const advanceData = {
        employeeId: employee.id,
        employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
        amount: parseFloat(advanceFormData.amount),
        reason: advanceFormData.reason,
        requestedDate: advanceFormData.requestedDate,
        requestDate: new Date().toISOString(),
        status: 'pending'
      };

      await createDocument('advances', advanceData);
      await loadEmployeeData();
      resetAdvanceForm();
      setSuccess('Demande d\'avance soumise avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erreur lors de la soumission de la demande');
    } finally {
      setLoading(false);
    }
  };

  const resetAdvanceForm = () => {
    setAdvanceFormData({
      amount: '',
      reason: '',
      requestedDate: new Date().toISOString().split('T')[0]
    });
    setShowAdvanceForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' Ar';
  };

  const formatMonth = (monthStr) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--accent-green)';
      case 'rejected': return '#c62828';
      case 'pending': return '#ff9800';
      case 'paid': return 'var(--primary-brown)';
      default: return 'var(--primary-gray)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'pending': return 'En attente';
      case 'paid': return 'Payé';
      default: return 'Inconnu';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'paid': return '💰';
      default: return '❓';
    }
  };

  const calculateTotalAdvances = () => {
    return advances
      .filter(advance => advance.status === 'approved')
      .reduce((total, advance) => total + advance.amount, 0);
  };


  const getCurrentMonthSalary = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return salaries.find(salary => salary.month === currentMonth);
  };

  if (!employee) {
    return (
      <div className="employee-container">
        <div className="loading">Chargement...</div>
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
        <h1>Mon Salaire</h1>
        <button
          className="add-button"
          onClick={() => setShowAdvanceForm(true)}
        >
          + Demande d'Avance
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Salary Summary */}
      <div className="salary-summary">
        <div className="summary-card">
          <h3>Salaire de Base</h3>
          <div className="salary-amount">
            {employee.salary ? formatCurrency(employee.salary) : 'Non défini'}
          </div>
          <p className="salary-period">Par mois</p>
        </div>

        <div className="summary-card">
          <h3>Ce Mois-ci</h3>
          {getCurrentMonthSalary() ? (
            <div className="current-salary">
              <div className="salary-amount">
                {formatCurrency(getCurrentMonthSalary().netSalary)}
              </div>
              <p className="salary-status" style={{
                color: getStatusColor(getCurrentMonthSalary().paymentStatus)
              }}>
                {getStatusIcon(getCurrentMonthSalary().paymentStatus)} {getStatusText(getCurrentMonthSalary().paymentStatus)}
              </p>
            </div>
          ) : (
            <div className="no-salary">
              <p>Pas encore configuré</p>
            </div>
          )}
        </div>

        <div className="summary-card">
          <h3>Avances en Cours</h3>
          <div className="advances-summary">
            <div className="salary-amount">
              {formatCurrency(calculateTotalAdvances())}
            </div>
            <p className="advances-count">
              {advances.filter(a => a.status === 'pending').length} demande(s) en attente
            </p>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'salaries' ? 'active' : ''}`}
          onClick={() => setActiveTab('salaries')}
        >
          Historique Salaires ({salaries.length})
        </button>
        <button
          className={`tab ${activeTab === 'advances' ? 'active' : ''}`}
          onClick={() => setActiveTab('advances')}
        >
          Demandes d'Avance ({advances.length})
        </button>
      </div>

      {/* Advance Request Form Modal */}
      {showAdvanceForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Demande d'Avance sur Salaire</h2>
              <button className="close-button" onClick={resetAdvanceForm}>×</button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="form">
              <div className="form-group">
                <label htmlFor="amount">Montant demandé (Ar) *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={advanceFormData.amount}
                  onChange={handleAdvanceInputChange}
                  required
                  min="1"
                  step="1"
                  placeholder="0"
                />
                {employee.salary && (
                  <small className="form-help">
                    Salaire mensuel : {formatCurrency(employee.salary)}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="requestedDate">Date souhaitée *</label>
                <input
                  type="date"
                  id="requestedDate"
                  name="requestedDate"
                  value={advanceFormData.requestedDate}
                  onChange={handleAdvanceInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reason">Motif de la demande *</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={advanceFormData.reason}
                  onChange={handleAdvanceInputChange}
                  required
                  rows="4"
                  placeholder="Expliquez la raison de votre demande d'avance..."
                />
              </div>

              <div className="advance-info">
                <h4>Information importante :</h4>
                <p>L'avance sera déduite de votre prochain salaire après approbation.</p>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetAdvanceForm} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Soumission...' : 'Soumettre la Demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="employee-main">
        <div className="salary-container">
          {activeTab === 'salaries' && (
            <div className="salaries-section">
              <h2>Historique des Salaires</h2>

              {loading && salaries.length === 0 ? (
                <div className="loading">Chargement des salaires...</div>
              ) : salaries.length > 0 ? (
                <div className="salaries-list">
                  {salaries.map(salary => (
                    <div key={salary.id} className="salary-card">
                      <div className="salary-header">
                        <div className="salary-month">
                          <h3>{formatMonth(salary.month)}</h3>
                          <span className="salary-net">{formatCurrency(salary.netSalary)}</span>
                        </div>
                        <div className="salary-status">
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(salary.paymentStatus) }}
                          >
                            {getStatusIcon(salary.paymentStatus)} {getStatusText(salary.paymentStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="salary-breakdown">
                        <div className="breakdown-row">
                          <span className="breakdown-label">Salaire de base (employé):</span>
                          <span className="breakdown-value">{formatCurrency(employee.salary)}</span>
                        </div>

                        <div className="breakdown-row">
                          <span className="breakdown-label">Salaire configuré ce mois:</span>
                          <span className="breakdown-value">{formatCurrency(salary.baseSalary)}</span>
                        </div>

                        {salary.bonuses > 0 && (
                          <div className="breakdown-row bonus">
                            <span className="breakdown-label">Primes:</span>
                            <span className="breakdown-value">+{formatCurrency(salary.bonuses)}</span>
                          </div>
                        )}

                        {salary.overtime > 0 && (
                          <div className="breakdown-row bonus">
                            <span className="breakdown-label">Heures sup. ({salary.overtime}h à {formatCurrency(salary.overtimeRate)}/h):</span>
                            <span className="breakdown-value">+{formatCurrency(salary.overtime * salary.overtimeRate)}</span>
                          </div>
                        )}

                        {salary.deductions > 0 && (
                          <div className="breakdown-row deduction">
                            <span className="breakdown-label">Déductions:</span>
                            <span className="breakdown-value">-{formatCurrency(salary.deductions)}</span>
                          </div>
                        )}

                        {(() => {
                          // Calculer le salaire du mois
                          const monthlySalary = salary.baseSalary + (salary.bonuses || 0) +
                            ((salary.overtime || 0) * (salary.overtimeRate || 0)) - (salary.deductions || 0);

                          // Calculer les avances approuvées pour ce mois
                          const salaryMonth = salary.month;
                          const monthlyApprovedAdvances = advances
                            .filter(advance =>
                              advance.status === 'approved' &&
                              advance.requestedDate?.substring(0, 7) === salaryMonth
                            )
                            .reduce((total, advance) => total + advance.amount, 0);

                          // Calculer le salaire restant
                          const remainingSalary = monthlySalary - monthlyApprovedAdvances;

                          return (
                            <>
                              <div className="breakdown-row subtotal">
                                <span className="breakdown-label">Salaire du mois:</span>
                                <span className="breakdown-value">{formatCurrency(monthlySalary)}</span>
                              </div>
                              {monthlyApprovedAdvances > 0 && (
                                <div className="breakdown-row deduction">
                                  <span className="breakdown-label">Avances approuvées du mois:</span>
                                  <span className="breakdown-value">-{formatCurrency(monthlyApprovedAdvances)}</span>
                                </div>
                              )}
                              <div className="breakdown-row total">
                                <span className="breakdown-label">Salaire restant à payer:</span>
                                <span className="breakdown-value">{formatCurrency(remainingSalary)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {salary.notes && (
                        <div className="salary-notes">
                          <strong>Notes:</strong> {salary.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Aucun salaire enregistré</h3>
                  <p>Vos fiches de paie apparaîtront ici une fois configurées par l'administration</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advances' && (
            <div className="advances-section">
              <h2>Demandes d'Avance</h2>

              {loading && advances.length === 0 ? (
                <div className="loading">Chargement des demandes...</div>
              ) : advances.length > 0 ? (
                <div className="advances-list">
                  {advances.map(advance => (
                    <div key={advance.id} className="advance-card">
                      <div className="advance-header">
                        <div className="advance-amount">
                          <h3>{formatCurrency(advance.amount)}</h3>
                          <span className="advance-date">
                            Demandé le {new Date(advance.requestDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="advance-status">
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(advance.status) }}
                          >
                            {getStatusIcon(advance.status)} {getStatusText(advance.status)}
                          </span>
                        </div>
                      </div>

                      <div className="advance-details">
                        <div className="detail-row">
                          <span className="detail-label">Date souhaitée:</span>
                          <span className="detail-value">
                            {new Date(advance.requestedDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">Motif:</span>
                          <span className="detail-value">{advance.reason}</span>
                        </div>

                        {advance.reviewDate && (
                          <div className="detail-row">
                            <span className="detail-label">Traité le:</span>
                            <span className="detail-value">
                              {new Date(advance.reviewDate).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}

                        {advance.adminNotes && (
                          <div className="admin-notes">
                            <strong>Notes de l'administration:</strong> {advance.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Aucune demande d'avance</h3>
                  <p>Vous n'avez pas encore fait de demande d'avance sur salaire</p>
                  <button
                    className="add-button"
                    onClick={() => setShowAdvanceForm(true)}
                  >
                    + Faire une demande
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeSalary;