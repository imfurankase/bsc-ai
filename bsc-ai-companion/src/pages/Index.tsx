import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Preloader } from '@/components/Preloader';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const handlePreloaderComplete = () => {
    setIsLoading(false);
  };

  // Show preloader first
  if (isLoading) {
    return <Preloader onComplete={handlePreloaderComplete} />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Then show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar currentPage="chat" onNavigate={() => { }} />
      <main className="flex-1 overflow-auto w-full">
        <ChatInterface />
      </main>
    </div>
  );
};

export default Index;