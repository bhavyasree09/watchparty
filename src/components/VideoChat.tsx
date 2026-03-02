
import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, MonitorUp, Sparkles } from 'lucide-react';

export function VideoChat({ roomId }: { roomId: string }) {
  const { members, currentRoom, setSharedScreenStream } = useRoomStore();
  const { profile } = useAuthStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  // store remote streams keyed by user id
  const [remoteStreams, setRemoteStreams] = useState<{[id:string]: MediaStream}>({});
  // keep peer objects in a ref so they persist across renders
  const peersRef = useRef<{[id:string]: any}>({});
  // keep the signalling channel in a ref so it can be reused when emitting
  const signallingRef = useRef<any>(null);
  // track whether the host is currently sharing screen
  const hostSharingRef = useRef(false);

  // cleanup local media when component unmounts
  useEffect(() => {
    // handler for before page unload to cleanup resources
    const handleBeforeUnload = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach((p: any) => {
        if (p && typeof p.destroy === 'function') {
          p.destroy();
        }
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // stop all media tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // destroy all peer connections
      Object.values(peersRef.current).forEach((p: any) => {
        if (p && typeof p.destroy === 'function') {
          p.destroy();
        }
      });
      peersRef.current = {};
      
      // unsubscribe from signalling channel
      if (signallingRef.current) {
        signallingRef.current.unsubscribe();
        signallingRef.current = null;
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // set up signalling channel for WebRTC offers/answers
  useEffect(() => {
    if (!profile || !roomId) return;
    const signalling = supabase.channel(`signaling:${roomId}`);
    signallingRef.current = signalling;

    const handleSignal = ({ payload }: any) => {
      const { from, to, signal } = payload;
      if (to !== profile.id) return;
      let peer = peersRef.current[from];
      if (!peer) {
        // connection doesn't exist yet - create as non-initiator
        peer = createPeer(from, false);
        peersRef.current[from] = peer;
      }
      peer.signal(signal);
    };

    signalling.on('broadcast', { event: 'signal' }, handleSignal);
    signalling.on('broadcast', { event: 'screen-share' }, ({ payload }: any) => {
      const { from, active } = payload;
      if (from === currentRoom?.host_id) {
        hostSharingRef.current = !!active;
        if (!active) {
          setSharedScreenStream(null);
          setRemoteStreams(prev => {
            const copy = { ...prev };
            delete copy[from];
            return copy;
          });
        }
      }
    });
    signalling.subscribe();

    return () => {
      signalling.unsubscribe();
      signallingRef.current = null;
    };
  }, [profile, roomId, stream]);

  // whenever members or stream state change, rebuild peer connections
  useEffect(() => {
    if (!profile) return;

    // destroy existing peers
    Object.values(peersRef.current).forEach((p: any) => {
      if (p && typeof p.destroy === 'function') {
        p.destroy();
      }
    });
    peersRef.current = {};
    setRemoteStreams({});

    // create a peer connection for every other member
    members.forEach((member) => {
      const id = member.user_id;
      if (id === profile.id) return;
      const initiator = profile.id < id; // simple ordering to avoid double-offers
      const peer = createPeer(id, initiator);
      peersRef.current[id] = peer;
    });

    return () => {
      // cleanup peers when effect re-runs or component unmounts
      Object.values(peersRef.current).forEach((p: any) => {
        if (p && typeof p.destroy === 'function') {
          p.destroy();
        }
      });
      peersRef.current = {};
    };

    // helper to make peer instance wired up to signalling
    function createPeer(peerId: string, initiator: boolean) {
      const p: any = new Peer({ initiator, trickle: false, stream });

      p.on('signal', (signal: any) => {
        // broadcast the signal to the other participant
        signallingRef.current?.send({ type: 'broadcast', event: 'signal', payload: { from: profile.id, to: peerId, signal } });
      });

      p.on('stream', (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: remoteStream }));
        // if this stream comes from the room host *and* the host is in
        // screen-share mode, show it in the main player
        if (currentRoom?.host_id === peerId && hostSharingRef.current) {
          setSharedScreenStream(remoteStream);
        }
      });

      p.on('close', () => {
        setRemoteStreams((prev) => {
          const copy = { ...prev };
          delete copy[peerId];
          return copy;
        });
        delete peersRef.current[peerId];
      });

      p.on('error', (err: any) => console.error('peer error', err));

      return p;
    }
  }, [members, profile, roomId, stream, screenSharing]);

  const toggleAudio = async () => {
    if (!stream && !audioEnabled) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
        setStream(newStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        setAudioEnabled(true);
      } catch (err) {
        console.error("Error accessing microphone", err);
      }
    } else if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      } else if (!audioEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.addTrack(audioStream.getAudioTracks()[0]);
          setAudioEnabled(true);
        } catch (err) {
          console.error("Error accessing microphone", err);
        }
      }
    }
  };

  const toggleVideo = async () => {
    if (!stream && !videoEnabled) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioEnabled });
        setStream(newStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        setVideoEnabled(true);
      } catch (err) {
        console.error("Error accessing camera", err);
      }
    } else if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && !screenSharing) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      } else if (!videoEnabled) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.addTrack(videoStream.getVideoTracks()[0]);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          setVideoEnabled(true);
        } catch (err) {
          console.error("Error accessing camera", err);
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        if (stream) {
          const oldVideoTrack = stream.getVideoTracks()[0];
          if (oldVideoTrack) {
            stream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          stream.addTrack(screenStream.getVideoTracks()[0]);
        } else {
          setStream(screenStream);
        }
        
        if (localVideoRef.current) localVideoRef.current.srcObject = stream || screenStream;
        setScreenSharing(true);
        setVideoEnabled(true);
        if (currentRoom?.host_id === profile?.id) {
          setSharedScreenStream(stream || screenStream);
        }
        // notify others that screen share started
        signallingRef.current?.send({ type: 'broadcast', event: 'screen-share', payload: { from: profile?.id, active: true } });
        
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          if (videoEnabled) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
              if (stream) {
                stream.removeTrack(screenStream.getVideoTracks()[0]);
                stream.addTrack(camStream.getVideoTracks()[0]);
              }
            });
          }
        };
      } else {
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          if (stream) stream.removeTrack(videoTrack);
        }
        setScreenSharing(false);
        if (currentRoom?.host_id === profile?.id) {
          setSharedScreenStream(null);
        }
        // notify others that screen share ended
        signallingRef.current?.send({ type: 'broadcast', event: 'screen-share', payload: { from: profile?.id, active: false } });
        
        if (videoEnabled) {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (stream) stream.addTrack(camStream.getVideoTracks()[0]);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.error("Error sharing screen", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans p-5 relative overflow-hidden">
      <div className="absolute top-10 right-10 text-cute-pink opacity-20 animate-pulse"><Sparkles size={64} /></div>
      
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-4 content-start relative z-10">
        <div className="relative aspect-video bg-cute-bg rounded-3xl overflow-hidden border-4 border-cute-lavender shadow-sm group hover:shadow-cute transition-all hover:border-cute-pink">
          {videoEnabled || screenSharing ? (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-cute-lavender/30">
              <img src={profile?.avatar_url} alt="Me" className="w-16 h-16 rounded-full border-4 border-white shadow-sm transform group-hover:scale-110 transition-transform" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold text-cute-dark flex items-center gap-2 shadow-sm border-2 border-cute-lavender">
            {profile?.username} (You) ✨
            {!audioEnabled && <MicOff className="w-3.5 h-3.5 text-red-500" />}
          </div>
        </div>

        {members.filter(m => m.user_id !== profile?.id).map(member => {
          const remoteStream = remoteStreams[member.user_id];
          return (
            <div key={member.user_id} className="relative aspect-video bg-cute-bg rounded-3xl overflow-hidden border-4 border-cute-lavender shadow-sm group hover:shadow-cute transition-all hover:border-cute-pink">
              {remoteStream ? (
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => { if (el) el.srcObject = remoteStream; }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-cute-lavender/30">
                  <img src={member.profiles?.avatar_url} alt={member.profiles?.username} className="w-16 h-16 rounded-full border-4 border-white shadow-sm transform group-hover:scale-110 transition-transform" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold text-cute-dark flex items-center gap-2 shadow-sm border-2 border-cute-lavender">
                {member.profiles?.username} 💖
                <MicOff className="w-3.5 h-3.5 text-red-500" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-4 bg-cute-bg p-4 rounded-3xl border-4 border-cute-lavender shadow-sm relative z-10">
        <button 
          onClick={toggleAudio}
          className={'p-4 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1 border-2 ' + (audioEnabled ? 'bg-white hover:bg-cute-lavender text-cute-dark border-cute-lavender' : 'bg-red-100 hover:bg-red-200 text-red-600 border-red-300')}
        >
          {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button 
          onClick={toggleVideo}
          className={'p-4 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1 border-2 ' + (videoEnabled && !screenSharing ? 'bg-white hover:bg-cute-lavender text-cute-dark border-cute-lavender' : 'bg-red-100 hover:bg-red-200 text-red-600 border-red-300')}
        >
          {videoEnabled && !screenSharing ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
        <button 
          onClick={toggleScreenShare}
          className={'p-4 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1 border-2 ' + (screenSharing ? 'bg-cute-pink hover:bg-pink-400 text-white border-pink-400 shadow-cute' : 'bg-white hover:bg-cute-lavender text-cute-dark border-cute-lavender')}
        >
          <MonitorUp className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
