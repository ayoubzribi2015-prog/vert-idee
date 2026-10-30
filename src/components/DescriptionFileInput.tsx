import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, Loader2, Sparkles } from 'lucide-react';

interface ImportedFileItem {
  name: string;
  size: string;
}

interface DescriptionFileInputProps {
  value: string;
  onChange: (newValue: string) => void;
  onFullContentChange?: (fullContent: string) => void;
  onSuggestedTitle?: (title: string) => void;
  onSuggestedLocation?: (location: string) => void;
  currentTitle?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export const DescriptionFileInput: React.FC<DescriptionFileInputProps> = ({
  value,
  onChange,
  onFullContentChange,
  onSuggestedTitle,
  onSuggestedLocation,
  currentTitle,
  placeholder = "Détaillez le fonctionnement de votre produit ou service : quel problème résout-il ? En quoi l'approche est-elle écologique ? Quels sont les matériaux, procédés durables ou innovations circulaires envisagés ?",
  required = true,
  rows = 7,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedFileItem[]>([]);
  const [aiEnhancedCount, setAiEnhancedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const processFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const validFiles = fileArray.filter((f) => f.size <= 15 * 1024 * 1024);
    if (validFiles.length === 0) {
      setErrorMsg('Les fichiers sélectionnés dépassent la taille maximale autorisée (15 Mo).');
      return;
    }

    if (fileArray.length > validFiles.length) {
      setErrorMsg(`${fileArray.length - validFiles.length} fichier(s) dépassent 15 Mo et ont été ignorés.`);
    }

    setIsExtracting(true);
    setExtractionStatus(
      validFiles.length > 1
        ? `Lecture et résumé fidèle de ${validFiles.length} documents importés...`
        : `Lecture et résumé fidèle de ${validFiles[0].name}...`
    );

    try {
      // Préparation et conversion Base64 de l'ensemble des fichiers
      const payloadFiles = await Promise.all(
        validFiles.map(async (file) => {
          const isTextLike = /\.(txt|md|csv|tsv|json|rtf|log)$/i.test(file.name) || file.type.startsWith('text/');
          let localText = '';
          if (isTextLike) {
            try {
              localText = await file.text();
            } catch (e) {
              console.warn('Local file text read failed:', e);
            }
          }

          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1] || result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          return {
            filename: file.name,
            mimeType: file.type || (isTextLike ? 'text/plain' : 'application/octet-stream'),
            base64Data: base64,
            localText,
            size: file.size,
          };
        })
      );

      // Appel de l'API de synthèse collective selon les 3 piliers méthodologiques
      const res = await fetch('/api/extract-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: payloadFiles.map(({ filename, mimeType, base64Data, localText }) => ({
            filename,
            mimeType,
            base64Data,
            localText,
          })),
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error('Les documents dépassent la taille maximale autorisée (15 Mo).');
        }
        if (res.status === 504 || res.status === 502) {
          throw new Error('Le délai de lecture a expiré. Veuillez vérifier que les fichiers ne sont pas corrompus.');
        }
        throw new Error(`Erreur réseau (${res.status}) lors de l'extraction des documents.`);
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Impossible d'extraire le contenu des documents.");
      }

      const synthesizedText = data.extractedText || '';
      const rawFullText = data.rawFullText || '';
      const suggestedTitle = data.suggestedTitle || '';
      const suggestedLocation = data.suggestedLocation || '';

      if (synthesizedText) {
        onChange(synthesizedText);
      }

      if (rawFullText && onFullContentChange) {
        onFullContentChange(rawFullText);
      }

      if (!currentTitle?.trim() && suggestedTitle && onSuggestedTitle) {
        onSuggestedTitle(suggestedTitle);
      }

      if (suggestedLocation && onSuggestedLocation) {
        onSuggestedLocation(suggestedLocation);
      }

      if (data.isAIEnhanced) {
        setAiEnhancedCount((prev) => prev + 1);
      }

      const newChips: ImportedFileItem[] = validFiles.map((f) => ({
        name: f.name,
        size: formatFileSize(f.size),
      }));
      setImportedFiles((prev) => [...prev, ...newChips]);
    } catch (err: any) {
      console.error('Batch file import error:', err);
      setErrorMsg(err.message || "Erreur lors de l'importation des documents.");
    } finally {
      setIsExtracting(false);
      setExtractionStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setImportedFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0 && onFullContentChange) {
        onFullContentChange('');
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Label and Upload Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
          Description de l'idée de projet & Proposition de valeur {required && <span className="text-[#10634e]">*</span>}
        </label>

        {/* Import multiple files button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#edf5f0] hover:bg-[#e1ede6] text-[#063428] border border-[#0b4a3a]/30 transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
            title="Importer un ou plusieurs fichiers PDF, Word, Excel, Texte ou Images (JPG, PNG) pour renseigner la description"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#10634e] animate-spin" />
                <span>Extraction multiple...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-[#10634e]" />
                <span>Importer documents (PDF, Word, Excel, JPG, PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Textarea with Drag & Drop Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl transition-all ${
          isDragging
            ? 'ring-2 ring-[#10634e] bg-[#edf5f0]/40 border-[#10634e]'
            : ''
        }`}
      >
        <textarea
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={isExtracting}
          className={`w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl border text-base sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#10634e]/20 focus:border-[#10634e] transition-all resize-y shadow-2xs leading-relaxed min-h-[130px] ${
            isDragging ? 'border-[#10634e] bg-[#edf5f0]/20' : 'border-stone-300 bg-white'
          }`}
        />

        {/* Loading overlay when extracting files */}
        {isExtracting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-2xs rounded-xl flex flex-col items-center justify-center gap-2.5 p-4 z-10 border border-stone-200">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-3 border-stone-200 border-t-[#063428] animate-spin" />
              <FileText className="w-4 h-4 text-[#10634e] absolute inset-0 m-auto" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-stone-800">
                {extractionStatus || 'Extraction multiple en cours...'}
              </p>
              <p className="text-[11px] text-slate-500">
                Lecture et synthèse intelligente des documents
              </p>
            </div>
          </div>
        )}

        {/* Drag over cue */}
        {isDragging && !isExtracting && (
          <div className="absolute inset-0 bg-emerald-50/90 border-2 border-dashed border-emerald-500 rounded-2xl flex items-center justify-center gap-2 pointer-events-none z-10">
            <UploadCloud className="w-6 h-6 text-emerald-700 animate-bounce" />
            <span className="text-xs font-bold text-emerald-900">
              Déposez vos documents ici (plusieurs fichiers acceptés)
            </span>
          </div>
        )}
      </div>

      {/* AI Enhanced success badge */}
      {aiEnhancedCount > 0 && !isExtracting && (
        <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-gradient-to-r from-[#edf5f0] to-[#e1ede6] border border-[#10634e]/30 text-xs text-[#063428] shadow-2xs animate-in fade-in">
          <Sparkles className="w-4 h-4 text-[#10634e] shrink-0" />
          <div className="leading-snug">
            <span className="font-bold">Résumé fidèle extrait des documents importés :</span>{' '}
            <span className="text-stone-700">
              Description brève structurée selon les termes exacts de vos documents (sans interprétation ni ajout extérieur).
            </span>
          </div>
        </div>
      )}

      {/* Imported Files Success Chips */}
      {importedFiles.length > 0 && !isExtracting && (
        <div className="space-y-1.5 p-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-in fade-in">
          <div className="font-bold flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importedFiles.length} document{importedFiles.length > 1 ? 's importés' : ' importé'} avec succès :</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {importedFiles.map((f, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg text-xs shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold truncate max-w-[180px]">{f.name}</span>
                <span className="text-[10px] text-slate-400">({f.size})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-0.5"
                  title="Retirer ce fichier"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-900 p-1 hover:bg-rose-100 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Format tip */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Sélectionnez ou glissez plusieurs fichiers simultanément (PDF, Word, Excel, TXT)</span>
        {value.length > 0 && (
          <span className="font-mono-numbers text-slate-400">
            {value.length} caractères
          </span>
        )}
      </div>
    </div>
  );
};
