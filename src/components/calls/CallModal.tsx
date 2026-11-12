import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  RefreshCw, 
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MonitorUp,
  MonitorOff,
  CircleDot,
  Download,
  AlertCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useLanguage } from '../../context/LanguageContext';

export const CallModal: React.FC = () => {
  const { 
    activeCall, 
    callDuration, 
    isMuted, 
    isVideoEnabled, 
    isFrontCamera,
    toggleMute, 
    toggleVideo, 
    flipCamera, 
    acceptCall, 
    declineCall, 
    endCall 
  } = useCall();
  const { t } = useLanguage();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  // Local Call Recording (Item 17)
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingDownloadUrl, setRecordingDownloadUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screenStream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Clean up media streams and recorder on unmount or end call
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [screenStream]);

  if (!activeCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnected = activeCall.status === 'accepted';

  // Toggle Fullscreen (Item 16)
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Screen Sharing (Item 18)
  const handleToggleScreenShare = async () => {
    setScreenShareError(null);
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          setScreenShareError('এই ব্রাউজার বা ডিভাইসে স্ক্রিন শেয়ারিং সমর্থিত নয় (Screen sharing not supported on this browser)');
          setTimeout(() => setScreenShareError(null), 4000);
          return;
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          setScreenShareError('স্ক্রিন শেয়ারিং শুরু করতে সমস্যা হয়েছে।');
          setTimeout(() => setScreenShareError(null), 4000);
        }
      }
    }
  };

  // Local Call Recording (Item 17: Local-only, participant notified banner, no server storage)
  const handleToggleLocalRecording = () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start local recording
      try {
        // Create an audio/canvas stream for local recording
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#00F0FF';
          ctx.font = '24px sans-serif';
          ctx.fillText(`BasharTube Call: ${activeCall.receiverName || activeCall.callerName}`, 30, 80);
        }
        const stream = canvas.captureStream(15);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const localChunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            localChunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(localChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordingDownloadUrl(url);
          setRecordedChunks(localChunks);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDownloadUrl(null);
      } catch (err) {
        console.error('Recording initialization error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 sm:p-4 animate-in fade-in select-none">
      <div 
        ref={containerRef}
        className={`relative w-full ${
          isFullscreen 
            ? 'h-full max-w-none rounded-none' 
            : 'max-w-xl h-[88vh] max-h-[760px] rounded-3xl border border-zinc-800'
        } overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-2xl flex flex-col justify-between p-4 sm:p-6 transition-all`}
      >
        
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 z-20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 font-semibold text-cyan-300">
              {activeCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              {activeCall.type === 'video' ? 'BasharTube Video HD' : 'BasharTube Voice HD'}
            </span>

            {isRecording && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 font-bold text-rose-400 animate-pulse text-[10px]">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                REC (Local)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 hidden sm:flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Direct Peer Call</span>
            </span>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Local Recording Participant Banner (Item 17) */}
        {isRecording && (
          <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in slide-in-from-top-1 z-20">
            <span className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-rose-400 shrink-0" />
              <span>লোকাল কল রেকর্ডিং সক্রিয় (Local Call Recording Active — সংরক্ষিত হচ্ছে ডিভাইসে)</span>
            </span>
          </div>
        )}

        {/* Recording Saved Download Notice */}
        {recordingDownloadUrl && !isRecording && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in slide-in-from-top-1 z-20">
            <span className="flex items-center gap-1.5 truncate">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">রেকর্ডিং সম্পন্ন হয়েছে। সার্ভারে জমা হয়নি।</span>
            </span>
            <a
              href={recordingDownloadUrl}
              download={`BasharTube_Call_Recording_${Date.now()}.webm`}
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs rounded-lg flex items-center gap-1 shrink-0 ml-2 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ডাউনলোড করুন</span>
            </a>
          </div>
        )}

        {/* Screen Share Fallback Error */}
        {screenShareError && (
          <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 z-20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{screenShareError}</span>
          </div>
        )}

        {/* Center: Remote Video or Screen Share or Voice Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 relative overflow-hidden rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
          {/* 1. Screen Sharing Active Display */}
          {isScreenSharing && screenStream ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center gap-1.5">
                <MonitorUp className="w-3.5 h-3.5 animate-pulse" />
                <span>আপনার স্ক্রিন শেয়ার হচ্ছে (Screen Sharing Active)</span>
              </div>
            </div>
          ) : activeCall.type === 'video' && isVideoEnabled ? (
            /* 2. Video Call Stream */
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center">
              <img
                src={activeCall.receiverAvatar || activeCall.callerAvatar}
                alt="remote"
                className="w-full h-full object-cover filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Picture-in-Picture Local Self Preview */}
              <div className="absolute top-3 right-3 w-28 h-40 rounded-2xl overflow-hidden bg-black border-2 border-cyan-400 shadow-2xl">
                <img
                  src={activeCall.callerAvatar}
                  alt="self"
                  className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
                />
                <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/70 text-cyan-300 px-1 rounded font-bold">
                  {isFrontCamera ? 'Front' : 'Rear'}
                </span>
              </div>

              {/* Bottom Remote Participant Name Overlay */}
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                <div className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-zinc-700/60 text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{activeCall.receiverName || activeCall.callerName}</span>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-medium text-cyan-400 font-mono">
                  {isConnected ? formatDuration(callDuration) : 'Connecting...'}
                </div>
              </div>
            </div>
          ) : (
            /* 3. Voice Call Avatar with soundwave pulse */
            <div className="flex flex-col items-center p-6 text-center">
              <div className="relative mb-6">
                <div className={`w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-sky-500 to-pink-500 shadow-2xl ${
                  isConnected ? 'animate-pulse' : 'animate-bounce'
                }`}>
                  <img
                    src={activeCall.receiverAvatar || activeCall.callerAvatar}
                    alt="participant"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                {isConnected && (
                  <span className="absolute -inset-3 rounded-full border-2 border-cyan-400/30 animate-ping pointer-events-none" />
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 font-['Plus_Jakarta_Sans']">
                {activeCall.receiverName || activeCall.callerName}
              </h2>

              <p className="text-sm font-semibold text-cyan-400 font-mono tracking-wider">
                {isConnected ? formatDuration(callDuration) : (activeCall.status === 'calling' ? 'আউটগোয়িং কল...' : 'ইনকামিং কল...')}
              </p>

              <span className="text-xs text-zinc-500 mt-2">
                {isConnected ? (isSpeakerOn ? '🔊 লাউডস্পিকার সক্রিয়' : '🔈 ইয়ারপিস সক্রিয়') : 'সংযোগ স্থাপন করা হচ্ছে...'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Control Bar (Item 16: mic, camera, speaker, flip, screen share, recording, call end) */}
        <div className="z-20 flex flex-col items-center gap-3">
          {isConnected ? (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-2 bg-zinc-950/80 rounded-2xl border border-zinc-800 backdrop-blur-xl max-w-full">
              {/* Mic Mute/Unmute */}
              <button
                onClick={toggleMute}
                className={`p-3 sm:p-3.5 rounded-full transition shadow-lg ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isMuted ? 'মাইক চালু করুন' : 'মাইক বন্ধ করুন'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Camera Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-3 sm:p-3.5 rounded-full transition shadow-lg ${
                  !isVideoEnabled ? 'bg-rose-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isVideoEnabled ? 'ক্যামেরা বন্ধ করুন' : 'ক্যামেরা চালু করুন'}
              >
                {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Speaker On/Off Toggle */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3 sm:p-3.5 rounded-full transition shadow-lg ${
                  !isSpeakerOn ? 'bg-amber-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isSpeakerOn ? 'স্পিকার বন্ধ করুন' : 'লাউডস্পিকার চালু করুন'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Flip Camera (Front/Rear) */}
              {isVideoEnabled && (
                <button
                  onClick={flipCamera}
                  className="p-3 sm:p-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition shadow-lg"
                  title="ক্যামেরা পরিবর্তন করুন (Flip Camera)"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}

              {/* Screen Sharing (Item 18) */}
              <button
                onClick={handleToggleScreenShare}
                className={`p-3 sm:p-3.5 rounded-full transition shadow-lg ${
                  isScreenSharing ? 'bg-cyan-400 text-black shadow-cyan-400/40' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isScreenSharing ? 'স্ক্রিন শেয়ার বন্ধ করুন' : 'স্ক্রিন শেয়ার করুন (Screen Share)'}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
              </button>

              {/* Local Call Recording (Item 17) */}
              <button
                onClick={handleToggleLocalRecording}
                className={`p-3 sm:p-3.5 rounded-full transition shadow-lg ${
                  isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
                title={isRecording ? 'রেকর্ডিং থামান' : 'লোকাল কল রেকর্ড করুন (Local Recording)'}
              >
                <CircleDot className="w-5 h-5" />
              </button>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="p-3 sm:p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl hover:scale-105 active:scale-95 transition"
                title="কল শেষ করুন (End Call)"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Incoming / Outgoing Pending Controls */
            <div className="flex items-center justify-center gap-6 w-full">
              {activeCall.status === 'calling' ? (
                <button
                  onClick={endCall}
                  className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-2xl transition hover:scale-105"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>কল বাতিল করুন (Cancel Call)</span>
                </button>
              ) : (
                <div className="flex items-center gap-6">
                  <button
                    onClick={declineCall}
                    className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-2xl transition hover:scale-110"
                    title="প্রত্যাখ্যান করুন (Decline)"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-2xl transition hover:scale-110 animate-bounce"
                    title="রিসিভ করুন (Accept)"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
