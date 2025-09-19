import React, { useState } from 'react';
import { initializeAdmin } from '../../firebase/initAdmin';

const InitAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInitialize = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await initializeAdmin();
      setMessage('Admin initialisé avec succès! Email: admin@scandalebouffe.com, Mot de passe: Admin123!@#');
    } catch (error) {
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Initialisation de l'Administrateur</h2>
      <p>Cliquez sur le bouton ci-dessous pour créer le compte administrateur par défaut dans Firebase.</p>

      {message && (
        <div style={{
          padding: '10px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          color: '#155724',
          marginBottom: '15px'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleInitialize}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Initialisation...' : 'Initialiser l\'Admin'}
      </button>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h3>Informations importantes:</h3>
        <ul>
          <li>L'email par défaut sera: <strong>admin@scandalebouffe.com</strong></li>
          <li>Le mot de passe par défaut sera: <strong>Admin123!@#</strong></li>
          <li>Vous pourrez modifier ces informations après la connexion</li>
          <li>Si l'admin existe déjà, cette opération n'aura aucun effet</li>
        </ul>
      </div>
    </div>
  );
};

export default InitAdmin;