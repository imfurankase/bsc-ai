import { useState } from 'react';
import { 
  Upload, FileText, Globe, Type, Link2, X, File, 
  Plus, Loader2, CheckCircle2, AlertCircle, FolderUp,
  Chrome, FileCode, Database, Cloud, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { KnowledgeBase } from '@/types';

// Integration options
const integrations = [
  { id: 'google-drive', name: 'Google Drive', icon: Cloud, color: 'text-yellow-500', connected: false },
  { id: 'notion', name: 'Notion', icon: FileText, color: 'text-foreground', connected: true },
  { id: 'confluence', name: 'Confluence', icon: Database, color: 'text-blue-500', connected: false },
  { id: 'github', name: 'GitHub', icon: FileCode, color: 'text-foreground', connected: true },
  { id: 'dropbox', name: 'Dropbox', icon: FolderUp, color: 'text-blue-400', connected: false },
];

interface KnowledgeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: KnowledgeBase | null;
}

interface UrlEntry {
  id: string;
  url: string;
  status: 'pending' | 'crawling' | 'done' | 'error';
  pages?: number;
}

export const KnowledgeUploadDialog = ({ 
  open, 
  onOpenChange, 
  knowledgeBase 
}: KnowledgeUploadDialogProps) => {
  const [activeTab, setActiveTab] = useState('files');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [crawlDepth, setCrawlDepth] = useState('1');
  
  // Text state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  
  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
      // Reset state
      setUploadedFiles([]);
      setUrls([]);
      setUrlInput('');
      setTextTitle('');
      setTextContent('');
      setUploadProgress(0);
    }
  };

  // File handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // URL handling
  const addUrl = () => {
    if (!urlInput.trim()) return;
    const newUrl: UrlEntry = {
      id: Date.now().toString(),
      url: urlInput.trim(),
      status: 'pending',
    };
    setUrls(prev => [...prev, newUrl]);
    setUrlInput('');
  };

  const removeUrl = (id: string) => {
    setUrls(prev => prev.filter(u => u.id !== id));
  };

  // Simulated upload/crawl
  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            handleClose();
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleCrawlUrls = () => {
    if (urls.length === 0) return;
    setIsUploading(true);
    
    // Simulate crawling each URL
    urls.forEach((url, index) => {
      setTimeout(() => {
        setUrls(prev => prev.map(u => 
          u.id === url.id ? { ...u, status: 'crawling' } : u
        ));
        
        setTimeout(() => {
          setUrls(prev => prev.map(u => 
            u.id === url.id ? { 
              ...u, 
              status: Math.random() > 0.2 ? 'done' : 'error',
              pages: Math.floor(Math.random() * 15) + 1
            } : u
          ));
          
          if (index === urls.length - 1) {
            setTimeout(() => {
              setIsUploading(false);
            }, 500);
          }
        }, 1500 + Math.random() * 1000);
      }, index * 500);
    });
  };

  const handleAddText = () => {
    if (!textTitle.trim() || !textContent.trim()) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            handleClose();
          }, 500);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-destructive" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const canUploadFiles = uploadedFiles.length > 0 && !isUploading;
  const canCrawlUrls = urls.length > 0 && !isUploading;
  const canAddText = textTitle.trim() && textContent.trim() && !isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span>Add to {knowledgeBase?.name}</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Import knowledge from multiple sources
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full flex-shrink-0">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Website</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Connect</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Files Tab */}
            <TabsContent value="files" className="mt-0 space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                  dragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && document.getElementById('kb-file-upload')?.click()}
              >
                <input
                  id="kb-file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.doc,.docx,.md,.csv,.json,.html,.xml"
                  disabled={isUploading}
                />
                <div className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="font-semibold text-foreground mb-1">
                  {dragActive ? 'Drop files here' : 'Drop files or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, TXT, DOCX, MD, CSV, JSON, HTML, XML up to 10MB each
                </p>
              </div>

              {/* Upload Progress */}
              {isUploading && activeTab === 'files' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing documents...</span>
                    <span className="font-medium text-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* File List */}
              {uploadedFiles.length > 0 && !isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">
                      {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setUploadedFiles([])}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {uploadedFiles.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 animate-fade-in"
                      >
                        {getFileIcon(file.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleUpload}
                disabled={!canUploadFiles}
                className="w-full gradient-primary hover:opacity-90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {uploadedFiles.length > 0 ? `${uploadedFiles.length} Files` : 'Documents'}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* URL Tab */}
            <TabsContent value="url" className="mt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/docs"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={addUrl} 
                    disabled={!urlInput.trim() || isUploading}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Crawl depth:</Label>
                  <div className="flex gap-2">
                    {['1', '2', '3'].map((depth) => (
                      <Button
                        key={depth}
                        variant={crawlDepth === depth ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCrawlDepth(depth)}
                        disabled={isUploading}
                        className={crawlDepth === depth ? 'gradient-primary' : ''}
                      >
                        {depth} {depth === '1' ? 'page' : 'levels'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* URL List */}
              {urls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {urls.length} URL{urls.length > 1 ? 's' : ''} to crawl
                  </Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {urls.map((url) => (
                      <div 
                        key={url.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 animate-fade-in"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          url.status === 'done' ? 'bg-success/10' :
                          url.status === 'error' ? 'bg-destructive/10' :
                          url.status === 'crawling' ? 'bg-primary/10' :
                          'bg-muted'
                        )}>
                          {url.status === 'crawling' ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : url.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : url.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Globe className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{url.url}</p>
                          <p className="text-xs text-muted-foreground">
                            {url.status === 'crawling' ? 'Crawling pages...' :
                             url.status === 'done' ? `${url.pages} pages indexed` :
                             url.status === 'error' ? 'Failed to crawl' :
                             'Ready to crawl'}
                          </p>
                        </div>
                        {url.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => removeUrl(url.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urls.length === 0 && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-border">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Add URLs to crawl and index web content
                  </p>
                </div>
              )}

              <Button 
                onClick={handleCrawlUrls}
                disabled={!canCrawlUrls}
                className="w-full gradient-primary hover:opacity-90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Crawling websites...
                  </>
                ) : (
                  <>
                    <Chrome className="w-4 h-4 mr-2" />
                    Crawl {urls.length > 0 ? `${urls.length} URLs` : 'Websites'}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text-title">Title</Label>
                  <Input
                    id="text-title"
                    placeholder="e.g., Company FAQ, Product Overview"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    disabled={isUploading}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="text-content">Content</Label>
                  <Textarea
                    id="text-content"
                    placeholder="Paste or type your knowledge content here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={isUploading}
                    className="mt-1.5 min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {textContent.length} characters • {textContent.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
              </div>

              {/* Text Progress */}
              {isUploading && activeTab === 'text' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing text...</span>
                    <span className="font-medium text-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={handleAddText}
                disabled={!canAddText}
                className="w-full gradient-primary hover:opacity-90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Add Text Content
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect external services to automatically sync content to your knowledge base.
              </p>
              
              <div className="grid gap-3">
                {integrations.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <div 
                      key={integration.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                        integration.connected 
                          ? "bg-primary/5 border-primary/20" 
                          : "border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        integration.connected ? "gradient-primary shadow-glow" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-6 h-6",
                          integration.connected ? "text-primary-foreground" : integration.color
                        )} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.connected 
                            ? 'Connected • Click to import' 
                            : 'Click to connect'}
                        </p>
                      </div>
                      {integration.connected ? (
                        <Button size="sm" variant="outline">
                          Import
                        </Button>
                      ) : (
                        <Button size="sm" className="gradient-primary">
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Auto-sync enabled</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Connected integrations will automatically update your knowledge base when source content changes.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
