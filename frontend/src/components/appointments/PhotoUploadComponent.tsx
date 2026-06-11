import { useRef, useState } from 'react';
import { Upload, ImageOff, Loader2, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useSessionPhotos } from '@/hooks/useSessionPhotos';
import api from '@/lib/api';
import type { SessionPhoto } from '@/types';

interface PhotoUploadComponentProps {
  sessionId: string | null;
  appointmentId?: string;
  patientId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export function PhotoUploadComponent({
  sessionId,
  appointmentId,
  patientId,
  onSessionCreated,
}: PhotoUploadComponentProps) {
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const effectiveSessionId = localSessionId ?? sessionId;

  const { photos, loading, refetch } = useSessionPhotos(effectiveSessionId);
  // Always points to the latest refetch (correct sessionId after re-render)
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<SessionPhoto | null>(null);

  const canUpload =
    effectiveSessionId !== null || (!!appointmentId && !!patientId);

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
      let sid = effectiveSessionId;

      // Auto-create a session if we have appointment context but no session yet
      if (!sid && appointmentId && patientId) {
        const { data } = await api.post<{ id: string }>('/sessions', {
          appointment_id: appointmentId,
          patient_id: patientId,
          procedures_performed: '',
        });
        sid = data.id;
        setLocalSessionId(sid);
        onSessionCreated?.(sid);
      }

      if (!sid) {
        toast.error('No se pudo determinar la sesión');
        return;
      }

      // Upload directly with the resolved sid (not via hook closure)
      const { data: uploadData } = await api.post<{
        photo_id: string;
        upload_url: string;
      }>(`/sessions/${sid}/photos/upload-url`, {
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
      });

      await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      await api.post(`/sessions/${sid}/photos/${uploadData.photo_id}/confirm`);

      toast.success('Foto subida correctamente');
      // By this point React has re-rendered with localSessionId set,
      // so refetchRef.current uses the correct sid
      await refetchRef.current();
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (!canUpload) {
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
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
