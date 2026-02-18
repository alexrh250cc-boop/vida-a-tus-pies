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

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-red-100 text-red-700',
            'bg-orange-100 text-orange-700',
            'bg-amber-100 text-amber-700',
            'bg-yellow-100 text-yellow-700',
            'bg-lime-100 text-lime-700',
            'bg-green-100 text-green-700',
            'bg-emerald-100 text-emerald-700',
            'bg-teal-100 text-teal-700',
            'bg-cyan-100 text-cyan-700',
            'bg-sky-100 text-sky-700',
            'bg-blue-100 text-blue-700',
            'bg-indigo-100 text-indigo-700',
            'bg-violet-100 text-violet-700',
            'bg-purple-100 text-purple-700',
            'bg-fuchsia-100 text-fuchsia-700',
            'bg-pink-100 text-pink-700',
            'bg-rose-100 text-rose-700',
        ];
        const index = name.length % colors.length;
        return colors[index];
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
                                    className="w-full border rounded-lg p-2 focus:ring-4 focus:ring-company-blue/10 focus:border-company-blue outline-none transition-all duration-200"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Cédula *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-4 focus:ring-company-blue/10 focus:border-company-blue outline-none transition-all duration-200"
                                    value={formData.cedula}
                                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                    placeholder="Ej: 12345678-9"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Teléfono *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-4 focus:ring-company-blue/10 focus:border-company-blue outline-none transition-all duration-200"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Ej: 0995541483"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border rounded-lg p-2 focus:ring-4 focus:ring-company-blue/10 focus:border-company-blue outline-none transition-all duration-200"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Ej: email@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Historial Médico</label>
                                <textarea
                                    rows={3}
                                    className="w-full border rounded-lg p-2 focus:ring-4 focus:ring-company-blue/10 focus:border-company-blue outline-none transition-all duration-200"
                                    value={formData.history}
                                    onChange={(e) => setFormData({ ...formData, history: e.target.value })}
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

            {/* Tabla de pacientes con buscador integrado */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Buscador y filtros */}
                <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cédula, teléfono..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-company-blue focus:border-transparent outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-slate-500 whitespace-nowrap">
                        <strong>{filteredPatients.length}</strong> pacientes encontrados
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Historial</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Registro</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {currentItems.map((patient) => (
                                <tr key={patient.id} className="hover:bg-blue-50/30 hover:shadow-[inset_4px_0_0_0_#3b82f6] transition-all duration-200 group cursor-pointer">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${getAvatarColor(patient.name)}`}>
                                                {patient.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-semibold text-slate-900">{patient.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" />
                                                    {patient.cedula}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm text-slate-700 flex items-center">
                                                <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                {patient.phone}
                                            </div>
                                            {patient.email && (
                                                <div className="text-xs text-slate-500 flex items-center">
                                                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                    {patient.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-slate-600 truncate max-w-xs" title={patient.history}>
                                            {patient.history || <span className="text-slate-400 italic">Sin historial registrado</span>}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                                        <div className="flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                            {formatDate(patient.createdAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                            <button
                                                onClick={() => navigate(`/pacientes/${patient.id}`)}
                                                className="text-company-blue bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                                                title="Ver ficha completa"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openModal(patient)}
                                                className="text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors"
                                                title="Editar paciente"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(patient.id)}
                                                className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
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
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-lg font-medium text-slate-900 mb-1">No se encontraron pacientes</p>
                                        <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
                                            {searchTerm ? `No hay resultados para "${searchTerm}"` : 'Comienza agregando tu primer paciente al sistema'}
                                        </p>
                                        {!searchTerm && (
                                            <button
                                                onClick={() => openModal()}
                                                className="inline-flex items-center gap-2 bg-company-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
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
                        <p className="text-xs text-slate-500">
                            Mostrando <span className="font-medium text-slate-900">{indexOfFirstItem + 1}</span> - <span className="font-medium text-slate-900">{Math.min(indexOfLastItem, filteredPatients.length)}</span> de <span className="font-medium text-slate-900">{filteredPatients.length}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 border rounded-lg bg-white text-sm font-medium shadow-sm min-w-[3rem] text-center">
                                {currentPage}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
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