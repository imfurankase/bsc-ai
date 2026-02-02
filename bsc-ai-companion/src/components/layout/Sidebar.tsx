import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Edit3,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import bscLogo from '@/assets/bsc-logo.png';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConversationSummary } from '@/types/api-types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    activeConversationId,
    setActiveConversation,
  } = useAppStore();

  const { user, signOut } = useAuth();
  const { loadConversations, deleteConversation } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations().then(setConversations);
  }, [loadConversations]);

  // Filter chats based on search query
  const filteredChats = conversations.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    setActiveConversation(null);
  };

  const handleDeleteChat = async (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    const success = await deleteConversation(conversationId);
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversation(null);
      }
    }
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversation(id);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = user?.email || 'User';

  return (
    <>
      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={cn(
          'h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out z-50',
          'fixed md:relative',
          sidebarCollapsed
            ? 'w-0 -translate-x-full md:w-[72px] md:translate-x-0 overflow-hidden'
            : 'w-[280px] sm:w-[260px]'
        )}
      >
        {/* Header with Logo and Toggle */}
        <div className={cn(
          'p-4 flex items-center',
          sidebarCollapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-1">
            <img src={bscLogo} alt="BSC AI" className="w-full h-full object-contain" />
          </div>
          {!sidebarCollapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="ml-auto p-1.5 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expand button when collapsed */}
        {sidebarCollapsed && (
          <div className="px-2 pb-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* New Chat Button */}
        <div className={cn('px-3 pb-2', sidebarCollapsed && 'px-2')}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/chat/new"
                className={cn(
                  'w-full flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors',
                  sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                )}
                onClick={() => {
                  // Close sidebar on mobile
                  if (window.innerWidth < 768) {
                    toggleSidebar();
                  }
                }}
              >
                <Edit3 className="w-4 h-4" />
                {!sidebarCollapsed && <span>New chat</span>}
              </Link>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50 text-sidebar-muted text-sm">
              <Search className="w-4 h-4" />
              <input
                type="text"
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sidebar-foreground placeholder:text-sidebar-muted"
              />
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          {!sidebarCollapsed && (
            <div className="px-2 py-2 text-xs text-sidebar-muted font-medium">
              Your chats
            </div>
          )}

          <div className="space-y-0.5">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  'group relative w-full flex items-center rounded-lg text-sm transition-colors',
                  activeConversationId === chat.id
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={`/chat/${chat.id}`}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          toggleSidebar();
                        }
                      }}
                      className={cn(
                        'flex-1 flex items-center gap-2',
                        sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                      )}
                    >
                      {sidebarCollapsed ? (
                        <span className="w-5 h-5 rounded bg-sidebar-accent flex items-center justify-center text-xs">
                          {chat.title.charAt(0)}
                        </span>
                      ) : (
                        <span className="truncate text-left">{chat.title}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {sidebarCollapsed && <TooltipContent side="right">{chat.title}</TooltipContent>}
                </Tooltip>

                {!sidebarCollapsed && (
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-sidebar-muted hover:text-red-400 transition-all z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {filteredChats.length === 0 && !sidebarCollapsed && (
            <div className="px-3 py-4 text-sm text-sidebar-muted text-center">
              No chats found
            </div>
          )}
        </div>

        {/* User Profile at Bottom */}
        {!sidebarCollapsed && (
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userEmail}</p>
              </div>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="p-1.5 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </>
  );
};