import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { VideoPlayer } from '../components/VideoPlayer';
import { Chat } from '../components/Chat';
import { MediaQueue } from '../components/MediaQueue';
import { VideoChat } from '../components/VideoChat';
import { Users, MessageSquare, ListVideo, Video, LogOut, Sparkles } from 'lucide-react';

export function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { currentRoom, setCurrentRoom, setMembers } = useRoomStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'video'>('chat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !profile) return;

    const joinRoom = async () => {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*, profiles!rooms_host_id_fkey(username, avatar_url)')
        .eq('id', id)
        .single();

      if (error || !room) {
        navigate('/');
        return;
      }

      setCurrentRoom(room);

      await supabase.from('room_members').upsert({
        room_id: id,
        user_id: profile.id
      });

      fetchMembers();
      setLoading(false);
    };

    joinRoom();

    const roomSub = supabase
      .channel(`room:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, 
        (payload) => setCurrentRoom(payload.new as any)
      )
      .subscribe();

    const membersSub = supabase
      .channel(`members:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` }, 
        fetchMembers
      )
      .subscribe();

    return () => {
      supabase.from('room_members').delete().match({ room_id: id, user_id: profile.id }).then();
      roomSub.unsubscribe();
      membersSub.unsubscribe();
      setCurrentRoom(null);
    };
  }, [id, profile]);

  const fetchMembers = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('room_members')
      .select('*, profiles(username, avatar_url)')
      .eq('room_id', id);
    
    if (data) setMembers(data);
  };

  const handleEndRoom = async () => {
    if (!id || !currentRoom || currentRoom.host_id !== profile?.id) return;
    
    if (window.confirm('Are you sure you want to end this cute room for everyone? 🥺')) {
      await supabase.from('rooms').delete().eq('id', id);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cute-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cute-pink"></div>
      </div>
    );
  }

  const isHost = currentRoom?.host_id === profile?.id;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden font-sans bg-cute-bg p-4 gap-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl shadow-cute border-4 border-cute-pink overflow-hidden">
        {/* Header */}
        <div className="bg-cute-bg border-b-4 border-cute-pink p-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-cute-lavender">
              <Sparkles className="w-8 h-8 text-cute-pink" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-cute-dark truncate">{currentRoom?.name}</h2>
              <div className="flex items-center gap-2 text-sm font-bold text-cute-text mt-1 bg-white px-3 py-1 rounded-full border-2 border-cute-lavender inline-flex shadow-sm">
                <Users className="w-4 h-4 text-cute-pink" />
                <span>{useRoomStore.getState().members.length} watching</span>
              </div>
            </div>
          </div>
          
          {isHost && (
            <button 
              onClick={handleEndRoom}
              className="bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300 px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"
            >
              <LogOut className="w-5 h-5" />
              End Room
            </button>
          )}
        </div>

        {/* Video Player */}
        <div className="flex-1 relative flex flex-col bg-cute-dark">
          <VideoPlayer roomId={id!} isHost={isHost} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 xl:w-96 bg-white rounded-3xl shadow-cute border-4 border-cute-lavender flex flex-col h-[50vh] lg:h-auto overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b-4 border-cute-lavender bg-cute-bg p-2 gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-2xl transition-all font-bold ${
              activeTab === 'chat' ? 'bg-cute-pink text-white shadow-cute transform -translate-y-1' : 'bg-white text-cute-text border-2 border-cute-lavender hover:bg-cute-lavender/50'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-2xl transition-all font-bold ${
              activeTab === 'queue' ? 'bg-cute-pink text-white shadow-cute transform -translate-y-1' : 'bg-white text-cute-text border-2 border-cute-lavender hover:bg-cute-lavender/50'
            }`}
          >
            <ListVideo className="w-5 h-5" />
            <span>Queue</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-2xl transition-all font-bold ${
              activeTab === 'video' ? 'bg-cute-pink text-white shadow-cute transform -translate-y-1' : 'bg-white text-cute-text border-2 border-cute-lavender hover:bg-cute-lavender/50'
            }`}
          >
            <Video className="w-5 h-5" />
            <span>Call</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative bg-white">
          <div className={`absolute inset-0 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            <Chat roomId={id!} />
          </div>
          <div className={`absolute inset-0 ${activeTab === 'queue' ? 'block' : 'hidden'}`}>
            <MediaQueue roomId={id!} isHost={isHost} />
          </div>
          <div className={`absolute inset-0 ${activeTab === 'video' ? 'block' : 'hidden'}`}>
            <VideoChat roomId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
}
