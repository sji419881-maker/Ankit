import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Upload, 
  Music, 
  Search, 
  Volume2, 
  VolumeX,
  Plus,
  X,
  Loader2,
  Home,
  Library,
  Heart,
  ListMusic,
  MoreHorizontal,
  Shuffle,
  Repeat,
  LayoutGrid,
  List,
  Clock,
  User,
  Disc,
  Download
} from 'lucide-react';

interface Track {
  id: number;
  title: string;
  artist: string;
  filename: string;
  upload_date: string;
  is_liked?: boolean;
}

interface Playlist {
  id: number;
  name: string;
  description: string;
}

type View = 'home' | 'search' | 'library' | 'liked' | 'playlist';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTracks(), fetchPlaylists()]);
    setIsLoading(false);
  };

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/tracks');
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists');
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const fetchLikedSongs = async () => {
    try {
      const response = await fetch('/api/liked');
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Failed to fetch liked songs:', error);
    }
  };

  const fetchPlaylistTracks = async (id: number) => {
    try {
      const response = await fetch(`/api/playlists/${id}/tracks`);
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Failed to fetch playlist tracks:', error);
    }
  };

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current || currentTrackIndex === null) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const toggleLike = async (track: Track) => {
    const method = track.is_liked ? 'DELETE' : 'POST';
    try {
      const response = await fetch(`/api/liked/${track.id}`, { method });
      if (response.ok) {
        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, is_liked: !t.is_liked } : t));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTrackEnd = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = currentTrackIndex === null ? 0 : (currentTrackIndex + 1) % tracks.length;
    }
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex === null ? 0 : (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const downloadTrack = (track: Track) => {
    const link = document.createElement('a');
    link.href = `/uploads/${track.filename}`;
    link.download = `${track.artist} - ${track.title}${track.filename.substring(track.filename.lastIndexOf('.'))}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createPlaylist = async () => {
    const name = prompt("Playlist Name");
    if (!name) return;
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: "" })
      });
      if (response.ok) {
        fetchPlaylists();
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  const addToPlaylist = async (playlistId: number, trackId: number) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      });
      if (response.ok) {
        alert("Added to playlist!");
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('audio') as File;
    
    if (!file || file.size === 0) {
      alert('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        await fetchTracks();
        setIsUploading(false);
        (e.target as HTMLFormElement).reset();
      } else {
        const err = await response.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTracks = tracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-black flex flex-col gap-2 p-2 shrink-0">
        <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
          <button 
            onClick={() => { setCurrentView('home'); fetchTracks(); }}
            className={`flex items-center gap-4 px-2 py-2 transition-colors hover:text-white ${currentView === 'home' ? 'text-white' : 'text-zinc-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="font-bold">Home</span>
          </button>
          <button 
            onClick={() => setCurrentView('search')}
            className={`flex items-center gap-4 px-2 py-2 transition-colors hover:text-white ${currentView === 'search' ? 'text-white' : 'text-zinc-400'}`}
          >
            <Search className="w-6 h-6" />
            <span className="font-bold">Search</span>
          </button>
        </div>

        <div className="flex-1 bg-[#121212] rounded-lg p-2 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between text-zinc-400">
            <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
              <Library className="w-6 h-6" />
              <span className="font-bold">Your Library</span>
            </div>
            <button onClick={createPlaylist} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto px-2">
            <button 
              onClick={() => { setCurrentView('liked'); fetchLikedSongs(); }}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-white/5 ${currentView === 'liked' ? 'bg-white/10' : ''}`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-indigo-300 rounded flex items-center justify-center">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">Liked Songs</span>
                <span className="text-xs text-zinc-400">Playlist</span>
              </div>
            </button>

            {playlists.map(playlist => (
              <button 
                key={playlist.id}
                onClick={() => { setCurrentView('playlist'); setActivePlaylistId(playlist.id); fetchPlaylistTracks(playlist.id); }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-white/5 ${currentView === 'playlist' && activePlaylistId === playlist.id ? 'bg-white/10' : ''}`}
              >
                <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center">
                  <ListMusic className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium truncate w-32 text-left">{playlist.name}</span>
                  <span className="text-xs text-zinc-400">Playlist</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#121212] m-2 ml-0 rounded-lg overflow-y-auto relative flex flex-col">
        {/* Header */}
        <header className="sticky top-0 bg-[#121212]/80 backdrop-blur-md p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {currentView === 'search' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="What do you want to listen to?"
                  className="bg-[#242424] rounded-full py-2 pl-10 pr-4 w-80 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform active:scale-95"
          >
            Upload
          </button>
        </header>

        {/* Content Area */}
        <div className="p-6 flex-1">
          {currentView === 'home' && (
            <div className="space-y-8">
              <h1 className="text-3xl font-bold">Good afternoon</h1>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 hover:bg-white/10 transition-colors rounded overflow-hidden flex items-center gap-4 cursor-pointer group">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-700 to-indigo-300 flex items-center justify-center shrink-0 shadow-lg">
                    <Heart className="w-8 h-8 fill-white text-white" />
                  </div>
                  <span className="font-bold">Liked Songs</span>
                  <button className="ml-auto mr-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl translate-y-2 group-hover:translate-y-0">
                    <Play className="w-6 h-6 fill-black text-black" />
                  </button>
                </div>
                {playlists.slice(0, 5).map(p => (
                  <div key={p.id} className="bg-white/5 hover:bg-white/10 transition-colors rounded overflow-hidden flex items-center gap-4 cursor-pointer group">
                    <div className="w-20 h-20 bg-zinc-800 flex items-center justify-center shrink-0 shadow-lg">
                      <Music className="w-8 h-8 text-zinc-400" />
                    </div>
                    <span className="font-bold truncate">{p.name}</span>
                    <button className="ml-auto mr-4 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl translate-y-2 group-hover:translate-y-0">
                      <Play className="w-6 h-6 fill-black text-black" />
                    </button>
                  </div>
                ))}
              </div>

              <section>
                <h2 className="text-2xl font-bold mb-4">Made For You</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {tracks.slice(0, 10).map((track, idx) => (
                    <div 
                      key={track.id} 
                      onClick={() => playTrack(idx)}
                      className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="relative aspect-square mb-4 bg-zinc-800 rounded-md shadow-2xl flex items-center justify-center">
                        <Music className="w-12 h-12 text-zinc-600" />
                        <button className="absolute bottom-2 right-2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl translate-y-2 group-hover:translate-y-0 hover:scale-105">
                          <Play className="w-6 h-6 fill-black text-black" />
                        </button>
                      </div>
                      <h3 className="font-bold truncate">{track.title}</h3>
                      <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {(currentView === 'liked' || currentView === 'playlist' || currentView === 'search') && (
            <div className="flex flex-col gap-6">
              <div className="flex items-end gap-6">
                <div className={`w-60 h-60 shadow-2xl flex items-center justify-center rounded ${currentView === 'liked' ? 'bg-gradient-to-br from-indigo-700 to-indigo-300' : 'bg-zinc-800'}`}>
                  {currentView === 'liked' ? <Heart className="w-24 h-24 fill-white text-white" /> : <Music className="w-24 h-24 text-zinc-600" />}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold uppercase">Playlist</span>
                  <h1 className="text-8xl font-black">{currentView === 'liked' ? 'Liked Songs' : currentView === 'playlist' ? playlists.find(p => p.id === activePlaylistId)?.name : 'Search Results'}</h1>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">Ankit</span>
                    <span className="text-zinc-400">• {filteredTracks.length} songs</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="grid grid-cols-[16px_1fr_1fr_40px] gap-4 px-4 py-2 text-zinc-400 border-b border-white/10 text-sm mb-4">
                  <span>#</span>
                  <span>Title</span>
                  <span>Artist</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  {filteredTracks.map((track, index) => (
                    <div 
                      key={track.id}
                      onClick={() => playTrack(tracks.indexOf(track))}
                      className="grid grid-cols-[16px_1fr_1fr_40px] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group items-center cursor-pointer"
                    >
                      <span className="text-zinc-400 group-hover:hidden">{index + 1}</span>
                      <Play className="w-4 h-4 hidden group-hover:block fill-white" />
                      <div className="flex flex-col">
                        <span className={`font-medium ${currentTrack?.id === track.id ? 'text-emerald-500' : 'text-white'}`}>{track.title}</span>
                      </div>
                      <span className="text-zinc-400">{track.artist}</span>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                          className={`${track.is_liked ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'} transition-colors`}
                        >
                          <Heart className={`w-4 h-4 ${track.is_liked ? 'fill-emerald-500' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadTrack(track); }}
                          className="text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Player Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-black border-t border-white/5 px-4 flex items-center justify-between z-50">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3">
          {currentTrack ? (
            <>
              <div className="w-14 h-14 bg-zinc-800 rounded flex items-center justify-center shrink-0 shadow-lg">
                <Music className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold truncate hover:underline cursor-pointer">{currentTrack.title}</span>
                <span className="text-xs text-zinc-400 truncate hover:underline cursor-pointer hover:text-white">{currentTrack.artist}</span>
              </div>
              <button 
                onClick={() => toggleLike(currentTrack)}
                className={`ml-2 ${currentTrack.is_liked ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'} transition-colors`}
              >
                <Heart className={`w-5 h-5 ${currentTrack.is_liked ? 'fill-emerald-500' : ''}`} />
              </button>
              <button 
                onClick={() => downloadTrack(currentTrack)}
                className="ml-2 text-zinc-400 hover:text-white transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-900 rounded" />
              <div className="flex flex-col gap-2">
                <div className="w-32 h-3 bg-zinc-900 rounded" />
                <div className="w-20 h-2 bg-zinc-900 rounded" />
              </div>
            </div>
          )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 w-1/3 max-w-xl">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`transition-colors ${isShuffle ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={prevTrack} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button 
              onClick={() => setIsRepeat(!isRepeat)}
              className={`transition-colors ${isRepeat ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>
          
          <div className="w-full flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 w-8 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
              <input 
                type="range" 
                min="0" 
                max={duration || 0} 
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute top-0 left-0 h-full bg-white group-hover:bg-emerald-500 transition-colors"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="w-24 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute top-0 left-0 h-full bg-white group-hover:bg-emerald-500 transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </footer>

      {/* Hidden File Input */}
      <form onSubmit={handleUpload} className="hidden">
        <input 
          type="file" 
          name="audio" 
          accept="audio/*" 
          ref={fileInputRef} 
          onChange={(e) => {
            if (e.target.files?.[0]) {
              const title = prompt("Enter track title", e.target.files[0].name.replace(/\.[^/.]+$/, ""));
              const artist = prompt("Enter artist name", "Unknown Artist");
              
              const form = e.target.form!;
              const titleInput = document.createElement('input');
              titleInput.type = 'hidden';
              titleInput.name = 'title';
              titleInput.value = title || '';
              
              const artistInput = document.createElement('input');
              artistInput.type = 'hidden';
              artistInput.name = 'artist';
              artistInput.value = artist || '';
              
              form.appendChild(titleInput);
              form.appendChild(artistInput);
              
              const event = new Event('submit', { cancelable: true, bubbles: true });
              form.dispatchEvent(event);
            }
          }}
        />
      </form>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack ? `/uploads/${currentTrack.filename}` : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        autoPlay={isPlaying}
      />

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <span className="text-xl font-bold">Uploading to Spotify...</span>
          </div>
        </div>
      )}
    </div>
  );
}
