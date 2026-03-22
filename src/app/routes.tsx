import { createHashRouter, Navigate } from 'react-router';
import { useStore } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MediaPlan from './pages/MediaPlan';
import Calendar from './pages/Calendar';
import Team from './pages/Team';
import Account from './pages/Account';
import Archive from './pages/Archive';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function LoginRoute() {
  const { currentUser } = useStore();
  
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return <Login />;
}

// Hash-based routing makes the app work on any static server
// without requiring SPA "fallback" rewrite rules.
export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginRoute />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'mediaplan',
        element: <MediaPlan />,
      },
      {
        path: 'calendar',
        element: <Calendar />,
      },
      {
        path: 'team',
        element: <Team />,
      },
      {
        path: 'archive',
        element: <Archive />,
      },
      {
        path: 'account',
        element: <Account />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);