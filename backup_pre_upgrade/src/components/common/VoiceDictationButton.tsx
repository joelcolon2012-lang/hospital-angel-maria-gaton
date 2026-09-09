import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
  label?: string;
}

export const VoiceDictationButton: React.FC<Props> = ({ onTranscript, className = '', label }) => {
  const { isSupported, isListening, startListening, stopListening } = useVoiceDictation();

  if (!isSupported) {
    return null;
  }

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        onTranscript(text);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? 'Detener dictado por voz' : 'Dictar por voz (Web Speech API)'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        isListening
          ? 'bg-red-600 text-white animate-pulse shadow-md ring-2 ring-red-400'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
      } ${className}`}
    >
      {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-petrol-800" />}
      <span>{isListening ? 'Grabando...' : label || 'Dictar'}</span>
    </button>
  );
};
