import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  queryDocuments
} from '../../firebase/services';
import './Admin.css';

const Salaries = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [activeTab, setActiveTab] = useState('salaries');
  const [salaryFormData, setSalaryFormData] = useState({
    employeeId: '',
    month: new Date().toISOString().substring(0, 7),
    baseSalary: '',
    bonuses: 0,
    deductions: 0,
    overtime: 0,
    overtimeRate: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedEmployee]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, advancesData] = await Promise.all([
        getAllDocuments('employees'),
        getAllDocuments('advances')
      ]);

      setEmployees(employeesData.filter(emp => emp.status === 'active'));

      // Load salaries for selected month
      const conditions = [
        { field: 'month', operator: '==', value: selectedMonth }
      ];

      if (selectedEmployee) {
        conditions.push({ field: 'employeeId', operator: '==', value: selectedEmployee });
      }

      const salariesData = await queryDocuments('salaries', conditions);
      setSalaries(salariesData);

      // Filter advances by month and employee
      const filteredAdvances = advancesData.filter(advance => {
        const advanceMonth = advance.requestedDate?.substring(0, 7) || advance.requestDate?.substring(0, 7);
        const monthMatch = advanceMonth === selectedMonth;
        const employeeMatch = selectedEmployee ? advance.employeeId === selectedEmployee : true;
        return monthMatch && employeeMatch;
      });
      setAdvances(filteredAdvances);

    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryInputChange = (e) => {
    const { name, value, type } = e.target;

    // Si l'employé change, récupérer son salaire de base
    if (name === 'employeeId' && value) {
      const selectedEmployee = employees.find(emp => emp.id === value);
      setSalaryFormData({
        ...salaryFormData,
        [name]: value,
        baseSalary: selectedEmployee?.salary || 0
      });
    } else {
      setSalaryFormData({
        ...salaryFormData,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      });
    }
  };

  const calculateNetSalary = (salaryData) => {
    const base = parseFloat(salaryData.baseSalary) || 0;
    const bonuses = parseFloat(salaryData.bonuses) || 0;
    const deductions = parseFloat(salaryData.deductions) || 0;
    const overtimePay = (parseFloat(salaryData.overtime) || 0) * (parseFloat(salaryData.overtimeRate) || 0);

    return base + bonuses + overtimePay - deductions;
  };

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const netSalary = calculateNetSalary(salaryFormData);
      const salaryData = {
        ...salaryFormData,
        baseSalary: parseFloat(salaryFormData.baseSalary) || 0,
        bonuses: parseFloat(salaryFormData.bonuses) || 0,
        deductions: parseFloat(salaryFormData.deductions) || 0,
        overtime: parseFloat(salaryFormData.overtime) || 0,
        overtimeRate: parseFloat(salaryFormData.overtimeRate) || 0,
        netSalary,
        paymentStatus: 'pending'
      };

      // Check if salary already exists
      const existingSalary = salaries.find(
        salary => salary.employeeId === salaryFormData.employeeId && salary.month === salaryFormData.month
      );

      if (existingSalary) {
        await updateDocument('salaries', existingSalary.id, salaryData);
      } else {
        await createDocument('salaries', salaryData);
      }

      await loadData();
      resetSalaryForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde du salaire');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatusUpdate = async (advanceId, newStatus) => {
    try {
      setLoading(true);

      // Trouver l'avance concernée
      const advance = advances.find(a => a.id === advanceId);
      if (!advance) {
        setError('Avance non trouvée');
        return;
      }

      // Mettre à jour le statut de l'avance
      await updateDocument('advances', advanceId, {
        status: newStatus,
        processedDate: new Date().toISOString(),
        processedBy: 'admin'
      });

      // Si l'avance est approuvée, mettre à jour le salaire correspondant
      if (newStatus === 'approved') {
        const advanceMonth = advance.requestedDate?.substring(0, 7);
        console.log('Approbation avance - mois:', advanceMonth, 'employeeId:', advance.employeeId, 'montant:', advance.amount);

        // Trouver le salaire correspondant pour ce mois et cet employé
        let existingSalary = salaries.find(
          salary => salary.employeeId === advance.employeeId && salary.month === advanceMonth
        );

        console.log('Salaire existant trouvé:', existingSalary);

        // Si pas de salaire spécifique configuré, créer un basé sur le salaire de base de l'employé
        if (!existingSalary) {
          const employee = employees.find(emp => emp.id === advance.employeeId);
          console.log('Employé trouvé:', employee);
          if (employee && employee.salary) {
            const salaryData = {
              employeeId: advance.employeeId,
              month: advanceMonth,
              baseSalary: employee.salary,
              bonuses: 0,
              deductions: 0,
              overtime: 0,
              overtimeRate: 0,
              netSalary: employee.salary - advance.amount,
              paymentStatus: 'pending',
              notes: `Salaire automatique avec avance de ${advance.amount} Ar déduite`
            };

            console.log('Création nouveau salaire:', salaryData);
            await createDocument('salaries', salaryData);
            console.log('Nouveau salaire créé avec avance déduite');
          }
        } else {
          // Recalculer le salaire net en déduisant l'avance
          const oldNetSalary = existingSalary.netSalary;
          const newNetSalary = existingSalary.netSalary - advance.amount;

          console.log('Mise à jour salaire existant - ancien:', oldNetSalary, 'nouveau:', newNetSalary);

          await updateDocument('salaries', existingSalary.id, {
            netSalary: newNetSalary,
            lastUpdated: new Date().toISOString()
          });

          console.log('Salaire mis à jour');
        }
      }

      // Si l'avance est rejetée après avoir été approuvée, restaurer le salaire
      if (newStatus === 'rejected') {
        const advanceMonth = advance.requestedDate?.substring(0, 7);

        const existingSalary = salaries.find(
          salary => salary.employeeId === advance.employeeId && salary.month === advanceMonth
        );

        if (existingSalary && advance.status === 'approved') {
          // Restaurer le salaire en retirant la déduction
          const originalNetSalary = existingSalary.netSalary + advance.amount;

          await updateDocument('salaries', existingSalary.id, {
            netSalary: originalNetSalary,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      await loadData();
    } catch (error) {
      setError('Erreur lors de la mise à jour de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusUpdate = async (salaryId, newStatus) => {
    try {
      setLoading(true);
      await updateDocument('salaries', salaryId, {
        paymentStatus: newStatus,
        paymentDate: newStatus === 'paid' ? new Date().toISOString() : null
      });
      await loadData();
    } catch (error) {
      setError('Erreur lors de la mise à jour du statut de paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetSalaryForm = () => {
    setSalaryFormData({
      employeeId: '',
      month: new Date().toISOString().substring(0, 7),
      baseSalary: '',
      bonuses: 0,
      deductions: 0,
      overtime: 0,
      overtimeRate: 0,
      notes: ''
    });
    setShowSalaryForm(false);
  };

  const getEmployeeById = (employeeId) => {
    return employees.find(emp => emp.id === employeeId);
  };

  const getEmployeeEffectiveSalary = (employeeId, month) => {
    // Chercher un salaire spécifique pour ce mois
    const specificSalary = salaries.find(
      salary => salary.employeeId === employeeId && salary.month === month
    );

    if (specificSalary) {
      return {
        amount: specificSalary.netSalary,
        source: 'specific',
        details: specificSalary
      };
    }

    // Sinon utiliser le salaire de base de l'employé
    const employee = getEmployeeById(employeeId);
    return {
      amount: employee?.salary || 0,
      source: 'base',
      details: { baseSalary: employee?.salary || 0 }
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--accent-green)';
      case 'pending': return '#ff9800';
      case 'rejected': return '#c62828';
      case 'paid': return 'var(--accent-green)';
      default: return 'var(--primary-gray)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approuvée';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejetée';
      case 'paid': return 'Payé';
      default: return 'Inconnu';
    }
  };

  const getTotalSalariesForMonth = () => {
    return salaries.reduce((total, salary) => total + (salary.netSalary || 0), 0);
  };

  const getPendingAdvancesTotal = () => {
    return advances
      .filter(advance => advance.status === 'pending')
      .reduce((total, advance) => total + (advance.amount || 0), 0);
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
        <h1>Gestion des Salaires</h1>
        <button
          className="add-button"
          onClick={() => setShowSalaryForm(true)}
        >
          + Nouveau Salaire
        </button>
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

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Salaires du Mois</h3>
          <div className="stat-number">{getTotalSalariesForMonth().toFixed(2)} Ar</div>
        </div>
        <div className="stat-card">
          <h3>Avances en Attente</h3>
          <div className="stat-number">{getPendingAdvancesTotal().toFixed(2)} Ar</div>
        </div>
        <div className="stat-card">
          <h3>Employés Actifs</h3>
          <div className="stat-number">{employees.length}</div>
        </div>
      </div>

      {/* Salary Form Modal */}
      {showSalaryForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>Configurer Salaire</h2>
              <button className="close-button" onClick={resetSalaryForm}>×</button>
            </div>

            <form onSubmit={handleSalarySubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employeeId">Employé *</label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    value={salaryFormData.employeeId}
                    onChange={handleSalaryInputChange}
                    required
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} - {employee.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="month">Mois *</label>
                  <input
                    type="month"
                    id="month"
                    name="month"
                    value={salaryFormData.month}
                    onChange={handleSalaryInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="baseSalary">Salaire de base (Ar) *</label>
                  <input
                    type="number"
                    id="baseSalary"
                    name="baseSalary"
                    value={salaryFormData.baseSalary}
                    onChange={handleSalaryInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                  {salaryFormData.employeeId && (
                    <small className="form-help">
                      Salaire de base de l'employé: {employees.find(emp => emp.id === salaryFormData.employeeId)?.salary || 0} Ar/mois
                      <br />
                      <em>Vous pouvez modifier ce montant pour ce mois spécifique</em>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="bonuses">Primes (Ar)</label>
                  <input
                    type="number"
                    id="bonuses"
                    name="bonuses"
                    value={salaryFormData.bonuses}
                    onChange={handleSalaryInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="overtime">Heures supplémentaires</label>
                  <input
                    type="number"
                    id="overtime"
                    name="overtime"
                    value={salaryFormData.overtime}
                    onChange={handleSalaryInputChange}
                    step="0.5"
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="overtimeRate">Taux horaire supp. (Ar)</label>
                  <input
                    type="number"
                    id="overtimeRate"
                    name="overtimeRate"
                    value={salaryFormData.overtimeRate}
                    onChange={handleSalaryInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deductions">Déductions (Ar)</label>
                <input
                  type="number"
                  id="deductions"
                  name="deductions"
                  value={salaryFormData.deductions}
                  onChange={handleSalaryInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="salary-preview">
                <h3>Aperçu du Salaire</h3>
                <div className="salary-breakdown">
                  <div className="breakdown-row">
                    <span>Salaire de base:</span>
                    <span>{(parseFloat(salaryFormData.baseSalary) || 0).toFixed(2)} Ar</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Primes:</span>
                    <span>+{(parseFloat(salaryFormData.bonuses) || 0).toFixed(2)} Ar</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Heures supplémentaires:</span>
                    <span>+{((parseFloat(salaryFormData.overtime) || 0) * (parseFloat(salaryFormData.overtimeRate) || 0)).toFixed(2)} Ar</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Déductions:</span>
                    <span>-{(parseFloat(salaryFormData.deductions) || 0).toFixed(2)} Ar</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>Salaire net:</span>
                    <span>{calculateNetSalary(salaryFormData).toFixed(2)} Ar</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={salaryFormData.notes}
                  onChange={handleSalaryInputChange}
                  placeholder="Notes sur le salaire"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetSalaryForm} className="cancel-button">
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

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'salaries' ? 'active' : ''}`}
          onClick={() => setActiveTab('salaries')}
        >
          Salaires
        </button>
        <button
          className={`tab ${activeTab === 'advances' ? 'active' : ''}`}
          onClick={() => setActiveTab('advances')}
        >
          Demandes d'Avance
        </button>
      </div>

      <main className="admin-main">
        {activeTab === 'salaries' && (
          <section className="salaries-section">
            <h2>Salaires - {new Date(selectedMonth).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</h2>
            <div className="salaries-list">
              {(selectedEmployee ? employees.filter(emp => emp.id === selectedEmployee) : employees).map(employee => {
                const specificSalary = salaries.find(s => s.employeeId === employee.id);
                const effectiveSalary = getEmployeeEffectiveSalary(employee.id, selectedMonth);

                return (
                  <div key={employee.id} className="salary-card">
                    <div className="salary-header">
                      <div className="employee-info">
                        <h3>{employee.fullName}</h3>
                        <span className="employee-position">{employee.position}</span>
                      </div>
                      <div className="salary-type">
                        {effectiveSalary.source === 'specific' ? (
                          <span className="specific-salary">Salaire personnalisé</span>
                        ) : (
                          <span className="base-salary">Salaire de base</span>
                        )}
                      </div>
                      {specificSalary && (
                        <div
                          className="payment-status"
                          style={{ backgroundColor: getStatusColor(specificSalary.paymentStatus) }}
                        >
                          {getStatusText(specificSalary.paymentStatus)}
                        </div>
                      )}
                    </div>

                    <div className="salary-details">
                      <div className="salary-breakdown">
                        {effectiveSalary.source === 'specific' ? (
                          <>
                            <div className="breakdown-row">
                              <span>Salaire de base (employé):</span>
                              <span>{employee.salary.toFixed(2)} Ar</span>
                            </div>
                            <div className="breakdown-row">
                              <span>Salaire configuré ce mois:</span>
                              <span>{specificSalary.baseSalary.toFixed(2)} Ar</span>
                            </div>
                            {specificSalary.bonuses > 0 && (
                              <div className="breakdown-row">
                                <span>Primes:</span>
                                <span>+{specificSalary.bonuses.toFixed(2)} Ar</span>
                              </div>
                            )}
                            {specificSalary.overtime > 0 && (
                              <div className="breakdown-row">
                                <span>Heures supp. ({specificSalary.overtime}h x {specificSalary.overtimeRate}Ar):</span>
                                <span>+{(specificSalary.overtime * specificSalary.overtimeRate).toFixed(2)} Ar</span>
                              </div>
                            )}
                            {specificSalary.deductions > 0 && (
                              <div className="breakdown-row">
                                <span>Déductions:</span>
                                <span>-{specificSalary.deductions.toFixed(2)} Ar</span>
                              </div>
                            )}

                            {(() => {
                              // Calculer le salaire brut du mois (configuré spécifiquement)
                              const monthlySalary = specificSalary.baseSalary + (specificSalary.bonuses || 0) +
                                ((specificSalary.overtime || 0) * (specificSalary.overtimeRate || 0)) - (specificSalary.deductions || 0);

                              // Calculer les avances approuvées pour ce mois
                              const monthlyApprovedAdvances = advances
                                .filter(advance =>
                                  advance.employeeId === employee.id &&
                                  advance.status === 'approved' &&
                                  advance.requestedDate?.substring(0, 7) === selectedMonth
                                )
                                .reduce((total, advance) => total + advance.amount, 0);

                              // Calculer le salaire restant
                              const remainingSalary = monthlySalary - monthlyApprovedAdvances;

                              return (
                                <>
                                  <div className="breakdown-row subtotal">
                                    <span>Salaire du mois (configuré):</span>
                                    <span>{monthlySalary.toFixed(2)} Ar</span>
                                  </div>
                                  {monthlyApprovedAdvances > 0 && (
                                    <div className="breakdown-row deduction">
                                      <span>Avances approuvées du mois:</span>
                                      <span>-{monthlyApprovedAdvances.toFixed(2)} Ar</span>
                                    </div>
                                  )}
                                  <div className="breakdown-row total">
                                    <span>Salaire restant à payer:</span>
                                    <span>{remainingSalary.toFixed(2)} Ar</span>
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          (() => {
                            // Pour salaire de base employé (pas de configuration spécifique)
                            const baseSalary = employee.salary; // Salaire de base de l'employé
                            const monthlySalary = baseSalary; // Par défaut = salaire de base
                            const monthlyApprovedAdvances = advances
                              .filter(advance =>
                                advance.employeeId === employee.id &&
                                advance.status === 'approved' &&
                                advance.requestedDate?.substring(0, 7) === selectedMonth
                              )
                              .reduce((total, advance) => total + advance.amount, 0);

                            const remainingSalary = monthlySalary - monthlyApprovedAdvances;

                            return (
                              <>
                                <div className="breakdown-row subtotal">
                                  <span>Salaire du mois (par défaut):</span>
                                  <span>{monthlySalary.toFixed(2)} Ar</span>
                                </div>
                                {monthlyApprovedAdvances > 0 && (
                                  <div className="breakdown-row deduction">
                                    <span>Avances approuvées du mois:</span>
                                    <span>-{monthlyApprovedAdvances.toFixed(2)} Ar</span>
                                  </div>
                                )}
                                <div className="breakdown-row total">
                                  <span>Salaire restant à payer:</span>
                                  <span>{remainingSalary.toFixed(2)} Ar</span>
                                </div>
                              </>
                            );
                          })()
                        )}
                      </div>

                      {specificSalary?.notes && (
                        <div className="salary-notes">
                          <strong>Notes:</strong> {specificSalary.notes}
                        </div>
                      )}
                    </div>

                    <div className="salary-actions">
                      {!specificSalary && (
                        <button
                          className="configure-button"
                          onClick={() => {
                            setSalaryFormData({
                              ...salaryFormData,
                              employeeId: employee.id,
                              month: selectedMonth,
                              baseSalary: employee.salary || 0
                            });
                            setShowSalaryForm(true);
                          }}
                        >
                          ⚙️ Configurer salaire
                        </button>
                      )}
                      {specificSalary && specificSalary.paymentStatus === 'pending' && (
                        <button
                          className="approve-button"
                          onClick={() => handlePaymentStatusUpdate(specificSalary.id, 'paid')}
                        >
                          ✅ Marquer comme payé
                        </button>
                      )}
                      {specificSalary && specificSalary.paymentStatus === 'paid' && (
                        <button
                          className="revert-button"
                          onClick={() => handlePaymentStatusUpdate(specificSalary.id, 'pending')}
                        >
                          ↩️ Annuler paiement
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {salaries.length === 0 && !loading && (
                <div className="empty-state">
                  <h3>Aucun salaire configuré</h3>
                  <p>Configurez les salaires pour le mois sélectionné</p>
                  <button
                    className="add-button"
                    onClick={() => setShowSalaryForm(true)}
                  >
                    + Configurer salaire
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'advances' && (
          <section className="advances-section">
            <h2>Demandes d'Avance</h2>
            <div className="advances-list">
              {advances.map(advance => {
                const employee = getEmployeeById(advance.employeeId);
                return (
                  <div key={advance.id} className="advance-card">
                    <div className="advance-header">
                      <div className="employee-info">
                        <h3>{employee?.fullName || 'Employé inconnu'}</h3>
                        <span className="advance-date">
                          Demandé le {new Date(advance.requestDate || advance.createdAt?.toDate()).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div
                        className="advance-status"
                        style={{ backgroundColor: getStatusColor(advance.status) }}
                      >
                        {getStatusText(advance.status)}
                      </div>
                    </div>

                    <div className="advance-details">
                      <div className="advance-amount">
                        <span>Montant demandé:</span>
                        <span className="amount">{advance.amount.toFixed(2)} Ar</span>
                      </div>

                      {advance.reason && (
                        <div className="advance-reason">
                          <strong>Raison:</strong> {advance.reason}
                        </div>
                      )}

                      {advance.status === 'approved' && advance.processedDate && (
                        <div className="advance-processed">
                          Approuvé le {new Date(advance.processedDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>

                    {advance.status === 'pending' && (
                      <div className="advance-actions">
                        <button
                          className="approve-button"
                          onClick={() => handleAdvanceStatusUpdate(advance.id, 'approved')}
                        >
                          ✅ Approuver
                        </button>
                        <button
                          className="reject-button"
                          onClick={() => handleAdvanceStatusUpdate(advance.id, 'rejected')}
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {advances.length === 0 && !loading && (
                <div className="empty-state">
                  <h3>Aucune demande d'avance</h3>
                  <p>Les demandes d'avance apparaîtront ici</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Salaries;