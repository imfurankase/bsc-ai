import { useState } from 'react';
import { Database, FileText, Search, Check, FolderOpen, Clock, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import type { MessageAttachment } from '@/types';

interface KnowledgeBasePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (attachments: MessageAttachment[]) => void;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'text';
  size: number;
  knowledgeBaseId: string;
  addedAt: Date;
}

// Mock documents for demo
const mockDocuments: Document[] = [
  { id: '1', name: 'Product Overview.pdf', type: 'pdf', size: 2457600, knowledgeBaseId: '1', addedAt: new Date(Date.now() - 86400000) },
  { id: '2', name: 'API Documentation.md', type: 'text', size: 156000, knowledgeBaseId: '1', addedAt: new Date(Date.now() - 172800000) },
  { id: '3', name: 'User Guide.docx', type: 'doc', size: 890000, knowledgeBaseId: '1', addedAt: new Date(Date.now() - 259200000) },
  { id: '4', name: 'Technical Specs.pdf', type: 'pdf', size: 1234000, knowledgeBaseId: '2', addedAt: new Date(Date.now() - 345600000) },
  { id: '5', name: 'Integration Guide.pdf', type: 'pdf', size: 567000, knowledgeBaseId: '2', addedAt: new Date(Date.now() - 432000000) },
  { id: '6', name: 'FAQ.txt', type: 'text', size: 45000, knowledgeBaseId: '1', addedAt: new Date(Date.now() - 518400000) },
];

const externalSources = [
  { id: 'gdrive', name: 'Google Drive', icon: '📁', description: 'Access documents from Drive' },
  { id: 'notion', name: 'Notion', icon: '📝', description: 'Import Notion pages' },
  { id: 'confluence', name: 'Confluence', icon: '📚', description: 'Connect Atlassian docs' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', description: 'Access Dropbox files' },
];

export const KnowledgeBasePickerDialog = ({ open, onOpenChange, onSelect }: KnowledgeBasePickerDialogProps) => {
  const { knowledgeBases } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [activeKB, setActiveKB] = useState<string | null>(null);

  const filteredDocs = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesKB = activeKB ? doc.knowledgeBaseId === activeKB : true;
    return matchesSearch && matchesKB;
  });

  const toggleDoc = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const attachments: MessageAttachment[] = Array.from(selectedDocs).map(docId => {
      const doc = mockDocuments.find(d => d.id === docId)!;
      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        source: 'knowledge-base' as const,
        knowledgeBaseId: doc.knowledgeBaseId,
      };
    });
    onSelect(attachments);
    setSelectedDocs(new Set());
    onOpenChange(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'doc': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'text': return <FileText className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            Add from Sources
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="knowledge-base" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-6 h-auto py-0">
            <TabsTrigger 
              value="knowledge-base" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <Database className="w-4 h-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger 
              value="external" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              External Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge-base" className="m-0 p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            {/* KB Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeKB === null ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveKB(null)}
                className="rounded-full h-8"
              >
                All
              </Button>
              {knowledgeBases.map(kb => (
                <Button
                  key={kb.id}
                  variant={activeKB === kb.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveKB(kb.id)}
                  className="rounded-full h-8"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  {kb.name}
                </Button>
              ))}
            </div>

            {/* Documents List */}
            <ScrollArea className="h-[300px] -mx-4 px-4">
              <div className="space-y-2">
                {filteredDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedDocs.has(doc.id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      doc.type === 'pdf' && "bg-red-500/10",
                      doc.type === 'doc' && "bg-blue-500/10",
                      doc.type === 'text' && "bg-emerald-500/10"
                    )}>
                      {getDocIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{doc.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.addedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedDocs.has(doc.id)
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}>
                      {selectedDocs.has(doc.id) && (
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="external" className="m-0 p-4">
            <div className="grid grid-cols-2 gap-3">
              {externalSources.map(source => (
                <button
                  key={source.id}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {source.icon}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{source.name}</div>
                    <div className="text-xs text-muted-foreground">{source.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Connect your external sources to access documents directly in chat
            </p>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedDocs.size === 0} className="rounded-xl">
              Add to Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
