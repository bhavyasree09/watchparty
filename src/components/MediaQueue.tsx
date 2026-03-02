
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { Plus, Play, Trash2, Heart, Sparkles } from 'lucide-react';

export function MediaQueue({ roomId, isHost }: { roomId: string, isHost: boolean }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const { profile } = useAuthStore();
  const { mediaQueue, setMediaQueue, currentRoom } = useRoomStore();

  useEffect(() => {
    fetchQueue();

    const subscription = supabase
      .channel('queue:' + roomId)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media_queue',
        filter: 'room_id=eq.' + roomId
      }, fetchQueue)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('media_queue')
      .select('*, profiles(username)')
      .eq('room_id', roomId)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (data) setMediaQueue(data);
  };

  const addToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim() || !profile) return;
    
    setAdding(true);
    await supabase.from('media_queue').insert({
      room_id: roomId,
      video_url: url,
      title,
      added_by: profile.id
    });
    
    setUrl('');
    setTitle('');
    setAdding(false);
  };

  const playVideo = async (item: any) => {
    if (!isHost) return;
    
    await supabase.from('rooms').update({
      current_video_url: item.video_url,
      playback_time: 0,
      is_playing: true
    }).eq('id', roomId);
    
    await supabase.from('media_queue').delete().eq('id', item.id);
  };

  const removeVideo = async (id: string) => {
    if (!isHost) return;
    await supabase.from('media_queue').delete().eq('id', id);
  };

  const voteVideo = async (item: any) => {
    await supabase.from('media_queue').update({
      votes: (item.votes || 0) + 1
    }).eq('id', item.id);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans p-5">
      <form onSubmit={addToQueue} className="mb-8 space-y-4 bg-cute-bg p-5 rounded-3xl border-4 border-cute-lavender shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-cute-pink opacity-20"><Sparkles size={64} /></div>
        <h3 className="font-extrabold text-cute-dark text-lg mb-3 flex items-center gap-2 relative z-10">
          Add to Queue <Sparkles className="w-5 h-5 text-cute-pink" />
        </h3>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cute Video Title"
          className="w-full bg-white border-2 border-cute-lavender rounded-2xl px-4 py-3 text-sm font-bold text-cute-dark focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all relative z-10"
        />
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube/Vimeo URL"
          className="w-full bg-white border-2 border-cute-lavender rounded-2xl px-4 py-3 text-sm font-bold text-cute-dark focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all relative z-10"
        />
        <button
          type="submit"
          disabled={adding || !url || !title}
          className="w-full bg-cute-pink hover:bg-pink-400 text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-cute transform hover:-translate-y-1 disabled:hover:translate-y-0 relative z-10"
        >
          <Plus className="w-5 h-5" />
          Add Video
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <h3 className="font-extrabold text-cute-dark text-lg sticky top-0 bg-white py-3 z-20 border-b-4 border-cute-lavender mb-4">
          Up Next 🍿
        </h3>
        
        {mediaQueue.length === 0 ? (
          <div className="text-center text-cute-text py-10 font-bold bg-cute-bg rounded-3xl border-4 border-dashed border-cute-lavender">
            <div className="text-4xl mb-3">👻</div>
            Queue is empty.<br/>Add a video above!
          </div>
        ) : (
          mediaQueue.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border-4 border-cute-lavender hover:border-cute-pink transition-all shadow-sm hover:shadow-cute group transform hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-cute-dark line-clamp-2 pr-3">{item.title}</h4>
                <button 
                  onClick={() => voteVideo(item)}
                  className="flex items-center gap-1.5 text-cute-pink hover:text-white bg-cute-bg hover:bg-cute-pink px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 border-cute-pink shadow-sm"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {item.votes || 0}
                </button>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-cute-bg">
                <span className="text-xs font-bold text-cute-text bg-cute-bg px-2 py-1 rounded-lg">
                  Added by {item.profiles?.username}
                </span>
                
                {isHost && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => playVideo(item)}
                      className="p-2 bg-cute-mint hover:bg-green-400 text-green-900 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"
                      title="Play Now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeVideo(item.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-500 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
