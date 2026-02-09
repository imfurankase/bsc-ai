import { Sparkles, User, FileText, Image, Link2, ExternalLink, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Message, MessageAttachment } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  animationDelay?: number;
  onPreview?: (file: { url: string; type: string; name: string }) => void;
}

const AttachmentCard = ({ attachment, onPreview }: { attachment: MessageAttachment; onPreview?: (file: { url: string; type: string; name: string }) => void }) => {
  const getIcon = () => {
    switch (attachment.type) {
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'url': return <Link2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceBadge = () => {
    if (attachment.source === 'knowledge-base') {
      return (
        <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
          <Database className="w-2.5 h-2.5" />
          KB
        </span>
      );
    }
    return null;
  };

  const handlePreview = (e: React.MouseEvent) => {
    console.log('[DEBUG] Preview clicked for:', attachment);
    if ((attachment.type === 'image' || attachment.type === 'pdf') && attachment.url && onPreview) {
      e.preventDefault();
      console.log('[DEBUG] Opening preview for:', attachment.url);
      onPreview({
        url: attachment.url,
        type: attachment.type,
        name: attachment.name
      });
    } else {
      console.log('[DEBUG] Preview conditions met:', {
        isTypeValid: attachment.type === 'image' || attachment.type === 'pdf',
        hasUrl: !!attachment.url,
        hasHandler: !!onPreview
      });
    }
    // URLs and other types follow default link behavior
  };

  const CardContent = (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-all group cursor-pointer hover:bg-white/5">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
        attachment.type === 'pdf' && "bg-red-500/10 text-red-500 group-hover:bg-red-500/20",
        attachment.type === 'image' && "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20",
        attachment.type === 'url' && "bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20",
        attachment.type === 'doc' && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
        attachment.type === 'text' && "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20"
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {attachment.name}
          </span>
          {getSourceBadge()}
        </div>
        {attachment.size && (
          <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
            {(attachment.size / 1024).toFixed(1)} KB
          </span>
        )}
        {attachment.url && (
          <span className="text-xs text-muted-foreground truncate block group-hover:text-muted-foreground/80">
            {attachment.url}
          </span>
        )}
      </div>
      {attachment.type === 'url' ? (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : attachment.url ? (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : null}
    </div>
  );

  if (attachment.url) {
    if (attachment.type === 'url') {
      return (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block no-underline">
          {CardContent}
        </a>
      );
    }
    return (
      <div onClick={handlePreview}>
        {CardContent}
      </div>
    );
  }

  return CardContent;
};

export const MessageBubble = ({ message, isStreaming, animationDelay = 0, onPreview }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div
      className={cn(
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Message Content */}
      <div className={cn("max-w-[90%] sm:max-w-[85%]", isUser && "max-w-[85%] sm:max-w-[70%]")}>
        {/* Attachments */}
        {hasAttachments && (
          <div className={cn(
            "grid gap-2 mb-2",
            message.attachments!.length > 1 ? "grid-cols-2" : "grid-cols-1"
          )}>
            {message.attachments!.map((attachment) => (
              <AttachmentCard key={attachment.id} attachment={attachment} onPreview={onPreview} />
            ))}
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          <>
            {isUser ? (
              <div className="bg-[hsl(30,5%,22%)] text-white rounded-2xl px-4 py-2 inline-block">
                <p className="whitespace-pre-wrap leading-normal text-sm">{message.content}</p>
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:my-3 [&>ul]:ml-0 [&>ul>li]:mb-1.5">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="leading-relaxed text-[hsl(35,20%,85%)] text-[15px]">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    ul: ({ children }) => <ul className="space-y-1.5 list-disc list-inside text-[hsl(35,20%,85%)]">{children}</ul>,
                    li: ({ children }) => <li className="text-[hsl(35,20%,85%)] text-[15px]">{children}</li>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span
                    className="inline-block w-[3px] h-5 ml-0.5 bg-primary rounded-full animate-[blink_1s_ease-in-out_infinite]"
                    style={{ verticalAlign: 'text-bottom' }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
