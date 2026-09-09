import React, { useState } from 'react';
import { MedicalStudy, StudyCategory, StudyStatus } from '../../types';
import { Plus, Image as ImageIcon, ZoomIn, RotateCw, Columns, Trash2, Download, Eye } from 'lucide-react';

interface Props {
  patientId: string;
  studies: MedicalStudy[];
  onAddStudy: (study: Partial<MedicalStudy>) => void;
  onDeleteStudy: (studyId: string) => void;
  onOpenCompare: (s1: MedicalStudy, s2: MedicalStudy) => void;
}

export const StudiesGalleryTab: React.FC<Props> = ({
  patientId,
  studies,
  onAddStudy,
  onDeleteStudy,
  onOpenCompare,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory | 'Todas'>('Todas');
  const [activeViewerStudy, setActiveViewerStudy] = useState<MedicalStudy | null>(null);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newStudyForm, setNewStudyForm] = useState({
    category: 'Electrocardiograma' as StudyCategory,
    title: '',
    anatomicalRegion: '',
    description: '',
    preliminaryInterpretation: '',
    status: 'Informado' as StudyStatus,
    imageDataUrl: '',
  });

  const categories: (StudyCategory | 'Todas')[] = [
    'Todas',
    'Electrocardiograma',
    'Radiografía',
    'Tomografía',
    'Ultrasonido',
    'Laboratorio',
    'Fotografía clínica',
  ];

  const filteredStudies = studies.filter(
    (s) => selectedCategory === 'Todas' || s.category === selectedCategory
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewStudyForm((prev) => ({
          ...prev,
          imageDataUrl: uploadEvent.target?.result as string,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyForm.title || !newStudyForm.imageDataUrl) {
      alert('Por favor selecciona una imagen y un título para el estudio.');
      return;
    }

    onAddStudy({
      patientId,
      category: newStudyForm.category,
      title: newStudyForm.title,
      anatomicalRegion: newStudyForm.anatomicalRegion || 'General',
      description: newStudyForm.description,
      preliminaryInterpretation: newStudyForm.preliminaryInterpretation,
      officialResult: newStudyForm.preliminaryInterpretation,
      status: newStudyForm.status,
      tags: [newStudyForm.category],
      imageDataUrl: newStudyForm.imageDataUrl,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: 'Dr. Colón',
    });

    setIsAddModalOpen(false);
    setNewStudyForm({
      category: 'Electrocardiograma',
      title: '',
      anatomicalRegion: '',
      description: '',
      preliminaryInterpretation: '',
      status: 'Informado',
      imageDataUrl: '',
    });
  };

  const handleClearAllStudies = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar los ${studies.length} estudios e imágenes de este paciente?`)) {
      studies.forEach((s) => onDeleteStudy(s.id));
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Filter and buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0F4C5C] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {studies.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllStudies}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Eliminar todos los estudios del paciente"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Eliminar Todos</span>
            </button>
          )}

          {studies.length >= 2 && (
            <button
              type="button"
              onClick={() => onOpenCompare(studies[0], studies[1])}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Columns className="w-3.5 h-3.5 text-emerald-400" />
              <span>Comparar 2</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Estudio</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredStudies.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No hay imágenes registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
              <div
                onClick={() => {
                  setActiveViewerStudy(study);
                  setRotationDegree(0);
                  setZoomLevel(1);
                }}
                className="h-44 bg-slate-900 cursor-pointer relative group flex items-center justify-center"
              >
                {study.imageDataUrl ? (
                  <img
                    src={study.imageDataUrl}
                    alt={study.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">Sin vista previa</div>
                )}
                <div className="absolute top-2 left-2 bg-[#0F4C5C] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {study.category}
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{study.title}</h4>
                  <p className="text-[11px] text-slate-500">{study.anatomicalRegion} • {study.createdAt}</p>
                  {study.preliminaryInterpretation && (
                    <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-2">
                      <strong>Hallazgos: </strong>{study.preliminaryInterpretation}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setActiveViewerStudy(study);
                      setRotationDegree(0);
                      setZoomLevel(1);
                    }}
                    className="text-petrol-900 font-bold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ampliar</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar estudio "${study.title}"?`)) {
                        onDeleteStudy(study.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2 py-0.5 rounded transition-all shadow-xs"
                    title="Eliminar este estudio"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeViewerStudy && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col text-white p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/20">
            <div>
              <h3 className="font-bold text-base">{activeViewerStudy.title}</h3>
              <p className="text-xs text-slate-300">{activeViewerStudy.category} • {activeViewerStudy.anatomicalRegion}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotationDegree((r) => (r + 90) % 360)}
                className="p-2 bg-white/10 rounded-xl text-xs flex items-center gap-1"
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotar 90°</span>
              </button>
              <button
                onClick={() => setZoomLevel((z) => (z >= 2.5 ? 1 : z + 0.5))}
                className="p-2 bg-white/10 rounded-xl text-xs flex items-center gap-1"
              >
                <ZoomIn className="w-4 h-4" />
                <span>{zoomLevel}x</span>
              </button>
              <button
                onClick={() => setActiveViewerStudy(null)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold ml-2"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={activeViewerStudy.imageDataUrl}
              alt={activeViewerStudy.title}
              style={{
                transform: `rotate(${rotationDegree}deg) scale(${zoomLevel})`,
                transition: 'transform 0.2s ease-in-out',
              }}
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-petrol-900">Cargar Imagen o ECG</h3>
            <form onSubmit={handleCreateStudy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={newStudyForm.category}
                  onChange={(e) => setNewStudyForm((prev) => ({ ...prev, category: e.target.value as StudyCategory }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold"
                >
                  <option value="Electrocardiograma">Electrocardiograma (ECG)</option>
                  <option value="Radiografía">Radiografía</option>
                  <option value="Tomografía">Tomografía</option>
                  <option value="Ultrasonido">Ultrasonido (POCUS)</option>
                  <option value="Laboratorio">Laboratorio / Reporte</option>
                  <option value="Fotografía clínica">Fotografía clínica</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={newStudyForm.title}
                  onChange={(e) => setNewStudyForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. ECG 12D de ingreso..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Archivo de imagen o Foto *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                />
              </div>

              {newStudyForm.imageDataUrl && (
                <div className="h-28 bg-slate-100 rounded-xl p-1 flex items-center justify-center">
                  <img src={newStudyForm.imageDataUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Interpretación Preliminar</label>
                <textarea
                  rows={2}
                  value={newStudyForm.preliminaryInterpretation}
                  onChange={(e) => setNewStudyForm((prev) => ({ ...prev, preliminaryInterpretation: e.target.value }))}
                  placeholder="Signos patológicos..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
