import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { VideoProvider, useVideo } from './context/VideoContext';
import { CommentProvider } from './context/CommentContext';
import { MessengerProvider } from './context/MessengerContext';
import { CallProvider } from './context/CallContext';
import { NotificationProvider } from './context/NotificationContext';
import { MonetizationProvider } from './context/MonetizationContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { VideoFeed } from './components/video/VideoFeed';
import { VideoUploadModal } from './components/video/VideoUploadModal';
import { CommentDrawer } from './components/comments/CommentDrawer';
import { MessengerView } from './components/messenger/MessengerView';
import { CallModal } from './components/calls/CallModal';
import { CallHistoryView } from './components/calls/CallHistoryView';
import { ProfileView } from './components/profile/ProfileView';
import { ExploreTrendingView } from './components/discovery/ExploreTrendingView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NotificationsView } from './components/notifications/NotificationsView';
import { AuthModal } from './components/auth/AuthModal';
import { SettingsModal } from './components/settings/SettingsModal';

const MainAppContent: React.FC = () => {
  const { activeFeed, setActiveFeed } = useVideo();

  // Modal triggers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeCommentVideoId, setActiveCommentVideoId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  const handleOpenComments = (videoId: string) => {
    setActiveCommentVideoId(videoId);
  };

  const handleSelectVideoFromGrid = (videoId: string) => {
    setActiveFeed('foryou');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Layout (Sidebar + Body Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          {(activeFeed === 'foryou' || activeFeed === 'following') && (
            <VideoFeed
              onOpenComments={handleOpenComments}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {(activeFeed === 'explore' || activeFeed === 'trending') && (
            <ExploreTrendingView
              onSelectVideo={handleSelectVideoFromGrid}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeFeed === ('messenger' as any) && <MessengerView />}

          {activeFeed === ('calls' as any) && <CallHistoryView />}

          {activeFeed === 'profile' && (
            <ProfileView
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}

          {activeFeed === ('admin' as any) && <AdminDashboard />}

          {activeFeed === ('notifications' as any) && (
            <NotificationsView onSelectVideo={handleSelectVideoFromGrid} />
          )}
        </main>
      </div>

      {/* Upload Video Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Comment Drawer Sheet */}
      <CommentDrawer
        videoId={activeCommentVideoId}
        isOpen={!!activeCommentVideoId}
        onClose={() => setActiveCommentVideoId(null)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Real-time Voice & Video Calling Modal */}
      <CallModal />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* User Preferences & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MonetizationProvider>
          <VideoProvider>
            <CommentProvider>
              <MessengerProvider>
                <CallProvider>
                  <NotificationProvider>
                    <MainAppContent />
                  </NotificationProvider>
                </CallProvider>
              </MessengerProvider>
            </CommentProvider>
          </VideoProvider>
        </MonetizationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
