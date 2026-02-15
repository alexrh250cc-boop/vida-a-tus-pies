import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Plus, FileText, Phone, AlertCircle, X,
    Edit, Trash2, ChevronLeft, ChevronRight,
    Mail, Calendar, User, RefreshCw
} from 'lucide-react';
import { Patient } from '../types';

export default function Pacientes() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        cedula: '',
        phone: '',
        email: '',
        history: ''
    });
    const [saving, setSaving] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        // Filtrar pacientes cuando cambia el término de búsqueda
        const filtered = patients.filter(patient =>
            patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.cedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.phone?.includes(searchTerm) ||
            patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredPatients(filtered);
        setCurrentPage(1);
    }, [searchTerm, patients]);

    const loadPatients = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getPatients();
            console.log('Pacientes cargados:', data);
            setPatients(data || []);
        } catch (err: any) {
            console.error('Error completo:', err);
            setError(err.message || 'Error al cargar pacientes');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (patient?: Patient) => {
        if (patient) {
            setEditingPatient(patient);
            setFormData({
                name: patient.name,
                cedula: patient.cedula,
                phone: patient.phone,
                email: patient.email,
                history: patient.history || ''
            });
        } else {
            setEditingPatient(null);
            setFormData({
                name: '',
                cedula: '',
                phone: '',
                email: '',
                history: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingPatient) {
                await api.updatePatient(editingPatient.id, formData);
                alert('Paciente actualizado correctamente');
            } else {
                await api.createPatient(formData);
                alert('Paciente creado correctamente');
            }
            setIsModalOpen(false);
            loadPatients();
        } catch (error: any) {
            console.error('Error guardando paciente:', error);
            alert('Error al guardar paciente: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este paciente? Esta acción eliminará también todas sus citas y fichas médicas.')) {
            return;
        }
        
        try {
            await api.deletePatient(id);
            alert('Paciente eliminado correctamente');
            loadPatients();
        } catch (error: any) {
            console.error('Error eliminando paciente:', error);
            alert('Error al eliminar paciente: ' + error.message);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Cargando pacientes...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
                    <p className="text-slate-500 text-sm">Administra el historial clínico</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => openModal()}
                        className="bg-company-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Paciente
                    </button>
                    <button 
                        onClick={loadPatients}
                        className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        title="Actualizar lista"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Modal para nuevo/editar paciente */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-100 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Cédula *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.cedula}
                                    onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                                    placeholder="Ej: 12345678-9"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Teléfono *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="Ej: 0995541483"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="Ej: email@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Historial Médico</label>
                                <textarea
                                    rows={3}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.history}
                                    onChange={(e) => setFormData({...formData, history: e.target.value})}
                                    placeholder="Antecedentes médicos, alergias, observaciones..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                                >
                                    {saving ? 'Guardando...' : (editingPatient ? 'Actualizar' : 'Guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Buscador */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, teléfono o email..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-company-blue outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    {filteredPatients.length} pacientes encontrados
                </p>
            </div>

            {/* Tabla de pacientes */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paciente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Historial</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registro</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {currentItems.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-company-blue to-blue-400 flex items-center justify-center font-bold text-white shadow-sm">
                                                {patient.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{patient.name}</div>
                                                <div className="text-sm text-slate-500 flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {patient.cedula}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900 flex items-center">
                                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                                            {patient.phone}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center">
                                            <Mail className="w-3 h-3 mr-1 text-slate-400" />
                                            {patient.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-900 truncate max-w-xs" title={patient.history}>
                                            {patient.history || 'Sin historial'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <div className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                                            {formatDate(patient.createdAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => navigate(`/pacientes/${patient.id}`)}
                                                className="text-company-blue hover:text-blue-900 p-1 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver ficha completa"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => openModal(patient)}
                                                className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Editar paciente"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(patient.id)}
                                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar paciente"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPatients.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-lg font-medium mb-1">No se encontraron pacientes</p>
                                        <p className="text-sm text-slate-400 mb-4">
                                            {searchTerm ? 'Prueba con otros términos de búsqueda' : 'Comienza agregando tu primer paciente'}
                                        </p>
                                        {!searchTerm && (
                                            <button
                                                onClick={() => openModal()}
                                                className="inline-flex items-center gap-2 text-company-blue hover:text-blue-700 font-medium"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Agregar primer paciente
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {filteredPatients.length > 0 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between bg-slate-50">
                        <p className="text-sm text-slate-600">
                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                            <span className="font-medium">
                                {Math.min(indexOfLastItem, filteredPatients.length)}
                            </span>{' '}
                            de <span className="font-medium">{filteredPatients.length}</span> pacientes
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 border rounded-lg bg-white">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}