import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
    format,
    startOfWeek,
    addDays,
    startOfDay,
    addHours,
    isSameDay,
    parseISO,
    isSameHour
} from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Appointment, Sede, Patient, Service } from '../types';
import { 
    ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, MapPin,
    Edit, Trash2, User, FileText
} from 'lucide-react';

export default function Agenda() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedSede, setSelectedSede] = useState<Sede | 'all'>('all');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [saving, setSaving] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [formData, setFormData] = useState({
        patientId: '',
        serviceId: '',
        sede: 'norte' as Sede,
        date: format(new Date(), "yyyy-MM-dd"),
        time: '10:00'
    });

    useEffect(() => {
        loadData();
    }, []);

    // LOG: Mostrar citas cada vez que se cargan
    useEffect(() => {
        if (appointments.length > 0) {
            console.log('📅 TOTAL CITAS CARGADAS:', appointments.length);
            console.log('📅 DETALLE CITAS:', appointments.map(a => ({
                id: a.id,
                paciente: a.patientName,
                fecha: a.date,
                sede: a.sede,
                status: a.status
            })));
            
            const hoy = format(new Date(), 'yyyy-MM-dd');
            const citasHoy = appointments.filter(a => a.date.startsWith(hoy));
            console.log(`📅 CITAS PARA HOY (${hoy}):`, citasHoy.length);
            
            const citasSemana = appointments.filter(a => {
                const aptDate = parseISO(a.date);
                return aptDate >= startOfWeek(currentDate, { weekStartsOn: 1 }) && 
                       aptDate <= addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 7);
            });
            console.log(`📅 CITAS EN SEMANA ACTUAL:`, citasSemana.length);
        } else {
            console.log('📅 NO HAY CITAS CARGADAS');
        }
    }, [appointments, currentDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            console.log('📅 CARGANDO DATOS...');
            const [appointmentsData, patientsData, servicesData] = await Promise.all([
                api.getAppointments(),
                api.getPatients(),
                api.getServices()
            ]);
            console.log('📅 DATOS RECIBIDOS - Citas:', appointmentsData.length);
            setAppointments(appointmentsData);
            setPatients(patientsData);
            setServices(servicesData);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dateTime = `${formData.date}T${formData.time}:00`;
            console.log('📅 CREANDO CITA:', {
                paciente: formData.patientId,
                servicio: formData.serviceId,
                profesional: user?.id,
                sede: formData.sede,
                fecha: dateTime
            });
            
            await api.createAppointment({
                patientId: formData.patientId,
                serviceId: formData.serviceId,
                professionalId: user?.id || '',
                sede: formData.sede,
                date: dateTime,
                status: 'scheduled'
            });
            
            console.log('📅 CITA CREADA EXITOSAMENTE');
            setIsModalOpen(false);
            resetForm();
            await loadData();
        } catch (error: any) {
            console.error('📅 ERROR CREANDO CITA:', error);
            alert('Error al crear cita: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAppointment = async () => {
        if (!selectedAppointment) return;
        
        setSaving(true);
        try {
            const dateTime = `${formData.date}T${formData.time}:00`;
            
            await api.updateAppointment(selectedAppointment.id, {
                patientId: formData.patientId,
                serviceId: formData.serviceId,
                sede: formData.sede,
                date: dateTime,
                status: selectedAppointment.status
            });
            
            setIsDetailsModalOpen(false);
            resetForm();
            await loadData();
            alert('Cita actualizada correctamente');
        } catch (error: any) {
            console.error('Error actualizando cita:', error);
            alert('Error al actualizar cita: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAppointment = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            await api.deleteAppointment(id);
            setIsDetailsModalOpen(false);
            await loadData();
            alert('Cita eliminada correctamente');
        } catch (error: any) {
            console.error('Error eliminando cita:', error);
            alert('Error al eliminar cita: ' + error.message);
        }
    };

    const handleChangeStatus = async (id: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
        try {
            await api.updateAppointment(id, { status: newStatus });
            await loadData();
            if (selectedAppointment?.id === id) {
                setSelectedAppointment({ ...selectedAppointment, status: newStatus });
            }
        } catch (error: any) {
            console.error('Error cambiando estado:', error);
            alert('Error al cambiar estado: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            patientId: '',
            serviceId: '',
            sede: 'norte',
            date: format(new Date(), "yyyy-MM-dd"),
            time: '10:00'
        });
    };

    const openEditModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setFormData({
            patientId: appointment.patientId,
            serviceId: appointment.serviceId,
            sede: appointment.sede,
            date: format(parseISO(appointment.date), 'yyyy-MM-dd'),
            time: format(parseISO(appointment.date), 'HH:00')
        });
        setIsDetailsModalOpen(false);
        setIsModalOpen(true);
    };

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 13 }).map((_, i) => addHours(startOfDay(currentDate), i + 8));

    const filteredAppointments = appointments.filter(apt =>
        (selectedSede === 'all' || apt.sede === selectedSede)
    );

    const getAppointmentForSlot = (day: Date, hour: Date) => {
        const apt = filteredAppointments.find(apt => {
            const aptDate = parseISO(apt.date);
            const sameDay = isSameDay(aptDate, day);
            const sameHour = isSameHour(aptDate, hour);
            
            // LOG detallado para depuración
            if (sameDay && sameHour) {
                console.log('🎯 CITA ENCONTRADA:', {
                    paciente: apt.patientName,
                    fecha: format(aptDate, 'yyyy-MM-dd HH:mm'),
                    diaGrid: format(day, 'yyyy-MM-dd HH:mm'),
                    sede: apt.sede
                });
            }
            
            return sameDay && sameHour;
        });
        return apt;
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'scheduled': return 'bg-blue-100 border-company-blue hover:bg-blue-200';
            case 'completed': return 'bg-green-100 border-green-600 hover:bg-green-200';
            case 'cancelled': return 'bg-red-100 border-red-600 hover:bg-red-200';
            default: return 'bg-blue-100 border-company-blue hover:bg-blue-200';
        }
    };

    const getStatusText = (status: string) => {
        switch(status) {
            case 'scheduled': return 'Programada';
            case 'completed': return 'Completada';
            case 'cancelled': return 'Cancelada';
            default: return status;
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            {loading && <div className="text-center py-4 text-slate-500">Cargando agenda...</div>}
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
                    <p className="text-slate-500 text-sm">Gestiona las citas de las sedes</p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(e.target.value as any)}
                    >
                        <option value="all">Todas las Sedes</option>
                        <option value="norte">Sede Norte</option>
                        <option value="sur">Sede Sur</option>
                    </select>
                    <button 
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="bg-company-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Cita
                    </button>
                </div>
            </div>

            {/* Modal para nueva/editar cita */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {selectedAppointment ? 'Editar Cita' : 'Nueva Cita'}
                            </h2>
                            <button onClick={() => {
                                setIsModalOpen(false);
                                setSelectedAppointment(null);
                                resetForm();
                            }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={selectedAppointment ? handleUpdateAppointment : handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Paciente *</label>
                                <select
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.patientId}
                                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                                >
                                    <option value="">Seleccionar paciente</option>
                                    {patients.map(patient => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name} - {patient.cedula}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Servicio *</label>
                                <select
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                                >
                                    <option value="">Seleccionar servicio</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} - ${service.price} ({service.duration} min)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Sede *</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="norte"
                                            checked={formData.sede === 'norte'}
                                            onChange={(e) => setFormData({...formData, sede: e.target.value as Sede})}
                                            className="mr-2"
                                        />
                                        Norte
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="sur"
                                            checked={formData.sede === 'sur'}
                                            onChange={(e) => setFormData({...formData, sede: e.target.value as Sede})}
                                            className="mr-2"
                                        />
                                        Sur
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha *</label>
                                <input
                                    type="date"
                                    required
                                    min={format(new Date(), "yyyy-MM-dd")}
                                    className="w-full border rounded-lg p-2"
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Hora *</label>
                                <select
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.time}
                                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                                >
                                    {Array.from({ length: 13 }).map((_, i) => {
                                        const hour = (i + 8).toString().padStart(2, '0');
                                        return (
                                            <option key={hour} value={`${hour}:00`}>
                                                {hour}:00
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setSelectedAppointment(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-company-green text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : (selectedAppointment ? 'Actualizar' : 'Guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de detalles de cita */}
            {isDetailsModalOpen && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Detalles de la Cita</h2>
                            <button onClick={() => setIsDetailsModalOpen(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Información del paciente */}
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-company-blue" />
                                    <span className="font-semibold">Paciente</span>
                                </div>
                                <p className="text-lg font-bold">{selectedAppointment.patientName}</p>
                                {patients.find(p => p.id === selectedAppointment.patientId)?.cedula && (
                                    <p className="text-sm text-slate-600">
                                        Cédula: {patients.find(p => p.id === selectedAppointment.patientId)?.cedula}
                                    </p>
                                )}
                            </div>

                            {/* Información del servicio */}
                            <div className="bg-green-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    <span className="font-semibold">Servicio</span>
                                </div>
                                <p className="font-medium">{selectedAppointment.serviceName}</p>
                            </div>

                            {/* Fecha y hora */}
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-slate-600" />
                                    <span className="font-semibold">Fecha y Hora</span>
                                </div>
                                <p className="font-medium">
                                    {format(parseISO(selectedAppointment.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {format(parseISO(selectedAppointment.date), 'HH:mm')} hs
                                </p>
                            </div>

                            {/* Sede */}
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                    <span className="font-semibold">Sede</span>
                                </div>
                                <p className="font-medium capitalize">{selectedAppointment.sede}</p>
                            </div>

                            {/* Estado actual */}
                            <div className="p-3 rounded-lg border">
                                <span className="text-sm font-semibold block mb-2">Estado actual:</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment.id, 'scheduled')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            selectedAppointment.status === 'scheduled'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                        }`}
                                    >
                                        Programada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment.id, 'completed')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            selectedAppointment.status === 'completed'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                        }`}
                                    >
                                        Completada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment.id, 'cancelled')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                            selectedAppointment.status === 'cancelled'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                        }`}
                                    >
                                        Cancelada
                                    </button>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2 pt-4 border-t">
                                <button
                                    onClick={() => openEditModal(selectedAppointment)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-600"
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>

                            {/* Ver ficha del paciente */}
                            <button
                                onClick={() => {
                                    navigate(`/pacientes/${selectedAppointment.patientId}`);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50"
                            >
                                <FileText className="w-4 h-4" />
                                Ver Ficha del Paciente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navegación de semanas */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-1 hover:bg-slate-100 rounded">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold capitalize">
                    {format(weekStart, "MMMM yyyy", { locale: es })}
                </span>
                <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1 hover:bg-slate-100 rounded">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Grid de agenda */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border shadow-sm">
                <div className="min-w-[800px]">
                    {/* Header de días */}
                    <div className="grid grid-cols-8 border-b sticky top-0 bg-slate-50 z-10">
                        <div className="p-3 border-r text-xs font-semibold text-slate-500 text-center">Hora</div>
                        {weekDays.map(day => (
                            <div key={day.toString()} className={`p-3 border-r text-center ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}>
                                <p className="text-xs font-semibold text-slate-600 capitalize">{format(day, 'EEE', { locale: es })}</p>
                                <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-company-blue' : 'text-slate-800'}`}>
                                    {format(day, 'd')}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Grid de horas */}
                    <div className="divide-y">
                        {hours.map(hour => (
                            <div key={hour.toString()} className="grid grid-cols-8 group hover:bg-slate-50">
                                <div className="p-2 border-r text-xs text-slate-500 text-center flex items-center justify-center">
                                    {format(hour, 'HH:mm')}
                                </div>
                                {weekDays.map(day => {
                                    const appointment = getAppointmentForSlot(day, hour);
                                    return (
                                        <div key={day.toString()} className="p-1 border-r h-24 relative">
                                            {appointment ? (
                                                <div 
                                                    onClick={() => {
                                                        setSelectedAppointment(appointment);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className={`absolute inset-1 ${getStatusColor(appointment.status)} border-l-4 rounded p-1 text-xs overflow-hidden cursor-pointer transition-colors`}
                                                >
                                                    <p className="font-semibold text-blue-800 truncate">{appointment.patientName}</p>
                                                    <p className="text-blue-600 truncate text-[10px]">{appointment.serviceName}</p>
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <span className="bg-white/50 px-1 rounded text-[10px] text-blue-800">
                                                            {appointment.sede === 'norte' ? 'N' : 'S'}
                                                        </span>
                                                        <span className="text-[10px] text-blue-600 capitalize">
                                                            {getStatusText(appointment.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="w-full h-full opacity-0 group-hover:opacity-100 flex justify-center items-center cursor-pointer hover:bg-slate-100"
                                                    onClick={() => {
                                                        setSelectedAppointment(null);
                                                        setFormData({
                                                            ...formData,
                                                            date: format(day, 'yyyy-MM-dd'),
                                                            time: format(hour, 'HH:00')
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}