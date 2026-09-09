import React, { useState } from 'react';
import { Share2, Link, QrCode, Smartphone, Copy, Check, ExternalLink, MessageCircle, X, Wifi, Globe } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloud' | 'wifi'>('cloud');

  // Enlaces activos de acceso
  const cloudUrl = 'https://331209d47991d4.lhr.life';
  const wifiUrl = 'http://172.17.22.254:3000';

  if (!isOpen) return null;

  const currentUrl = activeTab === 'cloud' ? cloudUrl : wifiUrl;

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const whatsappShareText = encodeURIComponent(
    'Hola Dr., aquí tiene el enlace de la aplicación de Emergencia del Hospital Regional Ángel María Gatón:\n' + currentUrl
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Share2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Abrir & Compartir Aplicación
              </h3>
              <p className="text-xs text-teal-100/80">Acceso instantáneo para teléfono móvil y computadoras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'cloud'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Enlace Universal en la Nube (4G / Celular / Casa)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wifi')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'wifi'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wifi className="w-4 h-4 text-teal-700" />
            <span>Enlace Wi-Fi Hospital (Red Local)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          {/* Main Link Box */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Link className="w-4 h-4 text-teal-700" />
                <span>{activeTab === 'cloud' ? 'Enlace Universal en Internet:' : 'Enlace Local Wi-Fi:'}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                ● En Vivo
              </span>
            </div>

            <div className="p-3 bg-white border border-teal-300 rounded-xl flex items-center justify-between gap-2 shadow-xs">
              <span className="font-mono text-xs sm:text-sm font-bold text-teal-950 truncate select-all">
                {currentUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(currentUrl, 'principal')}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
              >
                {copiedLink === 'principal' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink === 'principal' ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${whatsappShareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Compartir por WhatsApp</span>
              </a>

              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Abrir en Nueva Pestaña</span>
              </a>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}`}
                alt="Código QR para abrir en celular"
                className="w-32 h-32 object-contain rounded-lg"
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                <QrCode className="w-4 h-4 text-teal-700" />
                <span>Escanea con la cámara de tu celular</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apunta la cámara de tu teléfono móvil a este código QR. Aparecerá una notificación amarilla o botón para abrir la aplicación directamente sin escribir la dirección.
              </p>
              <div className="text-[11px] font-semibold text-teal-800 bg-teal-100/60 px-2 py-1 rounded-md inline-block">
                📱 Compatible con iPhone (Cámara / Safari) y Android (Cámara / Chrome)
              </div>
            </div>
          </div>

          {/* Tips for Installing on Phone */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Cómo instalarla como App en la pantalla de inicio de tu celular:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-950 leading-relaxed">
              <li>
                <strong>En iPhone (Safari):</strong> Toca el botón <em>Compartir</em> (ícono de cuadro con flecha hacia arriba 📤) y selecciona <em>"Agregar al inicio"</em> ➕.
              </li>
              <li>
                <strong>En Android (Chrome):</strong> Toca los tres puntos arriba a la derecha (⋮) y selecciona <em>"Instalar aplicación"</em> o <em>"Agregar a pantalla principal"</em> 📲.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Hospital Regional Dr. Ángel María Gatón
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
