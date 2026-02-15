import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Patient, FichaPodologica } from '../types';
import { 
    ArrowLeft, Save, Plus, FileText, Trash2, 
    Edit, Printer, Activity
} from 'lucide-react';
import FichaPodologicaModal from '../components/ui/FichaPodologicaModal';

export default function PacienteDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [fichas, setFichas] = useState<FichaPodologica[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'fichas' | 'historial' | 'archivos'>('info');
    const [loading, setLoading] = useState(true);
    const [showFichaModal, setShowFichaModal] = useState(false);
    const [selectedFicha, setSelectedFicha] = useState<FichaPodologica | null>(null);
    const [loadingFichas, setLoadingFichas] = useState(false);

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
            
            // Cargar fichas del paciente
            await loadFichas();
        } catch (error) {
            console.error('Error cargando paciente:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFichas = async () => {
        if (!id) return;
        try {
            setLoadingFichas(true);
            const fichasData = await api.getFichasByPatient(id);
            setFichas(fichasData);
        } catch (error) {
            console.error('Error cargando fichas:', error);
        } finally {
            setLoadingFichas(false);
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
                    </button>
                </div>

                <div className="p-6">
                    {/* Tab: Información Personal */}
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    defaultValue={patient.name} 
                                    className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                                    readOnly 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / RUC</label>
                                <input 
                                    type="text" 
                                    defaultValue={patient.cedula} 
                                    className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                                    readOnly 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                <input 
                                    type="text" 
                                    defaultValue={patient.phone} 
                                    className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                                    readOnly 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    defaultValue={patient.email} 
                                    className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                                    readOnly 
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Antecedentes Médicos</label>
                                <textarea 
                                    defaultValue={patient.history} 
                                    rows={4} 
                                    className="w-full border rounded-lg px-3 py-2 bg-slate-50"
                                    readOnly 
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button className="bg-company-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors">
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </button>
                            </div>
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

                            {loadingFichas ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">Cargando fichas...</p>
                                </div>
                            ) : fichas.length === 0 ? (
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
                            <button className="border-2 border-dashed border-slate-300 rounded-lg p-4 w-full flex flex-col items-center justify-center text-slate-500 hover:border-company-blue hover:text-company-blue transition-colors">
                                <Plus className="w-6 h-6 mb-2" />
                                <span>Agregar Nueva Nota Clínica</span>
                            </button>

                            <div className="bg-slate-50 rounded-lg p-4 border relative">
                                <span className="absolute top-4 right-4 text-xs text-slate-400">Hace 2 días</span>
                                <h3 className="font-semibold text-slate-800 mb-2">Consulta General - Podología</h3>
                                <p className="text-sm text-slate-600">Paciente acude por onicocriptosis en hallux derecho. Se realiza procedimiento de extracción de espícula y curación.</p>
                                <div className="mt-3 flex gap-2">
                                    <span className="px-2 py-1 bg-white border rounded text-xs text-slate-500">Realizado por: Dra. Bety</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Archivos y Fotos */}
                    {activeTab === 'archivos' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="aspect-square bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400 mb-2" />
                                    <span className="text-xs text-slate-500">Subir Foto/PDF</span>
                                </div>
                                {/* Mock Files */}
                                <div className="aspect-square bg-white rounded-lg border p-2 relative group hover:shadow-md transition-shadow">
                                    <div className="h-2/3 bg-slate-200 rounded mb-2 flex items-center justify-center text-slate-400">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <p className="text-xs truncate font-medium">Radiografia_pie.pdf</p>
                                    <button className="absolute top-2 right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                    </button>
                                </div>
                                <div className="aspect-square bg-white rounded-lg border p-2 relative group hover:shadow-md transition-shadow">
                                    <div className="h-2/3 bg-slate-200 rounded mb-2 flex items-center justify-center text-slate-400">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <p className="text-xs truncate font-medium">Estudio_pisada.pdf</p>
                                    <button className="absolute top-2 right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}