import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Tag, Clock, DollarSign, Plus, X, AlertCircle, Search, Edit, Trash2 } from 'lucide-react';
import { Service, Sede } from '../types';

export default function Servicios() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<Omit<Service, 'id'>>({
        name: '',
        duration: 30,
        price: 0,
        available_sedes: ['norte', 'sur']  // ← CAMBIADO a available_sedes
    });

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getServices();
            console.log('Servicios cargados:', data);
            setServices(data || []);
        } catch (err: any) {
            console.error('Error cargando servicios:', err);
            setError(err.message || 'Error al cargar servicios');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                duration: service.duration,
                price: service.price,
                available_sedes: service.available_sedes || ['norte', 'sur']  // ← CAMBIADO
            });
        } else {
            setEditingService(null);
            setFormData({
                name: '',
                duration: 30,
                price: 0,
                available_sedes: ['norte', 'sur']  // ← CAMBIADO
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingService) {
                await api.updateService(editingService.id, formData);
                alert('Servicio actualizado correctamente');
            } else {
                await api.createService(formData);
                alert('Servicio creado correctamente');
            }
            setIsModalOpen(false);
            loadServices();
        } catch (err: any) {
            console.error('Error guardando servicio:', err);
            alert('Error al guardar servicio: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await api.deleteService(id);
            alert('Servicio eliminado correctamente');
            loadServices();
        } catch (err: any) {
            console.error('Error eliminando servicio:', err);
            alert('Error al eliminar servicio: ' + err.message);
        }
    };

    const filteredServices = services.filter(service =>
        service.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Cargando servicios...</div>
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
            {/* Header con botón Nuevo Servicio */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Servicios</h1>
                    <p className="text-slate-500 text-sm">Catálogo de tratamientos y precios</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-company-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Servicio
                </button>
            </div>

            {/* Buscador */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar servicio..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-company-blue outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Modal para nuevo/editar servicio */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Consulta General"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Duración (minutos) *</label>
                                <input
                                    type="number"
                                    required
                                    min="5"
                                    step="5"
                                    className="w-full border rounded-lg p-2"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Precio ($) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full border rounded-lg p-2"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Sedes disponibles</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.available_sedes.includes('norte')}  // ← CAMBIADO
                                            onChange={(e) => {
                                                const sedes = e.target.checked
                                                    ? [...formData.available_sedes, 'norte']
                                                    : formData.available_sedes.filter(s => s !== 'norte');
                                                setFormData({ ...formData, available_sedes: sedes as Sede[] });  // ← CAMBIADO
                                            }}
                                            className="mr-2"
                                        />
                                        Norte
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.available_sedes.includes('sur')}  // ← CAMBIADO
                                            onChange={(e) => {
                                                const sedes = e.target.checked
                                                    ? [...formData.available_sedes, 'sur']
                                                    : formData.available_sedes.filter(s => s !== 'sur');
                                                setFormData({ ...formData, available_sedes: sedes as Sede[] });  // ← CAMBIADO
                                            }}
                                            className="mr-2"
                                        />
                                        Sur
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : (editingService ? 'Actualizar' : 'Guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grid de servicios */}
            {filteredServices.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                    <p className="text-slate-500">No hay servicios disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow relative group">
                            {/* Botones de acción */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openModal(service)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <Tag className="w-6 h-6 text-company-blue" />
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Activo
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">{service.name}</h3>

                            <div className="space-y-2">
                                <div className="flex items-center text-sm text-slate-600">
                                    <Clock className="w-4 h-4 mr-2" />
                                    {service.duration} minutos
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    ${service.price?.toFixed(2)}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <div className="mb-2 text-xs font-semibold text-slate-500 uppercase">Sedes Disponibles</div>
                                <div className="flex flex-wrap gap-2">
                                    {service.available_sedes?.map(sede => (  // ← CAMBIADO
                                        <span key={sede} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium capitalize">
                                            {sede}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}