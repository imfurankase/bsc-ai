import { useState } from 'react';
import { 
  FolderOpen, Plus, MessageSquare, MoreVertical, Search, Bot, 
  Trash2, Edit, ArrowLeft, Sparkles, Clock, PlayCircle, Settings,
  Users, ArrowRight
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChatGroup } from '@/types';

interface GroupsListProps {
  onNavigate?: (page: string) => void;
}

export const GroupsList = ({ onNavigate }: GroupsListProps) => {
  const { groups, chatbots, chats, activeWorkspaceId, createGroup, createChat, setActiveChat } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', chatbotId: '', description: '' });

  const workspaceGroups = groups
    .filter(g => g.workspaceId === activeWorkspaceId)
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const workspaceChatbots = chatbots.filter(b => b.workspaceId === activeWorkspaceId);

  const handleCreate = () => {
    if (!newGroup.name.trim() || !newGroup.chatbotId) return;
    createGroup({
      name: newGroup.name,
      chatbotId: newGroup.chatbotId,
      workspaceId: activeWorkspaceId || '1',
    });
    setNewGroup({ name: '', chatbotId: '', description: '' });
    setShowCreate(false);
  };

  const handleStartChat = (groupId: string, chatbotId: string) => {
    const chat = createChat(chatbotId, 'New Conversation', groupId);
    setActiveChat(chat.id);
    onNavigate?.('chat');
  };

  // Group Detail View
  if (selectedGroup) {
    const chatbot = chatbots.find(b => b.id === selectedGroup.chatbotId);
    const groupChats = chats.filter(c => c.groupId === selectedGroup.id);

    return (
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <FolderOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{selectedGroup.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{chatbot?.name || 'No chatbot assigned'}</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            className="gradient-primary hover:opacity-90 shadow-glow"
            onClick={() => handleStartChat(selectedGroup.id, selectedGroup.chatbotId)}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start New Chat
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <MessageSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{groupChats.length}</p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground truncate">{chatbot?.name || 'None'}</p>
                <p className="text-sm text-muted-foreground">Assigned Chatbot</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {new Date(selectedGroup.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversations List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversations
            </CardTitle>
            <Button 
              size="sm"
              onClick={() => handleStartChat(selectedGroup.id, selectedGroup.chatbotId)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Chat
            </Button>
          </CardHeader>
          <CardContent>
            {groupChats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  Start your first conversation in this group
                </p>
                <Button 
                  className="gradient-primary"
                  onClick={() => handleStartChat(selectedGroup.id, selectedGroup.chatbotId)}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {groupChats.map((chat, index) => (
                  <div
                    key={chat.id}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all cursor-pointer group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => {
                      setActiveChat(chat.id);
                      onNavigate?.('chat');
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl gradient-subtle flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{chat.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat Groups</h1>
          <p className="text-muted-foreground mt-1">Organize conversations by topic, team, or project</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gradient-primary hover:opacity-90 shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                Create Chat Group
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Customer Support"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="group-desc">Description (Optional)</Label>
                <Textarea
                  id="group-desc"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this group for?"
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="group-chatbot">Assigned Chatbot</Label>
                <Select 
                  value={newGroup.chatbotId} 
                  onValueChange={(value) => setNewGroup(prev => ({ ...prev, chatbotId: value }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a chatbot for this group" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceChatbots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          {bot.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!newGroup.name || !newGroup.chatbotId}
                className="w-full gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="pl-10"
        />
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-card border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-subtle flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{workspaceGroups.length}</p>
            <p className="text-xs text-muted-foreground">Total Groups</p>
          </div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {chats.filter(c => c.groupId && groups.some(g => g.id === c.groupId)).length}
            </p>
            <p className="text-xs text-muted-foreground">Grouped Chats</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      {workspaceGroups.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 blur-2xl opacity-30 gradient-primary rounded-full scale-150" />
              <div className="relative w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <FolderOpen className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search ? 'No groups found' : 'Create your first group'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {search 
                ? 'Try adjusting your search terms'
                : 'Groups help you organize conversations by topic, team, or project for better management.'
              }
            </p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="gradient-primary hover:opacity-90 shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaceGroups.map((group, index) => {
            const chatbot = chatbots.find(b => b.id === group.chatbotId);
            const groupChats = chats.filter(c => c.groupId === group.id);
            
            return (
              <Card 
                key={group.id} 
                className="group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 75}ms` }}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 gradient-primary opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                        <FolderOpen className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {chatbot?.name || 'No chatbot'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleStartChat(group.id, group.chatbotId);
                        }}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Group
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{groupChats.length}</span>
                      <span className="text-muted-foreground">conversations</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Recent chats preview */}
                  {groupChats.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      {groupChats.slice(0, 2).map((chat) => (
                        <div key={chat.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="w-3 h-3 text-primary/60" />
                          <span className="truncate">{chat.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group);
                      }}
                    >
                      View All
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 gradient-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChat(group.id, group.chatbotId);
                      }}
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
