import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Preloader } from '@/components/Preloader';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeConversationId, setActiveConversation } = useAppStore();
  const location = useLocation();

  const handlePreloaderComplete = () => {
    setIsLoading(false);
  };

  // Sync URL -> Store
  useEffect(() => {
    if (location.pathname === '/chat/new') {
      if (activeConversationId !== null) {
        setActiveConversation(null);
      }
    } else if (id) {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId) && activeConversationId !== parsedId) {
        setActiveConversation(parsedId);
      }
    } else if (location.pathname === '/' && activeConversationId !== null) {
      // If at root, maybe reset? Or keep last? 
      // Let's keep last for now or allow store to persist. 
      // Actually, if simply visiting /, we might want to start fresh or continue.
      // For now, let's do nothing on / to allow store persistence or manual reset.
    }
  }, [id, location.pathname, setActiveConversation]);

  // Sync Store -> URL (when chat is created or selected internally)
  useEffect(() => {
    if (activeConversationId) {
      // Only navigate if URL doesn't match to avoid loops, 
      // but react-router is smart enough usually.
      if (id !== activeConversationId.toString()) {
        navigate(`/chat/${activeConversationId}`, { replace: true });
      }
    } else if (activeConversationId === null && location.pathname !== '/chat/new' && location.pathname !== '/') {
      // If store is null but URL has ID, we handled that in the other effect (URL -> Store).
      // But if store becomes null (New Chat clicked), we should go to /chat/new
      navigate('/chat/new');
    }
  }, [activeConversationId, navigate, id, location.pathname]);


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