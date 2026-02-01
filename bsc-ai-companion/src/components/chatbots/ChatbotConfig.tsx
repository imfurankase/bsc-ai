import { useState } from 'react';
import { ArrowLeft, Save, Bot, Sparkles, Database, Sliders } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { Chatbot } from '@/types';

interface ChatbotConfigProps {
  chatbot: Chatbot | null;
  onClose: () => void;
}

export const ChatbotConfig = ({ chatbot, onClose }: ChatbotConfigProps) => {
  const { knowledgeBases, activeWorkspaceId, createChatbot, updateChatbot } = useAppStore();
  
  const workspaceKBs = knowledgeBases.filter(kb => kb.workspaceId === activeWorkspaceId);

  const [formData, setFormData] = useState({
    name: chatbot?.name || '',
    description: chatbot?.description || '',
    systemPrompt: chatbot?.systemPrompt || 'You are a helpful AI assistant. Be professional, accurate, and friendly.',
    model: chatbot?.model || 'gpt-4',
    temperature: chatbot?.temperature || 0.7,
    isActive: chatbot?.isActive ?? true,
    knowledgeBaseIds: chatbot?.knowledgeBaseIds || [],
  });

  const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable, best for complex tasks' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
    { id: 'claude-3', name: 'Claude 3', description: 'Excellent reasoning' },
  ];

  const handleSave = () => {
    if (chatbot) {
      updateChatbot(chatbot.id, formData);
    } else {
      createChatbot({
        ...formData,
        workspaceId: activeWorkspaceId || '1',
      });
    }
    onClose();
  };

  const toggleKnowledgeBase = (kbId: string) => {
    setFormData(prev => ({
      ...prev,
      knowledgeBaseIds: prev.knowledgeBaseIds.includes(kbId)
        ? prev.knowledgeBaseIds.filter(id => id !== kbId)
        : [...prev.knowledgeBaseIds, kbId],
    }));
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {chatbot ? 'Configure Chatbot' : 'Create New Chatbot'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {chatbot ? 'Update settings and fine-tune your AI assistant' : 'Set up a new AI assistant for your workspace'}
          </p>
        </div>
        <Button onClick={handleSave} className="gradient-primary hover:opacity-90 shadow-glow">
          <Save className="w-4 h-4 mr-2" />
          {chatbot ? 'Save Changes' : 'Create Chatbot'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Chatbot Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Support Assistant"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this chatbot do?"
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this chatbot</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                System Prompt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Define the personality and behavior of your AI assistant
              </p>
              <Textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="You are a helpful AI assistant..."
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                Model & Fine-tuning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>AI Model</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setFormData(prev => ({ ...prev, model: model.id }))}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        formData.model === model.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-foreground">{model.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Temperature</Label>
                  <span className="text-sm font-medium text-foreground">{formData.temperature}</span>
                </div>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, temperature: value }))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Bases */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Knowledge Bases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connect knowledge bases to enhance responses
              </p>
              {workspaceKBs.length === 0 ? (
                <div className="text-center py-6">
                  <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No knowledge bases available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workspaceKBs.map((kb) => (
                    <label
                      key={kb.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.knowledgeBaseIds.includes(kb.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={formData.knowledgeBaseIds.includes(kb.id)}
                        onCheckedChange={() => toggleKnowledgeBase(kb.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{kb.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{kb.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{kb.documentCount} documents</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="gradient-subtle border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{formData.name || 'Unnamed Bot'}</p>
                  <p className="text-sm text-muted-foreground">{formData.model}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {formData.systemPrompt || 'No system prompt configured'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
