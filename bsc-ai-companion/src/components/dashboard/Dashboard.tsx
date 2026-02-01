import { useState } from 'react';
import { 
  Bot, MessageSquare, Database, TrendingUp, ArrowUpRight, Sparkles, 
  Plus, ArrowRight, Zap, Users, FolderPlus, Upload, PlayCircle,
  ChevronRight, Clock, Activity
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  gradient?: string;
  iconBg?: string;
}

const StatCard = ({ title, value, icon, trend, trendUp, gradient, iconBg }: StatCardProps) => (
  <Card className={`relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 ${gradient || 'bg-card'}`}>
    {/* Decorative elements */}
    <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 bg-white -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-10 bg-white translate-y-1/2 -translate-x-1/2" />
    
    <CardContent className="p-6 relative">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-muted-foreground'}`}>{title}</p>
          <h3 className={`text-4xl font-bold tracking-tight ${gradient ? 'text-white' : 'text-foreground'}`}>{value}</h3>
          {trend && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              gradient 
                ? 'bg-white/20 text-white' 
                : trendUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}>
              <ArrowUpRight className={`w-3.5 h-3.5 ${!trendUp && 'rotate-90'}`} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${iconBg || 'bg-white/20'} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  featured?: boolean;
}

const QuickAction = ({ icon, title, description, buttonText, onClick, featured }: QuickActionProps) => (
  <div className={`relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 group cursor-pointer ${
    featured 
      ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10' 
      : 'bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:bg-muted/30'
  } hover:-translate-y-1`} onClick={onClick}>
    {/* Decorative corner */}
    {featured && (
      <div className="absolute top-0 right-0 w-20 h-20 gradient-primary opacity-10 rounded-bl-[100px]" />
    )}
    
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
      featured 
        ? 'gradient-primary shadow-lg shadow-primary/30' 
        : 'bg-muted group-hover:bg-primary/10'
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-foreground text-base">{title}</h4>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Button 
      size="sm" 
      variant={featured ? "gradient" : "outline"}
      className="opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {buttonText}
      <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
    </Button>
  </div>
);

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { 
    chatbots, knowledgeBases, chats, messages, groups,
    activeWorkspaceId, createChat, setActiveChat, createGroup
  } = useAppStore();
  
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showKBDialog, setShowKBDialog] = useState(false);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChatbotId, setNewGroupChatbotId] = useState('');
  
  const workspaceChatbots = chatbots.filter(b => b.workspaceId === activeWorkspaceId);
  const workspaceChats = chats.filter(c => c.workspaceId === activeWorkspaceId);
  const workspaceKBs = knowledgeBases.filter(kb => kb.workspaceId === activeWorkspaceId);
  const workspaceGroups = groups.filter(g => g.workspaceId === activeWorkspaceId);

  const recentChats = workspaceChats.slice(0, 4);
  const recentActivity = [
    { action: 'New conversation started', time: '2 min ago', icon: MessageSquare },
    { action: 'Knowledge base updated', time: '15 min ago', icon: Database },
    { action: 'Chatbot configured', time: '1 hour ago', icon: Bot },
  ];

  const handleStartChat = () => {
    if (!selectedChatbotId) return;
    const groupId = selectedGroupId && selectedGroupId !== 'none' ? selectedGroupId : undefined;
    const chat = createChat(selectedChatbotId, 'New Conversation', groupId);
    setActiveChat(chat.id);
    setShowChatDialog(false);
    setSelectedChatbotId('');
    setSelectedGroupId('');
    onNavigate?.('chat');
  };

  const handleCreateGroup = () => {
    if (!newGroupName || !newGroupChatbotId) return;
    createGroup({
      name: newGroupName,
      chatbotId: newGroupChatbotId,
      workspaceId: activeWorkspaceId || '1',
    });
    setShowGroupDialog(false);
    setNewGroupName('');
    setNewGroupChatbotId('');
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-to-b from-background via-background to-muted/30 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
            Welcome back! <span className="inline-block animate-bounce-soft">👋</span>
          </h1>
          <p className="text-muted-foreground text-lg">Here's what's happening with your AI workspace today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={() => setShowGroupDialog(true)}>
            <FolderPlus className="w-5 h-5 mr-2" />
            New Group
          </Button>
          <Button variant="gradient" size="lg" onClick={() => setShowChatDialog(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Start Chat
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Chatbots"
          value={workspaceChatbots.filter(b => b.isActive).length}
          icon={<Bot className="w-7 h-7 text-white" />}
          trend="+2 this week"
          trendUp
          gradient="bg-gradient-to-br from-primary via-primary to-secondary"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Total Conversations"
          value={workspaceChats.length}
          icon={<MessageSquare className="w-7 h-7 text-info" />}
          trend="+12% vs last week"
          trendUp
          gradient="bg-gradient-to-br from-info/90 to-info"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Knowledge Bases"
          value={workspaceKBs.length}
          icon={<Database className="w-7 h-7 text-white" />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Total Messages"
          value={messages.length}
          icon={<TrendingUp className="w-7 h-7 text-white" />}
          trend="+24% engagement"
          trendUp
          gradient="bg-gradient-to-br from-success to-emerald-500"
          iconBg="bg-white/20"
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            icon={<PlayCircle className="w-6 h-6 text-primary-foreground" />}
            title="Chat with a Chatbot"
            description="Start a conversation with any of your AI assistants"
            buttonText="Start"
            onClick={() => setShowChatDialog(true)}
            featured
          />
          <QuickAction
            icon={<FolderPlus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
            title="Create Chat Group"
            description="Organize conversations by topic or team"
            buttonText="Create"
            onClick={() => setShowGroupDialog(true)}
          />
          <QuickAction
            icon={<Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
            title="Add to Knowledge Base"
            description="Upload documents to enhance AI responses"
            buttonText="Upload"
            onClick={() => setShowKBDialog(true)}
          />
          <QuickAction
            icon={<Bot className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
            title="Create New Chatbot"
            description="Set up a new AI assistant with custom prompts"
            buttonText="Create"
            onClick={() => onNavigate?.('chatbots')}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Chats */}
        <Card className="lg:col-span-2 hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              Recent Conversations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('chat')} className="text-primary hover:text-primary">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentChats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-3xl gradient-subtle flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground mb-6">Start your first chat to see it here</p>
                  <Button variant="gradient" onClick={() => setShowChatDialog(true)}>
                    Start Your First Chat
                  </Button>
                </div>
              ) : (
                recentChats.map((chat, index) => {
                  const chatbot = chatbots.find(b => b.id === chat.chatbotId);
                  const group = groups.find(g => g.id === chat.groupId);
                  return (
                    <div 
                      key={chat.id} 
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent border border-transparent hover:border-primary/10 transition-all cursor-pointer group animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => {
                        setActiveChat(chat.id);
                        onNavigate?.('chat');
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{chat.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <span>{chatbot?.name}</span>
                          {group && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                              <span className="text-primary font-medium">{group.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-success" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/30 animate-fade-in hover:border-primary/20 transition-colors"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <activity.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbots Overview */}
      <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            Your Chatbots
          </CardTitle>
          <Button variant="soft" size="sm" onClick={() => onNavigate?.('chatbots')}>
            Manage All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaceChatbots.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 rounded-3xl gradient-subtle flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No chatbots yet</h3>
                <p className="text-muted-foreground mb-6">Create your first chatbot to get started</p>
                <Button variant="gradient" onClick={() => onNavigate?.('chatbots')}>
                  Create Your First Chatbot
                </Button>
              </div>
            ) : (
              workspaceChatbots.map((bot, index) => (
                <div 
                  key={bot.id} 
                  className="relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border-2 border-border/50 hover:border-primary/40 bg-gradient-to-br from-card to-muted/10 transition-all cursor-pointer group animate-fade-in hover:shadow-lg hover:-translate-y-1"
                  style={{ animationDelay: `${index * 75}ms` }}
                  onClick={() => {
                    setSelectedChatbotId(bot.id);
                    setShowChatDialog(true);
                  }}
                >
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-16 h-16 gradient-primary opacity-5 rounded-bl-[60px] group-hover:opacity-10 transition-opacity" />
                  
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Bot className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{bot.name}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{bot.description || 'No description'}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${bot.isActive ? 'bg-success shadow-lg shadow-success/50' : 'bg-muted-foreground'}`} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{bot.isActive ? 'Live' : 'Off'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              Start a New Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Chatbot</Label>
              <Select value={selectedChatbotId} onValueChange={setSelectedChatbotId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a chatbot to chat with" />
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
            <div>
              <Label>Add to Group (Optional)</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a group or leave empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {workspaceGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleStartChat} 
              disabled={!selectedChatbotId}
              className="w-full gradient-primary hover:opacity-90"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Conversation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-muted-foreground" />
              </div>
              Create Chat Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Customer Support"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Assign Chatbot</Label>
              <Select value={newGroupChatbotId} onValueChange={setNewGroupChatbotId}>
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
              onClick={handleCreateGroup} 
              disabled={!newGroupName || !newGroupChatbotId}
              className="w-full gradient-primary hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Knowledge Base Upload Dialog */}
      <Dialog open={showKBDialog} onOpenChange={setShowKBDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Database className="w-5 h-5 text-muted-foreground" />
              </div>
              Add to Knowledge Base
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Knowledge Base</Label>
              <Select>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceKBs.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        {kb.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground">PDF, TXT, DOCX up to 10MB</p>
            </div>
            <Button className="w-full gradient-primary hover:opacity-90">
              <Upload className="w-4 h-4 mr-2" />
              Upload Documents
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
