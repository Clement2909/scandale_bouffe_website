import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { queryDocuments } from '../../firebase/services';
import './Client.css';

const ClientProfile = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const [client, setClient] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const clients = await queryDocuments('clients', [
        { field: 'email', operator: '==', value: userEmail }
      ]);

      if (clients.length > 0) {
        const clientData = clients[0];
        setClient(clientData);
      } else {
        setError('Client non trouvé');
      }
    } catch (error) {
      setError('Erreur lors du chargement des données');
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

    try {
      // Update password with Firebase Auth
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, passwordData.newPassword);
      }

      setSuccess('Mot de passe mis à jour avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="client-container">
        <div className="loading">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="client-container">
      <header className="client-header">
        <button
          className="back-button"
          onClick={() => navigate('/client/dashboard')}
        >
          ← Retour
        </button>
        <h1>Mon Profil</h1>
        <div className="user-info">
          {client.fullName || `${client.firstName} ${client.lastName}`}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="client-profile-header">
        <div className="profile-summary">
          <div className="client-avatar">
            {(client.firstName?.[0] || '') + (client.lastName?.[0] || '')}
          </div>
          <div className="client-info">
            <h2>{client.fullName || `${client.firstName} ${client.lastName}`}</h2>
            <p className="email">{client.email}</p>
            {client.phone && <p className="phone">📞 {client.phone}</p>}
            {client.address && <p className="address">📍 {client.address}</p>}
            {client.registrationDate && (
              <p className="registration-date">
                Client depuis le {new Date(client.registrationDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <div className="status-badge" style={{
            backgroundColor: 'var(--accent-green)'
          }}>
            Actif
          </div>
        </div>
      </div>

      <main className="client-main">
        <div className="profile-container">
          <div className="password-section">
            <div className="password-card">
              <h3>Changer le Mot de Passe</h3>
              <p className="security-note">
                Pour des raisons de sécurité, définissez un nouveau mot de passe sécurisé.
              </p>

              <form onSubmit={handlePasswordSubmit} className="form">
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
        </div>
      </main>
    </div>
  );
};

export default ClientProfile;