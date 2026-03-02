import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Film, Sparkles } from 'lucide-react';

export function Layout() {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-cute-bg text-cute-text flex flex-col font-sans">
      <header className="bg-white border-b-4 border-cute-pink p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="bg-cute-pink p-2 rounded-2xl group-hover:rotate-12 transition-transform shadow-cute">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-cute-pink tracking-tight">WatchParty</h1>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="flex items-center gap-3 bg-cute-lavender/30 px-4 py-2 rounded-full border-2 border-cute-lavender">
              <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
              <span className="font-bold text-cute-dark">{profile.username}</span>
            </div>
          )}
          <button 
            onClick={handleSignOut} 
            className="p-2.5 bg-white hover:bg-cute-pink hover:text-white text-cute-pink rounded-full transition-colors shadow-sm border-2 border-cute-pink"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
