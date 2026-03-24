import { Suspense, lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { useStore } from './store';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MediaPlan = lazy(() => import('./pages/MediaPlan'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Team = lazy(() => import('./pages/Team'));
const Account = lazy(() => import('./pages/Account'));
const Archive = lazy(() => import('./pages/Archive'));
const Meetings = lazy(() => import('./pages/Meetings'));

function PageLoader() {
  return <div className="p-6 text-sm text-gray-500">Загрузка...</div>;
}

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
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Login />
    </Suspense>
  );
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
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'mediaplan',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MediaPlan />
          </Suspense>
        ),
      },
      {
        path: 'calendar',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Calendar />
          </Suspense>
        ),
      },
      {
        path: 'meetings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Meetings />
          </Suspense>
        ),
      },
      {
        path: 'team',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Team />
          </Suspense>
        ),
      },
      {
        path: 'archive',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Archive />
          </Suspense>
        ),
      },
      {
        path: 'account',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Account />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);