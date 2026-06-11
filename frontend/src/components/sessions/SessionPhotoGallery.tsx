import { useRef } from 'react';
import { Trash2, Upload, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionPhotos } from '@/hooks/useSessionPhotos';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

interface SessionPhotoGalleryProps {
  sessionId: string;
}

export function SessionPhotoGallery({ sessionId }: SessionPhotoGalleryProps) {
  const { photos, loading, uploadPhoto, deletePhoto } =
    useSessionPhotos(sessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo supera el límite de 10 MB');
      e.target.value = '';
      return;
    }

    try {
      await uploadPhoto(file);
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      e.target.value = '';
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await deletePhoto(photoId);
      toast.success('Foto eliminada');
    } catch {
      toast.error('No se pudo eliminar la foto');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Fotos de la sesión</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          Subir foto
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <ImageOff className="h-8 w-8" />
          <p className="text-sm">Sin fotos aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-md overflow-hidden border"
            >
              <img
                src={photo.presigned_url}
                alt={photo.file_name}
                className="w-full h-32 object-cover"
              />
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Eliminar ${photo.file_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
