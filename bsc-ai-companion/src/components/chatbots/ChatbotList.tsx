import { useState } from 'react';
import { Bot, Plus, Settings, Trash2, MoreVertical, Zap, Database } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatbotConfig } from './ChatbotConfig';
import type { Chatbot } from '@/types';

export const ChatbotList = () => {
  const { chatbots, knowledgeBases, activeWorkspaceId, deleteChatbot } = useAppStore();
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const workspaceChatbots = chatbots.filter(b => b.workspaceId === activeWorkspaceId);

  if (selectedBot || showCreate) {
    return (
      <ChatbotConfig 
        chatbot={selectedBot} 
        onClose={() => {
          setSelectedBot(null);
          setShowCreate(false);
        }} 
      />
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chatbots</h1>
          <p className="text-muted-foreground mt-1">Manage your AI assistants and their configurations</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gradient-primary hover:opacity-90 shadow-glow">
          <Plus className="w-4 h-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      {/* Chatbot Grid */}
      {workspaceChatbots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No chatbots yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first AI chatbot to start automating conversations and supporting your users.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Chatbot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaceChatbots.map((bot) => {
            const linkedKBs = knowledgeBases.filter(kb => bot.knowledgeBaseIds.includes(kb.id));
            return (
              <Card key={bot.id} className="card-hover group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                        <Bot className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bot.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                          <span className="text-xs text-muted-foreground">
                            {bot.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedBot(bot)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteChatbot(bot.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {bot.description || 'No description provided'}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium text-foreground">{bot.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Knowledge Bases:</span>
                      <span className="font-medium text-foreground">{linkedKBs.length}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setSelectedBot(bot)}
                    variant="outline" 
                    className="w-full mt-4"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
