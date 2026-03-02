import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './layouts/Layout';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { Auth } from './pages/Auth';

function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
        <Route element={<Layout />}>
          <Route path="/" element={user ? <Home /> : <Navigate to="/auth" />} />
          <Route path="/room/:id" element={user ? <Room /> : <Navigate to="/auth" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
