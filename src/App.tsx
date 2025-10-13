import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2, Settings, Download, Upload, X } from 'lucide-react';
import './index.css';

export default function KokoroTTS() {
  // Text input state
  const [text, setText] = useState('');

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // TTS configuration state
  const [serverUrl, setServerUrl] = useState('http://localhost:8880');
  const [voice, setVoice] = useState('af_sky');
  const [speed, setSpeed] = useState(1.0);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  // Refs to store audio and file element and blob URL
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef =  useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Common Kokoro TTS voices
  const voices = [
    { id: 'af_sky', name: 'Sky (Female)'},
    { id: 'af_bella', name: 'Bella (Female)'},
    { id: 'af_sarah', name: 'Sarah (Female)'},
    { id: 'am_adam', name: 'Adam (Male)'},
    { id: 'am_michael', name: 'Michael (Male)'},
    { id: 'bf_emma', name: 'Emma (British Female)'},
    { id: 'bm_george', name: 'George (British Male)'},
  ];

  //Cleanup audio blob URL on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    }
  }, []);

  // Main function to generate speech from text
  const generateSpeech = async () => {
    // Validate that text is not empty
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Clean up previous audio to free memory
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Call kokoro TTS API with text and config
      const response = await fetch(`${serverUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "kokoro",
          input: text,
          voice: voice,
          response_format: "wav",
          speed: speed,
        }),
      });

      //Check if request was successful
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Convert response to blob and create object URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // Create new audio element and setup event listeners
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Update duration when audio metadata is loaded
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      // Update current time as audio plays
      audio.addEventListener('timeupdate',  () => {
        setCurrentTime(audio.currentTime);
      });

      // Reset playback state when audio finishes playing
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      // Handle audio playback errors
      audio.addEventListener('error', () => {
        setError('Error playing audio');
        setIsPlaying(false);
      });

      // Automatically start playing the generated audio
      await audio.play();
      setIsPlaying(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between play and pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // stop audio and reset to beginning
  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  //Handle seeking to different position in audio
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Download the generated audio file
  const downloadAudio = () => {
    if (!audioUrlRef.current) return;
    const a = document.createElement('a');
    a.href = audioUrlRef.current;
    a.download = 'speech.wav';
    a.click();
  };

  // Format seconds to MM:SS display format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Volume2 className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-800">Kokoro TTS</h1>
          </div>
          <p className="text-gray-600">Convert text to natural speech</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here..."
              className="w-full h-40 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-gray-800" />
            <div className="text-right text-sm text-gray-500 mt-1">
              {text.length} characters
            </div>
          </div>

          {/* Error Message*/}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounder-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={generateSpeech}
              disabled={isLoading || !text.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ): (
                  <>
                  <Volume2 className="w-5 h-5" />
                  </>
                )}
              </button>
              <button onClick={() => setShowSettings(!showSettings)}
                className="p-3 border-2 border-gray-200 hover:border-purple-500 rounded-lg transition-colors"
                title="Settings">
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-40 rounded-lg border-2 border-gray-200">
              <h3 className="font-semibold text-gray-700  mb-4">Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server URL
                </label>
                <input 
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-gray-800"
                  placeholder="http://localhost:8000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice
                </label>
                <select
                  value={voice}
                  title='voices'
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-gray-800">
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speed: {speed.toFixed(1)}x
                </label>
                <input 
                  type="range"
                  title='speed'
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Audio Player */}
          {audioRef.current && (
            <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-purple-600" />
                  ):(
                    <Play className="w-6 h-6 text-purple-600" />
                  )}
                </button>
                <button
                  onClick={stopAudio}
                  title='Stop Audio'
                  className="p-3 bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors">
                    <Square className="w-6 h-6 text-purple-600" />
                  </button>
                <button
                  onClick={downloadAudio}
                  className="p-3 bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors"
                  title="Download Audio">
                    <Download className="w-6 h-6 text-purple-600" />
                  </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  title='seek'
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 min-w-[40px]">{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Make sure your kokoro server is running on your local machine</li>
            <li>Update the Server URL in settings if your server uses a different port</li>
            <li>Your server should have a POST endpoint at <code className="bg-gray-100 px-1 py-0.5 rounded">/api/tts</code> that accepts JSON with text, voice, and speed parameters</li>
            <li>The endpoint should return audio data (WAV format recommended)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}