import { useRef, useState } from 'react';
import { Upload, ImageOff, Loader2, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useSessionPhotos } from '@/hooks/useSessionPhotos';
import type { SessionPhoto } from '@/types';

interface PhotoUploadComponentProps {
  sessionId: string | null;
}

export function PhotoUploadComponent({ sessionId }: PhotoUploadComponentProps) {
  const { photos, loading, uploadPhoto } = useSessionPhotos(sessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<SessionPhoto | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('El archivo supera el límite de 10 MB');
      e.target.value = '';
      return;
    }

    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPEG, PNG o WebP');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await uploadPhoto(file);
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (!sessionId) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fotos de la sesión
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Guarda la sesión primero para subir fotos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fotos de la sesión
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          {uploading ? 'Subiendo...' : 'Subir foto'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando fotos...</p>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-muted-foreground">
          <ImageOff className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">Sin fotos aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setViewPhoto(photo)}
              className="group relative overflow-hidden rounded-md border bg-muted aspect-square focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img
                src={photo.presigned_url}
                alt={photo.file_name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-5 w-5 text-white" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Full-size photo dialog */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">
            {viewPhoto?.file_name ?? 'Foto'}
          </DialogTitle>
          {viewPhoto && (
            <img
              src={viewPhoto.presigned_url}
              alt={viewPhoto.file_name}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
