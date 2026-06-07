import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { motion } from 'motion/react';
import { 
  X, 
  Check, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Droplets,
  Crop as CropIcon,
  Maximize2,
  Move,
  Loader2
} from 'lucide-react';

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

export default function PhotoEditor({ imageUrl, onSave, onClose }: PhotoEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    filters: { brightness: number, contrast: number, saturation: number }
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Set canvas size to the cropped area size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Apply filters to context
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

    // Draw the cropped portion of the image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || isSaving) return;
    
    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation,
        { brightness, contrast, saturation }
      );
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 lg:p-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <CropIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Photo Studio Pro</h2>
              <p className="text-xs text-slate-500 font-medium">Professional adjustments & cropping</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Workspace */}
          <div className="flex-1 relative bg-slate-100">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={4 / 3}
              onCropChange={setCrop}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              style={{
                containerStyle: {
                  backgroundColor: '#f1f5f9',
                },
                mediaStyle: {
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                }
              }}
            />
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-white/50 z-10">
              <button onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="p-1 hover:bg-slate-100 rounded">
                <Maximize2 size={16} className="text-slate-600 rotate-45" />
              </button>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32 accent-indigo-600"
              />
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 hover:bg-slate-100 rounded">
                <Maximize2 size={16} className="text-slate-600" />
              </button>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 bg-white border-l border-slate-100 p-6 space-y-8 overflow-y-auto">
            {/* Color Correction */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Droplets size={14} className="text-indigo-600" />
                Color Correction
              </h3>
              
              <div className="space-y-4">
                <AdjustmentSlider
                  label="Brightness"
                  icon={<Sun size={14} />}
                  value={brightness}
                  onChange={setBrightness}
                  min={0}
                  max={200}
                />
                <AdjustmentSlider
                  label="Contrast"
                  icon={<Contrast size={14} />}
                  value={contrast}
                  onChange={setContrast}
                  min={0}
                  max={200}
                />
                <AdjustmentSlider
                  label="Saturation"
                  icon={<Droplets size={14} />}
                  value={saturation}
                  onChange={setSaturation}
                  min={0}
                  max={200}
                />
              </div>

              <button 
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  setZoom(1);
                  setRotation(0);
                }}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg border border-dashed border-slate-200"
              >
                <RotateCcw size={12} />
                Reset All Changes
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Move size={14} className="text-indigo-600" />
                Actions
              </h3>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                {isSaving ? 'Processing...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            AI Studio Photo Engine - Non-destructive editing
          </p>
        </div>
      </motion.div>
    </div>
  );
}

interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
}

function AdjustmentSlider({ label, icon, value, onChange, min, max }: AdjustmentSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="text-indigo-600">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
}
