import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, Loader2, Sparkles } from 'lucide-react';

interface ImportedFileItem {
  name: string;
  size: string;
}

interface DescriptionFileInputProps {
  value: string;
  onChange: (newValue: string) => void;
  onSuggestedTitle?: (title: string) => void;
  currentTitle?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export const DescriptionFileInput: React.FC<DescriptionFileInputProps> = ({
  value,
  onChange,
  onSuggestedTitle,
  currentTitle,
  placeholder = "Détaillez le fonctionnement de votre produit ou service : quel problème résout-il ? En quoi l'approche est-elle écologique ? Quels sont les matériaux, procédés durables ou innovations circulaires envisagés ?",
  required = true,
  rows = 5,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedFileItem[]>([]);
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

    setIsExtracting(true);
    let accumulatedText = value;
    const newImported: ImportedFileItem[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setExtractionStatus(`Traitement du fichier ${i + 1} sur ${fileArray.length} (${file.name})...`);

        if (file.size > 15 * 1024 * 1024) {
          setErrorMsg(`Le fichier "${file.name}" est trop volumineux (max 15 Mo) et a été ignoré.`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1] || result;
            resolve(base64Data);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const res = await fetch('/api/extract-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Erreur d'extraction pour ${file.name}`);
        }

        let fileExtracted = data.extractedText || '';

        if (!currentTitle?.trim() && data.suggestedTitle && onSuggestedTitle) {
          onSuggestedTitle(data.suggestedTitle);
        }

        if (fileExtracted) {
          if (!accumulatedText.trim()) {
            accumulatedText = fileExtracted;
          } else {
            accumulatedText = `${accumulatedText}\n\n[Document importé : ${file.name}] :\n${fileExtracted}`;
          }
          newImported.push({ name: file.name, size: formatFileSize(file.size) });
        }
      }

      onChange(accumulatedText);
      setImportedFiles((prev) => [...prev, ...newImported]);
    } catch (err: any) {
      console.error('Batch file import error:', err);
      setErrorMsg(err.message || "Erreur lors de l'importation des fichiers.");
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
    setImportedFiles((prev) => prev.filter((_, idx) => idx !== index));
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
            accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.rtf"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#edf5f0] hover:bg-[#e1ede6] text-[#063428] border border-[#0b4a3a]/30 transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
            title="Importer un ou plusieurs fichiers PDF, Word, Excel ou Texte pour renseigner la description"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#10634e] animate-spin" />
                <span>Extraction multiple...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-[#10634e]" />
                <span>Importer documents (PDF, Word, Excel, TXT)</span>
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
