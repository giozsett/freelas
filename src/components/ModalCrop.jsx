import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import cortarImagem from '../utils/cortarImagem';
import { X } from 'lucide-react';

export default function ModalCrop({ open, image, aspect, cropShape, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await cortarImagem(image, croppedAreaPixels);
      onConfirm(blob);
    } catch (err) {
      console.error('Erro ao cortar imagem:', err);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ajustar imagem</h3>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '0.25rem', opacity: 0.6 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          background: '#222'
        }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.6, whiteSpace: 'nowrap' }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--primary)' }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          padding: '1rem 1.25rem'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn dark-text"
            onClick={handleConfirm}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
