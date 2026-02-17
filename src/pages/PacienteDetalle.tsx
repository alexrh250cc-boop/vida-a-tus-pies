import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Patient, FichaPodologica, ClinicalNote, PatientFile } from '../types';
import { useAuth } from '../lib/auth';
import { 
    ArrowLeft, Save, Plus, FileText, Trash2, 
    Edit, Printer, Activity, Download, X,
    Calendar, Cake
} from 'lucide-react';
import FichaPodologicaModal from '../components/ui/FichaPodologicaModal';

export default function PacienteDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [fichas, setFichas] = useState<FichaPodologica[]>([]);
    const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
    const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'fichas' | 'historial' | 'archivos'>('info');
    const [loading, setLoading] = useState(true);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);
    
    // Modal states
    const [showFichaModal, setShowFichaModal] = useState(false);
    const [selectedFicha, setSelectedFicha] = useState<FichaPodologica | null>(null);
    
    // Edit mode for patient info
    const [isEditing, setIsEditing] = useState(false);
    const [editedPatient, setEditedPatient] = useState<Partial<Patient>>({});
    const [savingPatient, setSavingPatient] = useState(false);
    
    // Clinical notes modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
    const [noteForm, setNoteForm] = useState({
        title: '',
        content: '',
        note_date: new Date().toISOString().split('T')[0]
    });
    const [savingNote, setSavingNote] = useState(false);
    
    // File upload
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        if (id) {
            loadPatientData();
        }
    }, [id]);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            const patientData = await api.getPatient(id!);
            setPatient(patientData);
            setEditedPatient(patientData || {});
            
            await Promise.all([
                loadFichas(),
                loadClinicalNotes(),
                loadPatientFiles()
            ]);
        } catch (error) {
            console.error('Error cargando paciente:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFichas = async () => {
        if (!id) return;
        try {
            const fichasData = await api.getFichasByPatient(id);
            setFichas(fichasData);
        } catch (error) {
            console.error('Error cargando fichas:', error);
        }
    };

    const loadClinicalNotes = async () => {
        if (!id) return;
        try {
            setLoadingNotes(true);
            const notes = await api.getClinicalNotes(id);
            setClinicalNotes(notes);
        } catch (error) {
            console.error('Error cargando notas clínicas:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const loadPatientFiles = async () => {
        if (!id) return;
        try {
            setLoadingFiles(true);
            const files = await api.getPatientFiles(id);
            setPatientFiles(files);
        } catch (error) {
            console.error('Error cargando archivos:', error);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDeleteFicha = async (fichaId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta ficha? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            await api.deleteFicha(fichaId);
            await loadFichas();
            alert('Ficha eliminada correctamente');
        } catch (error: any) {
            console.error('Error eliminando ficha:', error);
            alert('Error al eliminar ficha: ' + error.message);
        }
    };

    // Funciones para editar paciente
    const handleEditToggle = () => {
        if (isEditing) {
            // Cancelar edición
            setEditedPatient(patient || {});
        }
        setIsEditing(!isEditing);
    };

    const handlePatientChange = (field: keyof Patient, value: string) => {
        setEditedPatient({ ...editedPatient, [field]: value });
    };

    const handleSavePatient = async () => {
        if (!patient?.id) return;
        
        setSavingPatient(true);
        try {
            const updated = await api.updatePatient(patient.id, editedPatient);
            setPatient(updated);
            setIsEditing(false);
            alert('Datos actualizados correctamente');
        } catch (error: any) {
            console.error('Error actualizando paciente:', error);
            alert('Error al actualizar: ' + error.message);
        } finally {
            setSavingPatient(false);
        }
    };

    // Calcular edad desde fecha de nacimiento
    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Funciones para notas clínicas
    const openNoteModal = (note?: ClinicalNote) => {
        if (note) {
            setEditingNote(note);
            setNoteForm({
                title: note.title,
                content: note.content,
                note_date: note.note_date.split('T')[0]
            });
        } else {
            setEditingNote(null);
            setNoteForm({
                title: '',
                content: '',
                note_date: new Date().toISOString().split('T')[0]
            });
        }
        setShowNoteModal(true);
    };

    const handleNoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        
        setSavingNote(true);
        try {
            if (editingNote) {
                await api.updateClinicalNote(editingNote.id, {
                    title: noteForm.title,
                    content: noteForm.content,
                    note_date: noteForm.note_date
                });
                alert('Nota actualizada correctamente');
            } else {
                await api.createClinicalNote({
                    patient_id: id,
                    professional_id: user?.id,
                    title: noteForm.title,
                    content: noteForm.content,
                    note_date: noteForm.note_date
                });
                alert('Nota creada correctamente');
            }
            setShowNoteModal(false);
            await loadClinicalNotes();
        } catch (error: any) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar nota: ' + error.message);
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta nota?')) return;
        
        try {
            await api.deleteClinicalNote(noteId);
            await loadClinicalNotes();
            alert('Nota eliminada correctamente');
        } catch (error: any) {
            console.error('Error eliminando nota:', error);
            alert('Error al eliminar nota: ' + error.message);
        }
    };

    // Funciones para archivos
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploadingFile(true);
        try {
            await api.uploadPatientFile(id, file);
            await loadPatientFiles();
            alert('Archivo subido correctamente');
        } catch (error: any) {
            console.error('Error subiendo archivo:', error);
            alert('Error al subir archivo: ' + error.message);
        } finally {
            setUploadingFile(false);
            e.target.value = '';
        }
    };

    const handleDeleteFile = async (file: PatientFile) => {
        if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
        
        try {
            await api.deletePatientFile(file.id, file.file_path);
            await loadPatientFiles();
            alert('Archivo eliminado correctamente');
        } catch (error: any) {
            console.error('Error eliminando archivo:', error);
            alert('Error al eliminar archivo: ' + error.message);
        }
    };

    // Función para obtener icono según tipo de archivo
    const getFileIcon = (fileType: string) => {
        if (fileType === 'application/pdf') return '📄';
        return '📁';
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return 'Fecha inválida';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Cargando información del paciente...</div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Paciente no encontrado</p>
                <button 
                    onClick={() => navigate('/pacientes')}
                    className="mt-4 text-company-blue hover:underline"
                >
                    Volver a pacientes
                </button>
            </div>
        );
    }

    const age = calculateAge(editedPatient.birth_date || patient.birth_date);

    return (
        <div className="space-y-6">
            {/* Header con botones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/pacientes')} 
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Volver a la lista"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                        <p className="text-slate-500 text-sm">C.I. {patient.cedula}</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setSelectedFicha(null);
                            setShowFichaModal(true);
                        }}
                        className="bg-company-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Nueva Ficha Podológica
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                </div>
            </div>

            {/* Modal de Ficha Podológica */}
            {showFichaModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto">
                    <div className="relative w-full max-w-4xl m-4">
                        <FichaPodologicaModal 
                            patientId={id!}
                            patientData={patient}
                            ficha={selectedFicha}
                            onClose={() => {
                                setShowFichaModal(false);
                                setSelectedFicha(null);
                            }}
                            onSave={() => {
                                loadFichas();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Modal para notas clínicas */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingNote ? 'Editar Nota' : 'Nueva Nota Clínica'}
                            </h2>
                            <button onClick={() => setShowNoteModal(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleNoteSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={noteForm.title}
                                    onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                                    placeholder="Ej: Consulta de control"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2"
                                    value={noteForm.note_date}
                                    onChange={(e) => setNoteForm({...noteForm, note_date: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Contenido *</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full border rounded-lg p-2"
                                    value={noteForm.content}
                                    onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                                    placeholder="Detalles de la consulta, diagnóstico, tratamiento..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNoteModal(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNote}
                                    className="px-4 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {savingNote ? 'Guardando...' : (editingNote ? 'Actualizar' : 'Guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="border-b px-6 flex gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'info' 
                                ? 'border-company-blue text-company-blue' 
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Información Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('fichas')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                            activeTab === 'fichas' 
                                ? 'border-company-blue text-company-blue' 
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        Fichas Podológicas
                        {fichas.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                                {fichas.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'historial' 
                                ? 'border-company-blue text-company-blue' 
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Historial Clínico
                        {clinicalNotes.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                                {clinicalNotes.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('archivos')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'archivos' 
                                ? 'border-company-blue text-company-blue' 
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Archivos y Fotos
                        {patientFiles.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                                {patientFiles.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="p-6">
                    {/* Tab: Información Personal */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <button
                                    onClick={handleEditToggle}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                        isEditing 
                                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                            : 'bg-company-blue text-white hover:bg-blue-600'
                                    }`}
                                >
                                    <Edit className="w-4 h-4" />
                                    {isEditing ? 'Cancelar' : 'Editar'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? editedPatient.name || '' : patient.name}
                                        onChange={(e) => handlePatientChange('name', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / RUC</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? editedPatient.cedula || '' : patient.cedula}
                                        onChange={(e) => handlePatientChange('cedula', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? editedPatient.phone || '' : patient.phone}
                                        onChange={(e) => handlePatientChange('phone', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                    <input 
                                        type="email" 
                                        value={isEditing ? editedPatient.email || '' : patient.email}
                                        onChange={(e) => handlePatientChange('email', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                                    <input 
                                        type="date" 
                                        value={isEditing ? editedPatient.birth_date || '' : patient.birth_date || ''}
                                        onChange={(e) => handlePatientChange('birth_date', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                    {age !== null && (
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                            <Cake className="w-3 h-3" />
                                            Edad: {age} años
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                                    <input 
                                        type="text" 
                                        value={isEditing ? editedPatient.address || '' : patient.address || ''}
                                        onChange={(e) => handlePatientChange('address', e.target.value)}
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                        placeholder="Dirección de residencia"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Antecedentes Médicos</label>
                                    <textarea 
                                        value={isEditing ? editedPatient.history || '' : patient.history}
                                        onChange={(e) => handlePatientChange('history', e.target.value)}
                                        rows={4} 
                                        className={`w-full border rounded-lg px-3 py-2 ${!isEditing && 'bg-slate-50'}`}
                                        readOnly={!isEditing}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSavePatient}
                                        disabled={savingPatient}
                                        className="bg-company-blue text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {savingPatient ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Fichas Podológicas */}
                    {activeTab === 'fichas' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Historial de Fichas Podológicas</h3>
                                <button
                                    onClick={() => {
                                        setSelectedFicha(null);
                                        setShowFichaModal(true);
                                    }}
                                    className="text-sm bg-company-blue text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Ficha
                                </button>
                            </div>

                            {fichas.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No hay fichas podológicas para este paciente</p>
                                    <button
                                        onClick={() => {
                                            setSelectedFicha(null);
                                            setShowFichaModal(true);
                                        }}
                                        className="mt-3 text-company-blue hover:underline text-sm"
                                    >
                                        Crear primera ficha
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fichas.map((ficha) => (
                                        <div key={ficha.id} className="bg-slate-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FileText className="w-4 h-4 text-company-blue" />
                                                        <span className="font-medium">
                                                            Ficha Podológica - {formatDate(ficha.fecha)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600">
                                                        Motivo: {ficha.motivo_consulta || 'No especificado'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Creada: {formatDate(ficha.created_at)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedFicha(ficha);
                                                            setShowFichaModal(true);
                                                        }}
                                                        className="p-1 hover:bg-white rounded" 
                                                        title="Editar ficha"
                                                    >
                                                        <Edit className="w-4 h-4 text-slate-500" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteFicha(ficha.id)}
                                                        className="p-1 hover:bg-white rounded" 
                                                        title="Eliminar ficha"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Historial Clínico */}
                    {activeTab === 'historial' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Notas Clínicas</h3>
                                <button
                                    onClick={() => openNoteModal()}
                                    className="text-sm bg-company-blue text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Nota
                                </button>
                            </div>

                            {loadingNotes ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">Cargando notas...</p>
                                </div>
                            ) : clinicalNotes.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No hay notas clínicas para este paciente</p>
                                    <button
                                        onClick={() => openNoteModal()}
                                        className="mt-3 text-company-blue hover:underline text-sm"
                                    >
                                        Crear primera nota
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clinicalNotes.map((note) => (
                                        <div key={note.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{note.title}</h4>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(note.note_date)}
                                                        {note.professional_name && (
                                                            <> · Por: {note.professional_name}</>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openNoteModal(note)}
                                                        className="p-1 hover:bg-slate-100 rounded"
                                                        title="Editar nota"
                                                    >
                                                        <Edit className="w-4 h-4 text-slate-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="p-1 hover:bg-slate-100 rounded"
                                                        title="Eliminar nota"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Archivos y Fotos */}
                    {activeTab === 'archivos' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Archivos y Fotos</h3>
                                <div>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 bg-company-blue text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-600 transition-colors ${
                                            uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {uploadingFile ? 'Subiendo...' : 'Subir Archivo'}
                                    </label>
                                </div>
                            </div>

                            {loadingFiles ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">Cargando archivos...</p>
                                </div>
                            ) : patientFiles.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No hay archivos para este paciente</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Sube imágenes, PDFs u otros documentos
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {patientFiles.map((file) => {
                                        const publicUrl = api.getFilePublicUrl(file.file_path);
                                        const isImage = file.file_type?.startsWith('image/');
                                        
                                        return (
                                            <div key={file.id} className="bg-white rounded-lg border p-2 relative group hover:shadow-md transition-shadow">
                                                <div className="aspect-square bg-slate-100 rounded-lg mb-2 overflow-hidden">
                                                    {isImage ? (
                                                        <img 
                                                            src={publicUrl} 
                                                            alt={file.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">
                                                            {getFileIcon(file.file_type)}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium truncate" title={file.name}>
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatFileSize(file.file_size)}
                                                </p>
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a
                                                        href={publicUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 bg-white rounded-full shadow hover:bg-slate-50"
                                                        title="Descargar"
                                                    >
                                                        <Download className="w-3 h-3 text-slate-600" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteFile(file)}
                                                        className="p-1 bg-white rounded-full shadow hover:bg-red-50"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}