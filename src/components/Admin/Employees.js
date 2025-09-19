import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
} from '../../firebase/services';
import { registerUser } from '../../firebase/services';
import './Admin.css';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    salary: '',
    hireDate: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const positions = [
    'Cuisinier',
    'Commis de cuisine',
    'Chef de cuisine',
    'Serveur',
    'Responsable salle',
    'Caissier',
    'Plongeur',
    'Manager',
    'Aide de cuisine'
  ];

  const departments = [
    'Cuisine',
    'Service',
    'Administration',
    'Nettoyage'
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('employees');
      setEmployees(data);
    } catch (error) {
      setError('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
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
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Format d\'email invalide');
      }

      const employeeData = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        fullName: `${formData.firstName} ${formData.lastName}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingEmployee) {
        await updateDocument('employees', editingEmployee.id, {
          ...employeeData,
          createdAt: editingEmployee.createdAt // Preserve original creation date
        });
      } else {
        // Create Firebase Auth account for new employee
        try {
          const tempPassword = 'Employee123'; // Default password
          const newUser = await registerUser(formData.email, tempPassword);

          // Add employee to employees collection
          await createDocument('employees', {
            ...employeeData,
            uid: newUser.uid,
            hasDefaultPassword: true // Flag to force password change on first login
          });

          // Create user profile in users collection with employee role
          await createDocument('users', {
            uid: newUser.uid,
            email: formData.email,
            role: 'employee',
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone || '',
            isActive: true,
            permissions: ['employee_access'],
            employeeId: null, // Will be updated after employee creation
            createdAt: new Date(),
            lastLogin: null
          });

        } catch (authError) {
          console.error('Error creating employee auth:', authError);
          let errorMessage = 'Erreur lors de la création du compte';

          // Handle specific Firebase Auth errors
          switch (authError.code) {
            case 'auth/email-already-in-use':
              errorMessage = 'Cette adresse email est déjà utilisée';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Format d\'email invalide';
              break;
            case 'auth/weak-password':
              errorMessage = 'Le mot de passe est trop faible';
              break;
            case 'auth/network-request-failed':
              errorMessage = 'Erreur de connexion réseau';
              break;
            default:
              errorMessage = `Erreur lors de la création du compte: ${authError.message}`;
          }

          throw new Error(errorMessage);
        }
      }

      await loadEmployees();
      resetForm();
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || '',
      salary: employee.salary?.toString() || '',
      hireDate: employee.hireDate || '',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
      status: employee.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ? Cette action supprimera également son accès au système.')) {
      try {
        setLoading(true);

        // Get employee data to find associated user
        const employee = employees.find(emp => emp.id === employeeId);

        // Delete from employees collection
        await deleteDocument('employees', employeeId);

        // Delete from users collection if uid exists
        if (employee && employee.uid) {
          const userQueries = await queryDocuments('users', [
            { field: 'uid', operator: '==', value: employee.uid }
          ]);

          if (userQueries.length > 0) {
            await deleteDocument('users', userQueries[0].id);
          }
        } else if (employee && employee.email) {
          // Fallback: search by email if uid doesn't exist
          const userQueries = await queryDocuments('users', [
            { field: 'email', operator: '==', value: employee.email }
          ]);

          if (userQueries.length > 0) {
            await deleteDocument('users', userQueries[0].id);
          }
        }

        await loadEmployees();
      } catch (error) {
        setError('Erreur lors de la suppression');
        console.error('Delete employee error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      setLoading(true);
      await updateDocument('employees', employeeId, { status: newStatus });
      await loadEmployees();
    } catch (error) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      salary: '',
      hireDate: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      status: 'active'
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const getEmployeesByStatus = (status) => {
    return employees.filter(emp => emp.status === status);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--accent-green)';
      case 'inactive': return '#ff9800';
      case 'terminated': return '#c62828';
      default: return 'var(--primary-gray)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'terminated': return 'Licencié';
      default: return 'Inconnu';
    }
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
        <h1>Gestion des Employés</h1>
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Nouvel Employé
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="employee-stats">
        <div className="stat-card">
          <h3>Employés Actifs</h3>
          <div className="stat-number">{getEmployeesByStatus('active').length}</div>
        </div>
        <div className="stat-card">
          <h3>Employés Inactifs</h3>
          <div className="stat-number">{getEmployeesByStatus('inactive').length}</div>
        </div>
        <div className="stat-card">
          <h3>Total Employés</h3>
          <div className="stat-number">{employees.length}</div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>{editingEmployee ? 'Modifier' : 'Ajouter'} un Employé</h2>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Prénom *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Prénom de l'employé"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Nom *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Nom de l'employé"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="email@example.com"
                    disabled={editingEmployee} // Can't change email after creation
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Téléphone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Numéro de téléphone"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="position">Poste *</label>
                  <select
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner un poste</option>
                    {positions.map(position => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="department">Département *</label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map(department => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="salary">Salaire mensuel (Ar)</label>
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hireDate">Date d'embauche</label>
                  <input
                    type="date"
                    id="hireDate"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Adresse</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Adresse complète"
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergencyContact">Contact d'urgence</label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Nom du contact d'urgence"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyPhone">Téléphone d'urgence</label>
                  <input
                    type="tel"
                    id="emergencyPhone"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="Numéro d'urgence"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="terminated">Licencié</option>
                </select>
              </div>

              {!editingEmployee && (
                <div className="info-message">
                  Un compte sera automatiquement créé avec le mot de passe par défaut: Employee123
                </div>
              )}

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
        {loading && employees.length === 0 ? (
          <div className="loading">Chargement des employés...</div>
        ) : (
          <div className="employees-grid">
            {employees.map(employee => (
              <div key={employee.id} className="employee-card">
                <div className="employee-header">
                  <div className="employee-avatar">
                    {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
                  </div>
                  <div
                    className="employee-status-badge"
                    style={{ backgroundColor: getStatusColor(employee.status) }}
                  >
                    {getStatusText(employee.status)}
                  </div>
                </div>

                <div className="employee-content">
                  <h3>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</h3>
                  <div className="employee-position">{employee.position}</div>
                  <div className="employee-department">{employee.department}</div>

                  <div className="employee-details">
                    <div className="detail-row">
                      <span>Email:</span>
                      <span>{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="detail-row">
                        <span>Téléphone:</span>
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.salary && (
                      <div className="detail-row">
                        <span>Salaire:</span>
                        <span>{employee.salary} Ar/mois</span>
                      </div>
                    )}
                    {employee.hireDate && (
                      <div className="detail-row">
                        <span>Embauché le:</span>
                        <span>{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>

                  {employee.hasDefaultPassword && (
                    <div className="warning-message">
                      Mot de passe par défaut - Changement requis
                    </div>
                  )}
                </div>

                <div className="employee-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(employee)}
                  >
                    ✏️ Modifier
                  </button>

                  {employee.status === 'active' ? (
                    <button
                      className="deactivate-button"
                      onClick={() => handleStatusChange(employee.id, 'inactive')}
                    >
                      ⏸️ Désactiver
                    </button>
                  ) : (
                    <button
                      className="activate-button"
                      onClick={() => handleStatusChange(employee.id, 'active')}
                    >
                      ▶️ Activer
                    </button>
                  )}

                  <button
                    className="delete-button"
                    onClick={() => handleDelete(employee.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}

            {employees.length === 0 && !loading && (
              <div className="empty-state">
                <h3>Aucun employé trouvé</h3>
                <p>Commencez par ajouter votre premier employé</p>
                <button
                  className="add-button"
                  onClick={() => setShowForm(true)}
                >
                  + Ajouter un employé
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Employees;