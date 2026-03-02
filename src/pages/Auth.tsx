import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Heart } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // The `data` field is available on the user record but does not
            // automatically create a row in the `profiles` table. We still
            // insert one ourselves below so that other parts of the app can
            // query `profiles` (home page assumes `profile` always exists).
            data: { username }
          }
        });
        if (error) throw error;

        // create profile row immediately; Supabase rules may already do this
        // via a database trigger but it's safe to do it here as well.
        if (signUpData?.user?.id) {
          await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cute-bg flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 text-cute-pink opacity-20 animate-bounce"><Heart size={64} /></div>
      <div className="absolute bottom-20 right-20 text-cute-blue opacity-30 animate-pulse"><Sparkles size={80} /></div>
      <div className="absolute top-40 right-10 text-cute-mint opacity-40 animate-spin-slow"><Heart size={48} /></div>
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-cute p-10 border-4 border-cute-pink relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-cute-pink p-4 rounded-2xl mb-4 shadow-cute transform -rotate-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-cute-dark tracking-tight">
            {isLogin ? 'Welcome Back!' : 'Join the Party!'}
          </h2>
          <p className="text-cute-text mt-2 font-medium">
            {isLogin ? 'Ready for movie night?' : 'Create your cute profile'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-500 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2">
            <span>Oops!</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-cute-dark mb-2 ml-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-cute-bg border-2 border-cute-pink/30 rounded-2xl px-5 py-3 text-cute-dark font-medium focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all"
                placeholder="cooluser123"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-cute-dark mb-2 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cute-bg border-2 border-cute-pink/30 rounded-2xl px-5 py-3 text-cute-dark font-medium focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-cute-dark mb-2 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-cute-bg border-2 border-cute-pink/30 rounded-2xl px-5 py-3 text-cute-dark font-medium focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cute-pink hover:bg-pink-400 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-cute transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 mt-4"
          >
            {loading ? 'Loading...' : isLogin ? 'Let\'s Go!' : 'Sign Me Up!'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cute-pink hover:text-pink-500 font-bold transition-colors"
          >
            {isLogin ? "New here? Create an account ✨" : 'Already have an account? Sign in 💖'}
          </button>
        </div>
      </div>
    </div>
  );
}
