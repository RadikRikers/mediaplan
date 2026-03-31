import { Suspense, lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { useStore } from './store';
import Layout from './components/Layout';
import { Skeleton } from './components/ui/skeleton';
import {
  canAccessMediaWorkloadNav,
  canAccessAnalyticsSection,
  canAccessFeedbackSection,
  canAccessLearningSection,
} from './utils/permissions';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MediaPlan = lazy(() => import('./pages/MediaPlan'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Team = lazy(() => import('./pages/Team'));
const Account = lazy(() => import('./pages/Account'));
const Archive = lazy(() => import('./pages/Archive'));
const Meetings = lazy(() => import('./pages/Meetings'));
const ContentPlan = lazy(() => import('./pages/ContentPlan'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Learning = lazy(() => import('./pages/Learning'));

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true" aria-label="Загрузка страницы">
      <Skeleton className="h-9 w-56 rounded-md" />
      <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function MediaWorkloadProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, staffBlocks } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessMediaWorkloadNav(currentUser, staffBlocks)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AnalyticsSectionRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, staffBlocks } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessAnalyticsSection(currentUser, staffBlocks)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function FeedbackSectionRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, staffBlocks } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessFeedbackSection(currentUser, staffBlocks)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LearningSectionRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, staffBlocks } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessLearningSection(currentUser, staffBlocks)) {
    return <Navigate to="/" replace />;
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
          <MediaWorkloadProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MediaPlan />
            </Suspense>
          </MediaWorkloadProtectedRoute>
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
        path: 'contentplan',
        element: (
          <MediaWorkloadProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ContentPlan />
            </Suspense>
          </MediaWorkloadProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <AnalyticsSectionRoute>
            <Suspense fallback={<PageLoader />}>
              <Analytics />
            </Suspense>
          </AnalyticsSectionRoute>
        ),
      },
      {
        path: 'feedback',
        element: (
          <FeedbackSectionRoute>
            <Suspense fallback={<PageLoader />}>
              <Feedback />
            </Suspense>
          </FeedbackSectionRoute>
        ),
      },
      {
        path: 'learning',
        element: (
          <LearningSectionRoute>
            <Suspense fallback={<PageLoader />}>
              <Learning />
            </Suspense>
          </LearningSectionRoute>
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
          <MediaWorkloadProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Archive />
            </Suspense>
          </MediaWorkloadProtectedRoute>
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