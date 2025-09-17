import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StreamingProvider } from './context/StreamingContext';
import AdminLogin from './admin/AdminLogin';
import AdminPanel from './admin/AdminPanel';
import ViewerPage from './ViewerPage';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug component to track location changes
function LocationTracker() {
  const location = useLocation();
  console.log('📍 Current location:', location.pathname);
  return null;
}

function App() {
  console.log('[App.tsx] App component rendering...');
  console.log('[App.tsx] Current location:', window.location.href);
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StreamingProvider>
          <Router>
            <LocationTracker />
            <Routes>
              {/* Redirect root to admin login */}
              <Route path="/" element={<Navigate to="/admin" replace />} />
              
              {/* Viewer Routes - No authentication required */}
              <Route path="/view/:streamId" element={<ViewerPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard/*" element={<AdminPanel />} />
              
              {/* Fallback - redirect to admin */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Router>
        </StreamingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
