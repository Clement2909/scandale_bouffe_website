import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || 'admin@scandalebouffe.com';
    setUserEmail(email);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/staff/login');
  };

  const menuItems = [
    { title: 'Catégories Produits', path: '/admin/categories', icon: '📂' },
    { title: 'Gestion Produits', path: '/admin/products', icon: '🍽️' },
    { title: 'Gestion Stock', path: '/admin/stock', icon: '📦' },
    { title: 'Gestion Commandes', path: '/admin/orders', icon: '📋' },
    { title: 'Gestion Dépenses', path: '/admin/expenses', icon: '💸' },
    { title: 'Récapitulatifs', path: '/admin/reports', icon: '📊' },
    { title: 'Gestion Employés', path: '/admin/employees', icon: '👥' },
    { title: 'Notes Employés', path: '/admin/ratings', icon: '⭐' },
    { title: 'Gestion Salaires', path: '/admin/salaries', icon: '💰' },
    { title: 'Gestion Congés', path: '/admin/leaves', icon: '📅' },
    { title: 'Mon Profil', path: '/admin/profile', icon: '👤' }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/scandale_logo.jpg" alt="Scandale Bouffe" className="header-logo" />
          <h1>Tableau de Bord - Administrateur</h1>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <div className="user-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="user-details">
              <span className="user-email">{userEmail}</span>
              <span className="user-role">Administrateur</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="dashboard-card"
              onClick={() => navigate(item.path)}
            >
              <div className="card-icon">{item.icon}</div>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;