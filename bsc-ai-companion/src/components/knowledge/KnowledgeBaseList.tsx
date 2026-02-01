import { useState } from 'react';
import { 
  Database, Plus, Upload, FileText, Trash2, Search, 
  File, FileType, X, Eye, FolderOpen, Clock, ArrowLeft,
  MoreVertical, Link2, Bot, Edit, Settings, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import type { KnowledgeBase } from '@/types';
import { KnowledgeUploadDialog } from './KnowledgeUploadDialog';

// Mock documents for demo
const mockDocuments: Record<string, Array<{ id: string; name: string; type: string; size: string; uploadedAt: Date; status: 'processed' | 'processing' | 'error' }>> = {
  '1': [
    { id: '1', name: 'Product Guide.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: new Date(Date.now() - 86400000), status: 'processed' },
    { id: '2', name: 'API Documentation.md', type: 'md', size: '156 KB', uploadedAt: new Date(Date.now() - 172800000), status: 'processed' },
    { id: '3', name: 'FAQ.txt', type: 'txt', size: '24 KB', uploadedAt: new Date(Date.now() - 259200000), status: 'processing' },
  ],
  '2': [
    { id: '4', name: 'Setup Instructions.pdf', type: 'pdf', size: '1.8 MB', uploadedAt: new Date(Date.now() - 86400000), status: 'processed' },
    { id: '5', name: 'Troubleshooting Guide.docx', type: 'docx', size: '890 KB', uploadedAt: new Date(Date.now() - 172800000), status: 'error' },
  ],
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-destructive" />;
    case 'docx':
    case 'doc':
      return <FileType className="w-5 h-5 text-info" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: 'processed' | 'processing' | 'error') => {
  switch (status) {
    case 'processed':
      return (
        <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Processed
        </span>
      );
    case 'processing':
      return (
        <span className="flex items-center gap-1 text-xs text-info bg-info/10 px-2 py-0.5 rounded-full animate-pulse">
          <div className="w-3 h-3 border-2 border-info border-t-transparent rounded-full animate-spin" />
          Processing
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Error
        </span>
      );
  }
};

export const KnowledgeBaseList = () => {
  const { knowledgeBases, chatbots, activeWorkspaceId, createKnowledgeBase } = useAppStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadKB, setUploadKB] = useState<KnowledgeBase | null>(null);
  const [newKB, setNewKB] = useState({ name: '', description: '' });

  const workspaceKBs = knowledgeBases
    .filter(kb => kb.workspaceId === activeWorkspaceId)
    .filter(kb => kb.name.toLowerCase().includes(search.toLowerCase()));

  // Get connected chatbots for a KB
  const getConnectedChatbots = (kbId: string) => {
    return chatbots.filter(bot => bot.knowledgeBaseIds.includes(kbId));
  };

  const handleCreate = () => {
    if (!newKB.name.trim()) return;
    createKnowledgeBase({
      name: newKB.name,
      description: newKB.description,
      workspaceId: activeWorkspaceId || '1',
    });
    setNewKB({ name: '', description: '' });
    setShowCreate(false);
  };

  const openUploadDialog = (kb: KnowledgeBase) => {
    setUploadKB(kb);
    setShowUpload(true);
  };

  // View Knowledge Base Details
  if (selectedKB) {
    const documents = mockDocuments[selectedKB.id] || [];
    const connectedBots = getConnectedChatbots(selectedKB.id);
    const processedCount = documents.filter(d => d.status === 'processed').length;
    
    return (
      <div className="p-8 space-y-6 animate-fade-in bg-gradient-to-b from-background to-muted/20 min-h-full">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedKB(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <Database className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{selectedKB.name}</h1>
                <p className="text-muted-foreground mt-1">{selectedKB.description || 'No description'}</p>
              </div>
            </div>
          </div>
          <Button 
            className="gradient-primary hover:opacity-90 shadow-glow"
            onClick={() => openUploadDialog(selectedKB)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{processedCount}</p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{connectedBots.length}</p>
                <p className="text-sm text-muted-foreground">Connected Bots</p>
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
                  {new Date(selectedKB.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Chatbots */}
        {connectedBots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="w-4 h-4 text-primary" />
                Connected Chatbots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {connectedBots.map((bot) => (
                  <div 
                    key={bot.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{bot.name}</span>
                    <span className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Documents
            </CardTitle>
            <Button 
              size="sm"
              onClick={() => openUploadDialog(selectedKB)}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
                <Button 
                  className="gradient-primary"
                  onClick={() => openUploadDialog(selectedKB)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div 
                    key={doc.id}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all group animate-fade-in border border-transparent hover:border-border/50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.size} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
          <h1 className="text-3xl font-bold text-foreground">Knowledge Bases</h1>
          <p className="text-muted-foreground mt-1">Manage document collections to enhance AI responses</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gradient-primary hover:opacity-90 shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Create Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary-foreground" />
                </div>
                Create Knowledge Base
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  value={newKB.name}
                  onChange={(e) => setNewKB(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Product Documentation"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="kb-desc">Description</Label>
                <Textarea
                  id="kb-desc"
                  value={newKB.description}
                  onChange={(e) => setNewKB(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What documents will this contain?"
                  className="mt-1.5"
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!newKB.name}
                className="w-full gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Knowledge Base
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge bases..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{workspaceKBs.length}</span>
            <span className="text-sm text-muted-foreground">Knowledge Bases</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {Object.values(mockDocuments).flat().length}
            </span>
            <span className="text-sm text-muted-foreground">Documents</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {workspaceKBs.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 blur-2xl opacity-30 gradient-primary rounded-full scale-150" />
              <div className="relative w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <Database className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search ? 'No results found' : 'Create your first knowledge base'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {search 
                ? 'Try adjusting your search terms'
                : 'Knowledge bases store documents that your AI chatbots can reference to provide accurate, contextual responses.'
              }
            </p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="gradient-primary hover:opacity-90 shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Create Knowledge Base
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaceKBs.map((kb, index) => {
            const documents = mockDocuments[kb.id] || [];
            const connectedBots = getConnectedChatbots(kb.id);
            const totalSize = documents.reduce((acc, doc) => {
              const size = parseFloat(doc.size);
              return acc + (doc.size.includes('MB') ? size : size / 1000);
            }, 0);
            
            return (
              <Card 
                key={kb.id} 
                className="group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 75}ms` }}
                onClick={() => setSelectedKB(kb)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 gradient-primary opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-subtle flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Database className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{kb.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {documents.length} documents • {totalSize.toFixed(1)} MB
                        </p>
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
                          openUploadDialog(kb);
                        }}>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Documents
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
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
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {kb.description || 'No description provided'}
                  </p>

                  {/* Connected bots */}
                  {connectedBots.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Connected to {connectedBots.length} chatbot{connectedBots.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        openUploadDialog(kb);
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Upload
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKB(kb);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <KnowledgeUploadDialog
        open={showUpload}
        onOpenChange={(open) => {
          setShowUpload(open);
          if (!open) setUploadKB(null);
        }}
        knowledgeBase={uploadKB}
      />
    </div>
  );
};
