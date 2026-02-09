import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, X, FileText, Image, Link2, Database, Plus, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { MessageAttachment } from '@/types';

interface ChatInputProps {
  onSend: (message: string, attachments?: MessageAttachment[]) => void;
  onOpenKnowledgeBase: () => void;
  disabled?: boolean;
  placeholder?: string;
  darkMode?: boolean;
}

export const ChatInput = ({ onSend, onOpenKnowledgeBase, disabled, placeholder, darkMode }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

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
      // Stop recording - simulate transcription
      setIsRecording(false);
      // Simulate transcribed text
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
      file: file,
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

  return (
    <div className={cn(
      "p-2 sm:p-4 border-t backdrop-blur-xl",
      darkMode
        ? "border-white/10 bg-[hsl(220,20%,12%)]"
        : "border-border/50 bg-gradient-to-t from-card via-card to-transparent"
    )}>
      <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                  darkMode
                    ? "bg-white/5 border border-white/10 hover:border-white/20"
                    : "bg-muted/50 border border-border/50 hover:border-primary/30"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {getAttachmentIcon(attachment.type)}
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-xs font-medium truncate max-w-[120px]",
                    darkMode ? "text-white/80" : "text-foreground"
                  )}>
                    {attachment.name}
                  </span>
                  {attachment.size && (
                    <span className={cn(
                      "text-[10px]",
                      darkMode ? "text-white/40" : "text-muted-foreground"
                    )}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className={cn(
                    "ml-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all",
                    darkMode
                      ? "hover:bg-red-500/20 text-white/40 hover:text-red-400"
                      : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="relative flex items-end gap-1.5 sm:gap-3">
          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border transition-all duration-200 flex-shrink-0",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white"
                    : "border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/30",
                  attachments.length > 0 && (darkMode ? "border-primary/50 bg-primary/10" : "border-primary/50 bg-primary/5")
                )}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={cn(
              "w-56 rounded-xl",
              darkMode && "bg-[hsl(220,20%,18%)] border-white/10"
            )}>
              <DropdownMenuLabel className={cn("text-xs", darkMode ? "text-white/50" : "text-muted-foreground")}>Add to message</DropdownMenuLabel>
              <DropdownMenuSeparator className={darkMode ? "bg-white/10" : ""} />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className={cn("gap-3 py-2.5", darkMode && "text-white/80 hover:text-white focus:text-white focus:bg-white/10")}>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium">Upload File</div>
                  <div className={cn("text-xs", darkMode ? "text-white/40" : "text-muted-foreground")}>PDF, DOC, TXT, Images</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenKnowledgeBase} className={cn("gap-3 py-2.5", darkMode && "text-white/80 hover:text-white focus:text-white focus:bg-white/10")}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Knowledge Base</div>
                  <div className={cn("text-xs", darkMode ? "text-white/40" : "text-muted-foreground")}>Select from your docs</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addUrlAttachment} className={cn("gap-3 py-2.5", darkMode && "text-white/80 hover:text-white focus:text-white focus:bg-white/10")}>
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <div className="font-medium">Add URL</div>
                  <div className={cn("text-xs", darkMode ? "text-white/40" : "text-muted-foreground")}>Link external content</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Main Input */}
          <div className="flex-1 relative group min-w-0">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder || "Message AI Assistant..."}
              rows={1}
              disabled={disabled || isRecording}
              className={cn(
                "relative w-full resize-none rounded-xl sm:rounded-2xl border backdrop-blur-sm",
                "px-3 sm:px-5 py-3 sm:py-4 pr-4 sm:pr-14 text-sm sm:text-base",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                "transition-all duration-300 shadow-sm",
                darkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/40"
                  : "border-border/50 bg-background/80 text-foreground placeholder:text-muted-foreground",
                isRecording && (darkMode ? "border-red-500/50 bg-red-500/10" : "border-destructive/50 bg-destructive/5")
              )}
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-pulse">
                <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", darkMode ? "bg-red-500" : "bg-destructive")} />
                <span className={cn("text-sm font-medium", darkMode ? "text-red-400" : "text-destructive")}>{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Voice Button - Hidden on mobile */}
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            className={cn(
              "hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border transition-all duration-300 flex-shrink-0",
              isRecording
                ? (darkMode ? "border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse" : "border-destructive bg-destructive hover:bg-destructive/90 animate-pulse")
                : (darkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white" : "border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/30")
            )}
          >
            {isRecording ? (
              <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || disabled}
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl transition-all duration-300 flex-shrink-0",
              "bg-gradient-to-br from-primary via-primary to-secondary hover:opacity-90",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
              "disabled:opacity-40 disabled:shadow-none"
            )}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Footer */}
        <p className={cn("text-center text-[10px] sm:text-xs", darkMode ? "text-white/30" : "text-muted-foreground")}>
          AI Assistant may produce inaccurate information.
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
