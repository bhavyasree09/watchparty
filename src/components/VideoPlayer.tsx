
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '../lib/supabase';
import { useRoomStore } from '../store/roomStore';
import { Play, Pause, Maximize, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface VideoPlayerProps {
  roomId: string;
  isHost: boolean;
}

export function VideoPlayer({ roomId, isHost }: VideoPlayerProps) {
  const { currentRoom, updateRoomState, sharedScreenStream } = useRoomStore();
  // the library doesn't ship with usable TypeScript types for the player
  // instance, so we'll treat the ref as `any`. a more thorough solution is
  // to provide dedicated declaration files under `src/types`.
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!currentRoom) return;
    
    if (currentRoom.is_playing !== playing && !seeking) {
      setPlaying(currentRoom.is_playing || false);
    }

    if (playerRef.current && !seeking && currentRoom.playback_time !== null) {
      const currentTime = playerRef.current.getCurrentTime();
      if (Math.abs(currentTime - currentRoom.playback_time) > 2) {
        playerRef.current.seekTo(currentRoom.playback_time);
      }
    }
  }, [currentRoom?.is_playing, currentRoom?.playback_time]);

  const handlePlayPause = async () => {
    if (!isHost) return;
    
    const newPlaying = !playing;
    setPlaying(newPlaying);
    
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    
    await supabase
      .from('rooms')
      .update({ 
        is_playing: newPlaying,
        playback_time: currentTime
      })
      .eq('id', roomId);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = async (e: React.MouseEvent<HTMLInputElement>) => {
    if (!isHost) return;
    
    setSeeking(false);
    const newTime = parseFloat((e.target as HTMLInputElement).value) * duration;
    playerRef.current?.seekTo(newTime);
    
    await supabase
      .from('rooms')
      .update({ 
        playback_time: newTime
      })
      .eq('id', roomId);
  };

  const handleSeekMouseDown = () => {
    if (!isHost) return;
    setSeeking(true);
  };

  // progress callback receives a library-specific object; we just care
  // about the properties we read, so use any to avoid the ReactEventHandler
  // conflict described by the TS errors.
  const handleProgress = (state: any) => {
    if (!seeking) {
      setPlayed(state.played);
    }
    
    if (isHost && playing && Math.floor(state.playedSeconds) % 5 === 0) {
      supabase
        .from('rooms')
        .update({ playback_time: state.playedSeconds })
        .eq('id', roomId)
        .then();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  // if someone is sharing their screen, display that stream instead
  if (sharedScreenStream) {
    return (
      <div className="relative flex-1 bg-cute-dark flex items-center justify-center group font-sans">
        <video
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          ref={(el) => { if (el) el.srcObject = sharedScreenStream; }}
        />
      </div>
    );
  }

  if (!currentRoom?.current_video_url) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-cute-bg text-cute-text p-10 text-center font-sans relative overflow-hidden">
        <div className="absolute top-10 left-10 text-cute-pink opacity-20 animate-bounce"><Sparkles size={64} /></div>
        <div className="absolute bottom-20 right-20 text-cute-blue opacity-30 animate-pulse"><Sparkles size={80} /></div>
        
        <div className="bg-white p-8 rounded-full mb-6 shadow-cute border-4 border-cute-pink transform -rotate-6 relative z-10">
          <Play className="w-16 h-16 text-cute-pink" />
        </div>
        <h3 className="text-3xl font-extrabold text-cute-dark mb-4 relative z-10">No video playing 🥺</h3>
        <p className="text-lg font-medium bg-white px-6 py-3 rounded-2xl border-2 border-cute-lavender shadow-sm relative z-10">
          Add a cute video to the queue to start watching together! 🍿
        </p>
      </div>
    );
  }

  // ReactPlayer's supplied type definitions are incomplete; we
  // bypass them entirely by treating the component as `any`. this keeps the
  // rest of the file typed normally.
  const Player: any = ReactPlayer;

  return (
    <div 
      className="relative flex-1 bg-cute-dark flex items-center justify-center group font-sans"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div className="absolute inset-0 pointer-events-none">
        <Player
          ref={playerRef}
          url={currentRoom.current_video_url}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          onProgress={handleProgress as any}
          onDuration={setDuration as any}
          onPlay={() => !isHost && setPlaying(true)}
          onPause={() => !isHost && setPlaying(false)}
          style={{ pointerEvents: 'none' }}
          config={{
            youtube: {
              // TS doesn't know about the wide variety of `playerVars` props,
              // so cast to any to avoid errors. the values are passed through to
              // the underlying youtube iframe API unchanged.
              playerVars: { showinfo: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0 } as any
            }
          } as any}
        />
      </div>

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-cute-dark/90 via-transparent to-transparent flex flex-col justify-end p-6 transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="flex items-center gap-5 mb-6 bg-white/10 p-3 rounded-3xl backdrop-blur-sm border-2 border-white/20">
          <span className="text-white text-sm font-bold w-14 text-right bg-cute-dark/50 px-2 py-1 rounded-xl">
            {formatTime(played * duration)}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step="any"
            value={played}
            onMouseDown={handleSeekMouseDown}
            onChange={handleSeekChange}
            onMouseUp={handleSeekMouseUp}
            disabled={!isHost}
            className={`flex-1 h-3 rounded-full appearance-none bg-cute-lavender/50 border-2 border-white/30 ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
            style={{
              backgroundImage: `linear-gradient(to right, #ffb6c1 ${played * 100}%, transparent ${played * 100}%)`
            }}
          />
          <span className="text-white text-sm font-bold w-14 bg-cute-dark/50 px-2 py-1 rounded-xl">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-white/10 p-4 rounded-3xl backdrop-blur-sm border-2 border-white/20">
          <div className="flex items-center gap-6">
            <button 
              onClick={handlePlayPause}
              disabled={!isHost}
              className={`text-white hover:text-cute-pink bg-cute-dark/50 hover:bg-white p-3 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1 ${!isHost && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:bg-cute-dark/50 hover:text-white'}`}
            >
              {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            
            <div className="flex items-center gap-3 group/volume bg-cute-dark/50 p-2 rounded-2xl border-2 border-transparent hover:border-white/30 transition-all">
              <button 
                onClick={() => setMuted(!muted)}
                className="text-white hover:text-cute-pink transition-colors p-1"
              >
                {muted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setMuted(false);
                }}
                className="w-24 h-2 rounded-full appearance-none bg-cute-lavender/50 cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity border border-white/30"
                style={{
                  backgroundImage: `linear-gradient(to right, #ffb6c1 ${(muted ? 0 : volume) * 100}%, transparent ${(muted ? 0 : volume) * 100}%)`
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            {!isHost && (
              <span className="text-xs font-bold text-cute-dark bg-cute-pink px-4 py-2 rounded-2xl shadow-cute border-2 border-white animate-pulse">
                Only host can control playback ✨
              </span>
            )}
            <button 
              onClick={() => {
                const elem = document.documentElement;
                if (!document.fullscreenElement) {
                  elem.requestFullscreen().catch(err => console.log(err));
                } else {
                  document.exitFullscreen();
                }
              }}
              className="text-white hover:text-cute-pink bg-cute-dark/50 hover:bg-white p-3 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
