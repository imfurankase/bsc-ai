import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { X, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: {
        url: string;
        type: 'image' | 'pdf' | 'text' | string;
        name: string;
    } | null;
}

export const FilePreviewDialog = ({ open, onOpenChange, file }: FilePreviewProps) => {
    if (!file) return null;

    const isImage = file.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => file.name.toLowerCase().endsWith(ext));
    const isPdf = file.type === 'pdf' || file.name.toLowerCase().endsWith('.pdf');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-white/10">
                <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="truncate pr-8 text-foreground">{file.name}</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="hover:bg-white/10"
                            title="Download"
                        >
                            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="hover:bg-white/10"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-black/20 p-4 flex items-center justify-center relative">
                    {isImage ? (
                        <img
                            src={file.url}
                            alt={file.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={file.url}
                            className="w-full h-full rounded-lg bg-white"
                            title={file.name}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <p>Preview not available for this file type.</p>
                            <Button asChild variant="secondary">
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    Open in New Tab
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
