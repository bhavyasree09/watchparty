import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Plus, Users, Play, Sparkles, Heart } from 'lucide-react';

export function Home() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    
    const subscription = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      // specify the fk constraint name to avoid ambiguity with room_members relation
      .select('*, profiles!rooms_host_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('fetchRooms error', error);
    }
    if (data) setRooms(data);
    setLoading(false);
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      return;
    }

    if (!profile) {
      console.warn('Cannot create room: user profile not loaded');
      return;
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: newRoomName, host_id: profile.id }])
      .select()
      .single();

    console.log('createRoom result', { data, error });

    if (error) {
      console.error('failed to create room', error);
    }

    if (data) {
      // update local list immediately so the room shows on the home page
      setRooms((prev) => [data, ...prev]);
      navigate(`/room/${data.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-8 rounded-3xl shadow-cute border-4 border-cute-pink relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-cute-pink opacity-20"><Heart size={120} /></div>
        
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-cute-dark mb-3 flex items-center gap-3">
            Virtual Lobby <Sparkles className="text-cute-pink" />
          </h2>
          <p className="text-cute-text font-medium text-lg">Join an active room or create your own movie night!</p>
        </div>
        
        <form onSubmit={createRoom} className="flex gap-3 w-full md:w-auto relative z-10">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="My Cute Room..."
            className="bg-cute-bg border-2 border-cute-pink/30 rounded-2xl px-5 py-3 text-cute-dark font-bold focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 flex-1 shadow-inner"
          />
          <button
            type="submit"
            disabled={!newRoomName.trim() || !profile}
            className="bg-cute-pink hover:bg-pink-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-cute transform hover:-translate-y-1 disabled:hover:translate-y-0"
          >
            <Plus className="w-6 h-6" />
            Create
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cute-pink"></div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-4 border-dashed border-cute-lavender shadow-sm">
          <div className="bg-cute-bg w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-cute-pink" />
          </div>
          <h3 className="text-2xl font-bold text-cute-dark mb-3">No active rooms</h3>
          <p className="text-cute-text font-medium text-lg">Be the first to create a room and invite your friends! 🍿</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-3xl p-6 border-4 border-cute-lavender hover:border-cute-pink transition-all shadow-sm hover:shadow-cute group transform hover:-translate-y-2">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-cute-dark truncate pr-4">{room.name}</h3>
                <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                  room.is_playing 
                    ? 'bg-cute-mint text-green-800 border-2 border-green-200' 
                    : 'bg-cute-yellow text-yellow-800 border-2 border-yellow-200'
                }`}>
                  {room.is_playing ? '▶ Playing' : '⏳ Waiting'}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mb-8 bg-cute-bg p-3 rounded-2xl">
                <img src={room.profiles?.avatar_url} alt="Host" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                <div className="text-sm">
                  <p className="text-cute-text font-medium text-xs uppercase tracking-wider">Hosted by</p>
                  <p className="font-bold text-cute-dark text-base">{room.profiles?.username}</p>
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/room/${room.id}`)}
                className="w-full bg-cute-lavender group-hover:bg-cute-pink text-cute-dark group-hover:text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm group-hover:shadow-cute"
              >
                <Play className="w-5 h-5" />
                Join Room
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
