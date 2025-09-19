import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateDocument,
  queryDocuments
} from '../../firebase/services';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Employee.css';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [employee, setEmployee] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      if (!userEmail) {
        setError('Session utilisateur non trouvée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      console.log('Loading employee data for email:', userEmail);

      const employees = await queryDocuments('employees', [
        { field: 'email', operator: '==', value: userEmail }
      ]);

      console.log('Found employees:', employees);

      if (employees.length > 0) {
        const employeeData = employees[0];
        setEmployee(employeeData);
        console.log('Employee loaded:', employeeData);
      } else {
        setError('Employé non trouvé avec cet email: ' + userEmail);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      setError('Erreur lors du chargement des données: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validations
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Tous les champs sont requis');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'actuel');
      setLoading(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Vous devez être connecté pour changer votre mot de passe');
        setLoading(false);
        return;
      }

      // Ré-authentifier l'utilisateur avec son mot de passe actuel
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      // Mettre à jour le mot de passe dans Firebase Auth
      await updatePassword(currentUser, passwordData.newPassword);

      // Mettre à jour dans la base de données
      await updateDocument('employees', employee.id, {
        lastPasswordChange: new Date().toISOString(),
        hasDefaultPassword: false
      });

      setSuccess('Mot de passe mis à jour avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Password update error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Mot de passe actuel incorrect');
      } else if (error.code === 'auth/weak-password') {
        setError('Le nouveau mot de passe est trop faible');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Veuillez vous reconnecter pour modifier votre mot de passe');
      } else {
        setError('Erreur lors de la mise à jour du mot de passe: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="employee-container">
        <div className="loading">Chargement du profil employé...</div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="employee-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/employee/dashboard')} className="back-button">
          ← Retour au tableau de bord
        </button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="employee-container">
        <div className="error-message">Aucune donnée employé trouvée</div>
        <button onClick={() => navigate('/employee/dashboard')} className="back-button">
          ← Retour au tableau de bord
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
        <h1>Paramètres du Compte</h1>
        <div className="user-info">
          {employee.email}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="employee-profile-header">
        <div className="profile-summary">
          <div className="employee-avatar">
            {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
          </div>
          <div className="employee-info">
            <h2>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</h2>
            <p className="position">{employee.position}</p>
            <p className="department">{employee.department}</p>
            <p className="email">{employee.email}</p>
            {employee.phone && <p className="phone">📞 {employee.phone}</p>}
            {employee.hireDate && (
              <p className="hire-date">
                Embauché le {new Date(employee.hireDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <div className="status-badge" style={{
            backgroundColor: employee.status === 'active' ? 'var(--accent-green)' : '#ff9800'
          }}>
            {employee.status === 'active' ? 'Actif' : 'Inactif'}
          </div>
        </div>
      </div>

      <main className="employee-main">
        <div className="profile-container">
          <div className="password-card">
            <h3>Changer le Mot de Passe</h3>
            <p className="security-note">
              Pour des raisons de sécurité, veuillez entrer votre mot de passe actuel avant de définir un nouveau mot de passe.
            </p>

            {employee.hasDefaultPassword && (
              <div className="warning-message">
                ⚠️ Vous utilisez encore le mot de passe par défaut. Il est recommandé de le changer pour sécuriser votre compte.
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="form">
              <div className="form-group">
                <label htmlFor="currentPassword">Mot de passe actuel *</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Entrez votre mot de passe actuel"
                />
                {employee.hasDefaultPassword && (
                  <small className="form-help">
                    Mot de passe par défaut : Employee123
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nouveau mot de passe *</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength="6"
                  placeholder="Entrez votre nouveau mot de passe"
                />
                <small className="form-help">
                  Le mot de passe doit contenir au moins 6 caractères
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Confirmez votre nouveau mot de passe"
                />
              </div>

              <div className="password-requirements">
                <h4>Exigences du mot de passe :</h4>
                <ul>
                  <li className={passwordData.newPassword.length >= 6 ? 'valid' : ''}>
                    Au moins 6 caractères
                  </li>
                  <li className={passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword ? 'valid' : ''}>
                    Les mots de passe correspondent
                  </li>
                </ul>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Mise à jour...' : 'Changer le Mot de Passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeProfile;