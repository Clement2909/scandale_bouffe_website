import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('employeeId');
    navigate('/staff/login');
  };

  const menuItems = [
    { title: 'Mon Profil', path: '/employee/profile', icon: '👤' },
    { title: 'Mes Congés', path: '/employee/leaves', icon: '📅' },
    { title: 'Mon Salaire', path: '/employee/salary', icon: '💰' }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/scandale_bouffe_website/images/scandale_logo.jpg" alt="Scandale Bouffe" className="header-logo" />
          <h1>Tableau de Bord - Employé</h1>
        </div>
        <div className="header-right">
          <span className="user-info">{userEmail}</span>
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Bienvenue, {userEmail}</h2>
          <p>Gérez vos informations personnelles et vos demandes</p>
        </div>

        <div className="dashboard-grid employee-grid">
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

export default EmployeeDashboard;