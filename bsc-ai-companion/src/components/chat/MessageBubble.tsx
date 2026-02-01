import { Sparkles, User, FileText, Image, Link2, ExternalLink, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Message, MessageAttachment } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  animationDelay?: number;
}

const AttachmentCard = ({ attachment }: { attachment: MessageAttachment }) => {
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

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-all group cursor-pointer">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        attachment.type === 'pdf' && "bg-red-500/10 text-red-500",
        attachment.type === 'image' && "bg-blue-500/10 text-blue-500",
        attachment.type === 'url' && "bg-violet-500/10 text-violet-500",
        attachment.type === 'doc' && "bg-amber-500/10 text-amber-500",
        attachment.type === 'text' && "bg-emerald-500/10 text-emerald-500"
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {attachment.name}
          </span>
          {getSourceBadge()}
        </div>
        {attachment.size && (
          <span className="text-xs text-muted-foreground">
            {(attachment.size / 1024).toFixed(1)} KB
          </span>
        )}
        {attachment.url && (
          <span className="text-xs text-muted-foreground truncate block">
            {attachment.url}
          </span>
        )}
      </div>
      {attachment.url && (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};

export const MessageBubble = ({ message, isStreaming, animationDelay = 0 }: MessageBubbleProps) => {
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
              <AttachmentCard key={attachment.id} attachment={attachment} />
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
