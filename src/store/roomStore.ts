import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];
type Message = Database['public']['Tables']['messages']['Row'] & { profiles: any };
type MediaQueueItem = Database['public']['Tables']['media_queue']['Row'] & { profiles: any };

interface RoomState {
  currentRoom: Room | null;
  messages: Message[];
  mediaQueue: MediaQueueItem[];
  members: any[];
  sharedScreenStream: MediaStream | null;
  setSharedScreenStream: (stream: MediaStream | null) => void;
  setCurrentRoom: (room: Room | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setMediaQueue: (queue: MediaQueueItem[]) => void;
  setMembers: (members: any[]) => void;
  updateRoomState: (updates: Partial<Room>) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  messages: [],
  mediaQueue: [],
  members: [],
  sharedScreenStream: null,
  setSharedScreenStream: (stream) => set({ sharedScreenStream: stream }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMediaQueue: (mediaQueue) => set({ mediaQueue }),
  setMembers: (members) => set({ members }),
  updateRoomState: (updates) => set((state) => ({ 
    currentRoom: state.currentRoom ? { ...state.currentRoom, ...updates } : null 
  })),
}));
