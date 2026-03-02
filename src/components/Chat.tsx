import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { Send, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export function Chat({ roomId }: { roomId: string }) {
  const [newMessage, setNewMessage] = useState('');
  const { profile } = useAuthStore();
  const { messages, setMessages, addMessage } = useRoomStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();
          
        addMessage({ ...payload.new, profiles: profileData } as any);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const content = newMessage;
    setNewMessage('');

    await supabase.from('messages').insert({
      room_id: roomId,
      user_id: profile.id,
      content
    });
  };

  const sendEmoji = async (emoji: string) => {
    if (!profile) return;
    await supabase.from('messages').insert({
      room_id: roomId,
      user_id: profile.id,
      content: emoji
    });
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-cute-bg/50">
        {messages.map((msg) => {
          const isMe = msg.user_id === profile?.id;
          const isEmojiOnly = /^\p{Emoji}+$/u.test(msg.content.trim());
          
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <img 
                src={msg.profiles?.avatar_url} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
              />
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  <span className="text-xs font-bold text-cute-dark">
                    {msg.profiles?.username}
                  </span>
                  <span className="text-[10px] font-bold text-cute-text/60">
                    {format(new Date(msg.created_at!), 'HH:mm')}
                  </span>
                </div>
                <div className={`${
                  isEmojiOnly 
                    ? 'text-5xl bg-transparent drop-shadow-md transform hover:scale-110 transition-transform cursor-default' 
                    : `px-4 py-3 rounded-3xl text-sm font-bold shadow-sm border-2 ${
                        isMe 
                          ? 'bg-cute-pink text-white rounded-tr-none border-pink-400' 
                          : 'bg-white text-cute-dark rounded-tl-none border-cute-lavender'
                      }`
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t-4 border-cute-lavender">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
          {['😂', '🥺', '😍', '💖', '✨', '🍿', '🎉', '👻'].map(emoji => (
            <button 
              key={emoji}
              onClick={() => sendEmoji(emoji)}
              className="hover:bg-cute-bg p-2 rounded-2xl text-2xl transition-all hover:scale-110 active:scale-95 flex-shrink-0 border-2 border-transparent hover:border-cute-lavender"
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something cute..."
            className="flex-1 bg-cute-bg border-2 border-cute-lavender rounded-full px-5 py-3 text-sm font-bold text-cute-dark focus:outline-none focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/20 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-cute-pink hover:bg-pink-400 text-white p-3 rounded-full disabled:opacity-50 transition-all shadow-cute transform hover:-translate-y-1 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
