import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, queryDocuments } from '../../firebase/services';
import './Auth.css';
import './ClientAuth.css';

const ClientLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
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
      const user = await loginUser(formData.email, formData.password);

      // Récupérer le profil client depuis Firestore
      const clients = await queryDocuments('clients', [
        { field: 'uid', operator: '==', value: user.uid }
      ]);

      if (clients.length > 0) {
        const clientProfile = clients[0];
        // Stocker les informations dans localStorage
        localStorage.setItem('userRole', clientProfile.role);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);

        navigate('/client/dashboard');
      } else {
        setError('Profil client non trouvé');
      }
    } catch (error) {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restaurant-auth-container">
      <div className="restaurant-auth-backdrop"></div>
      <div className="restaurant-auth-content">
        <div className="restaurant-auth-card">
          <div className="restaurant-auth-header">
            <img src="/images/scandale_logo.jpg" alt="Scandale Bouffe" className="restaurant-auth-logo" />
            <h1>Scandale Bouffe</h1>
            <p>L'Art Culinaire Malgache</p>
            <h2>Connexion Membres</h2>
          </div>

          <form onSubmit={handleSubmit} className="restaurant-auth-form">
            {error && <div className="restaurant-error-message">{error}</div>}

            <div className="restaurant-form-group">
              <label htmlFor="email">Adresse Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="votre@email.com"
              />
            </div>

            <div className="restaurant-form-group">
              <label htmlFor="password">Mot de Passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="restaurant-auth-button"
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
            </button>
          </form>

          <div className="restaurant-auth-footer">
            <p className="restaurant-signup-text">
              Pas encore membre de notre communauté ?
            </p>
            <button
              className="restaurant-signup-button"
              onClick={() => navigate('/client/register')}
            >
              Rejoindre Scandale Bouffe
            </button>

            <div className="restaurant-back-link">
              <button
                className="restaurant-back-button"
                onClick={() => navigate('/')}
              >
                ← Retour au restaurant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;