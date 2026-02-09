import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, X, FileText, Image, Link2, Database, Plus, StopCircle, Code, GraduationCap, TrendingUp, PenLine, Lightbulb, Sparkles, Menu, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { MessageAttachment } from '@/types';

interface WelcomeScreenProps {
  onSend: (message: string, attachments?: MessageAttachment[]) => void;
  onOpenKnowledgeBase: () => void;
  disabled?: boolean;
}

const quickActions = [
  { icon: Code, label: 'Write code', prompt: 'Help me write code for...' },
  { icon: GraduationCap, label: 'Learn', prompt: 'Explain how...' },
  { icon: TrendingUp, label: 'Analyze', prompt: 'Analyze this data...' },
  { icon: PenLine, label: 'Write', prompt: 'Help me write...' },
  { icon: Lightbulb, label: 'Brainstorm', prompt: 'Give me ideas for...' },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const WelcomeScreen = ({ onSend, onOpenKnowledgeBase, disabled }: WelcomeScreenProps) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const { toggleSidebar } = useAppStore();

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    };
  }, [isRecording]);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    onSend(input, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setInput(prev => prev + (prev ? ' ' : '') + 'This is transcribed speech from the microphone...');
    } else {
      setIsRecording(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: MessageAttachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'doc',
      size: file.size,
      source: 'upload' as const,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const addUrlAttachment = () => {
    const url = prompt('Enter URL:');
    if (url) {
      setAttachments(prev => [...prev, {
        id: Date.now().toString(),
        name: new URL(url).hostname,
        type: 'url',
        source: 'url',
        url,
      }]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttachmentIcon = (type: MessageAttachment['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-3.5 h-3.5" />;
      case 'image': return <Image className="w-3.5 h-3.5" />;
      case 'url': return <Link2 className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-8 bg-[hsl(220,25%,10%)] relative">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden absolute top-4 left-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Greeting */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 animate-fade-in">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white/90">
          {getGreeting()}
        </h1>
      </div>

      <p className="text-lg sm:text-xl md:text-2xl text-white/60 mb-8 sm:mb-12 text-center animate-fade-in" style={{ animationDelay: '100ms' }}>
        How can I help you today?
      </p>

      {/* Main Input Container */}
      <div className="w-full max-w-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 animate-fade-in">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  {getAttachmentIcon(attachment.type)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white/80 truncate max-w-[120px]">
                    {attachment.name}
                  </span>
                  {attachment.size && (
                    <span className="text-[10px] text-white/40">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="ml-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Card */}
        <div className="rounded-2xl bg-[hsl(220,20%,16%)] border border-white/10 shadow-2xl">
          {/* Text Input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AI Assistant anything..."
              rows={1}
              disabled={disabled || isRecording}
              className={cn(
                "w-full resize-none bg-transparent px-5 py-4 text-white placeholder:text-white/40",
                "focus:outline-none",
                "transition-all duration-300",
                isRecording && "text-red-400"
              )}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-400">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              {/* Attachment Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200",
                      attachments.length > 0 && "text-primary"
                    )}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl bg-[hsl(220,20%,18%)] border-white/10">
                  <DropdownMenuLabel className="text-xs text-white/50">Add to message</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-3 py-2.5 text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium">Upload File</div>
                      <div className="text-xs text-white/40">PDF, DOC, TXT, Images</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenKnowledgeBase} className="gap-3 py-2.5 text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Knowledge Base</div>
                      <div className="text-xs text-white/40">Select from your docs</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={addUrlAttachment} className="gap-3 py-2.5 text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Link2 className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <div className="font-medium">Add URL</div>
                      <div className="text-xs text-white/40">Link external content</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tools indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white/40 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Tools</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Button */}
              <Button
                onClick={toggleRecording}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-xl transition-all duration-300",
                  isRecording
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                )}
              >
                {isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || disabled}
                className={cn(
                  "h-9 w-9 rounded-xl transition-all duration-300",
                  "bg-gradient-to-br from-primary via-primary to-secondary hover:opacity-90",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                  "disabled:opacity-40 disabled:shadow-none"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mt-4 sm:mt-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          {quickActions.slice(0, window.innerWidth < 640 ? 3 : 5).map((action, index) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${400 + index * 75}ms` }}
            >
              <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50 group-hover:text-white/70 transition-colors" />
              <span className="text-xs sm:text-sm text-white/70 group-hover:text-white/90 font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-8">
          AI Assistant may produce inaccurate information. Consider verifying important details.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
