import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Home from './components/Home/Home';
import StaffHome from './components/Home/StaffHome';
import ClientLogin from './components/Auth/ClientLogin';
import ClientRegister from './components/Auth/ClientRegister';
import StaffLogin from './components/Auth/StaffLogin';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import ClientDashboard from './components/Dashboard/ClientDashboard';
import ProductCategories from './components/Admin/ProductCategories';
import Products from './components/Admin/Products';
import Expenses from './components/Admin/Expenses';
import Stock from './components/Admin/Stock';
import Reports from './components/Admin/Reports';
import Employees from './components/Admin/Employees';
import EmployeeRatings from './components/Admin/EmployeeRatings';
import Salaries from './components/Admin/Salaries';
import Leaves from './components/Admin/Leaves';
import AdminProfile from './components/Admin/AdminProfile';
import OrderManagement from './components/Admin/OrderManagement';
import EmployeeProfile from './components/Employee/EmployeeProfile';
import EmployeeLeaves from './components/Employee/EmployeeLeaves';
import EmployeeSalary from './components/Employee/EmployeeSalary';
import ClientProfile from './components/Client/ClientProfile';
import ClientMenu from './components/Client/ClientMenu';
import ClientCart from './components/Client/ClientCart';
import ClientOrders from './components/Client/ClientOrders';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('userRole');

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router basename="/scandale_bouffe_website">
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/register" element={<ClientRegister />} />
          <Route path="/staff/login" element={<StaffLogin />} />

          {/* Protected Routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/expenses"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stock"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ratings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmployeeRatings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/salaries"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Salaries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaves"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Leaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <OrderManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Employee */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/profile"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/leaves"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeLeaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/salary"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeSalary />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Client */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/menu"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/cart"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientCart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/orders"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientOrders />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
