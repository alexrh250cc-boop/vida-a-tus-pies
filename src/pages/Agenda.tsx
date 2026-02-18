import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addDays,
    startOfDay,
    addHours,
    parseISO,
    isSameMonth,
    isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Appointment, Sede, Patient, Service } from '../types';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, MapPin,
    Edit, Trash2, User, FileText, Search
} from 'lucide-react';

export default function Agenda() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'month'>('week');
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

    // Autocomplete states
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    // 🔥 EFECTO PARA FILTRAR PACIENTES
    useEffect(() => {
        if (patientSearchTerm.trim() === '') {
            setFilteredPatients([]);
        } else {
            const filtered = patients.filter(patient =>
                patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
                patient.cedula.toLowerCase().includes(patientSearchTerm.toLowerCase())
            );
            setFilteredPatients(filtered);
        }
    }, [patientSearchTerm, patients]);

    // 🔥 EFECTO PARA CERRAR SUGERENCIAS AL HACER CLICK FUERA
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowPatientSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [appointmentsData, patientsData, servicesData] = await Promise.all([
                api.getAppointments(),
                api.getPatients(),
                api.getServices()
            ]);
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
            const dateTime = `${formData.date}T${formData.time}:00-05:00`;

            await api.createAppointment({
                patientId: formData.patientId,
                serviceId: formData.serviceId,
                professionalId: user?.id || '',
                sede: formData.sede,
                date: dateTime,
                status: 'scheduled'
            });

            setIsModalOpen(false);
            resetForm();
            await loadData();
        } catch (error: any) {
            console.error('Error creando cita:', error);
            alert('Error al crear cita: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAppointment = async () => {
        if (!selectedAppointment) return;

        setSaving(true);
        try {
            const dateTime = `${formData.date}T${formData.time}:00-05:00`;

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

    // 🔥 FUNCIÓN PARA SELECCIONAR PACIENTE
    const handleSelectPatient = (patient: Patient) => {
        setFormData({ ...formData, patientId: patient.id });
        setPatientSearchTerm(`${patient.name} - ${patient.cedula}`);
        setShowPatientSuggestions(false);
    };

    const resetForm = () => {
        setFormData({
            patientId: '',
            serviceId: '',
            sede: 'norte',
            date: format(new Date(), "yyyy-MM-dd"),
            time: '10:00'
        });
        setPatientSearchTerm('');
        setShowPatientSuggestions(false);
    };

    const openEditModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        const patient = patients.find(p => p.id === appointment.patientId);
        setPatientSearchTerm(patient ? `${patient.name} - ${patient.cedula}` : '');
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



    const hours = Array.from({ length: 13 }).map((_, i) => addHours(startOfDay(currentDate), i + 8));

    const filteredAppointments = appointments.filter(apt =>
        (selectedSede === 'all' || apt.sede === selectedSede)
    );

    const getAppointmentForSlot = (day: Date, hour: Date) => {
        const cellDateStr = format(day, 'yyyy-MM-dd');
        const cellHourStr = format(hour, 'HH:00');

        return filteredAppointments.find(apt => {
            const aptDate = parseISO(apt.date);
            const aptDateStr = format(aptDate, 'yyyy-MM-dd');
            const aptHourStr = format(aptDate, 'HH:00');

            return aptDateStr === cellDateStr && aptHourStr === cellHourStr;
        });
    };



    const getStatusText = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Programada';
            case 'completed': return 'Completada';
            case 'cancelled': return 'Cancelada';
            default: return status;
        }
    };

    // 🔥 COLOR CODING BY SERVICE
    const getServiceColor = (serviceName: string) => {
        const name = serviceName.toLowerCase();
        if (name.includes('consulta')) return 'bg-sky-100 border-sky-300 text-sky-800 hover:bg-sky-200';
        if (name.includes('uña') || name.includes('corte')) return 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200';
        if (name.includes('hongo') || name.includes('tratamiento')) return 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200';
        if (name.includes('plantilla') || name.includes('orto')) return 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200';
        return 'bg-blue-100 border-company-blue text-blue-800 hover:bg-blue-200';
    };

    // View Logic
    const getDaysToShow = () => {
        if (view === 'day') {
            return [currentDate];
        }
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
        }
        // Month view handled separately
        return [];
    };

    const daysToShow = getDaysToShow();

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            {loading && <div className="text-center py-4 text-slate-500">Cargando agenda...</div>}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
                    <p className="text-slate-500 text-sm">Gestiona las citas de las sedes</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('day')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === 'day' ? 'bg-white shadow text-company-blue' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Día
                    </button>
                    <button
                        onClick={() => setView('week')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === 'week' ? 'bg-white shadow text-company-blue' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setView('month')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === 'month' ? 'bg-white shadow text-company-blue' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mes
                    </button>
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
                            {/* 🔥 CAMPO DE PACIENTE CON AUTOCOMPLETADO */}
                            <div className="relative" ref={searchRef}>
                                <label className="block text-sm font-medium mb-1">Paciente *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-company-blue outline-none"
                                        placeholder="Buscar paciente por nombre o cédula..."
                                        value={patientSearchTerm}
                                        onChange={(e) => {
                                            setPatientSearchTerm(e.target.value);
                                            setShowPatientSuggestions(true);
                                            if (formData.patientId) {
                                                setFormData({ ...formData, patientId: '' });
                                            }
                                        }}
                                        onFocus={() => setShowPatientSuggestions(true)}
                                    />
                                    {patientSearchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPatientSearchTerm('');
                                                setFormData({ ...formData, patientId: '' });
                                                setShowPatientSuggestions(false);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Lista de sugerencias */}
                                {showPatientSuggestions && filteredPatients.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredPatients.map((patient) => (
                                            <li
                                                key={patient.id}
                                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                                                onClick={() => handleSelectPatient(patient)}
                                            >
                                                <User className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium">{patient.name}</p>
                                                    <p className="text-xs text-slate-500">{patient.cedula}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {showPatientSuggestions && patientSearchTerm && filteredPatients.length === 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-slate-500">
                                        No se encontraron pacientes
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Servicio *</label>
                                <select
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
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
                                            onChange={(e) => setFormData({ ...formData, sede: e.target.value as Sede })}
                                            className="mr-2"
                                        />
                                        Norte
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="sur"
                                            checked={formData.sede === 'sur'}
                                            onChange={(e) => setFormData({ ...formData, sede: e.target.value as Sede })}
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
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Hora *</label>
                                <select
                                    required
                                    className="w-full border rounded-lg p-2"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedAppointment.status === 'scheduled'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                            }`}
                                    >
                                        Programada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment.id, 'completed')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedAppointment.status === 'completed'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                                            }`}
                                    >
                                        Completada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment.id, 'cancelled')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedAppointment.status === 'cancelled'
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
            {/* Navegación de fecha */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-medium border rounded hover:bg-slate-50">
                        Hoy
                    </button>
                    <div className="flex">
                        <button onClick={() => {
                            if (view === 'day') setCurrentDate(addDays(currentDate, -1));
                            else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
                            else setCurrentDate(startOfMonth(addDays(startOfMonth(currentDate), -1)));
                        }} className="p-1 hover:bg-slate-100 rounded">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => {
                            if (view === 'day') setCurrentDate(addDays(currentDate, 1));
                            else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
                            else setCurrentDate(startOfMonth(addDays(endOfMonth(currentDate), 1)));
                        }} className="p-1 hover:bg-slate-100 rounded">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <span className="font-bold text-lg capitalize ml-2">
                        {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM yyyy" : "MMMM yyyy", { locale: es })}
                    </span>
                </div>
            </div>

            {/* Grid de agenda */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border shadow-sm">
                {view === 'month' ? (
                    // VISTA MENSUAL
                    <div className="min-w-[800px] h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b bg-slate-50">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                                <div key={day} className="p-2 text-center text-sm font-semibold text-slate-600 border-r last:border-r-0">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y">
                            {eachDayOfInterval({
                                start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                                end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
                            }).map(day => {
                                const dayAppointments = filteredAppointments.filter(apt =>
                                    isSameDay(parseISO(apt.date), day)
                                );
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`min-h-[100px] p-2 hover:bg-slate-50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                        onClick={() => {
                                            setCurrentDate(day);
                                            setView('day');
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-company-blue text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayAppointments.length > 0 && (
                                                <span className="text-xs font-bold text-company-blue bg-blue-100 px-1.5 rounded-full">
                                                    {dayAppointments.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                            {dayAppointments.slice(0, 3).map(apt => (
                                                <div key={apt.id} className={`text-[10px] truncate px-1 rounded border-l-2 ${getServiceColor(apt.serviceName)}`}>
                                                    {format(parseISO(apt.date), 'HH:mm')} {apt.patientName}
                                                </div>
                                            ))}
                                            {dayAppointments.length > 3 && (
                                                <div className="text-[10px] text-slate-400 text-center">
                                                    + {dayAppointments.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // VISTA SEMANAL Y DIARIA
                    <div className="min-w-[800px]">
                        {/* Header de días */}
                        <div className={`grid border-b sticky top-0 bg-slate-50 z-10 ${view === 'day' ? 'grid-cols-2' : 'grid-cols-8'}`}>
                            <div className="p-3 border-r text-xs font-semibold text-slate-500 text-center w-20">Hora</div>
                            {daysToShow.map(day => (
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
                                <div key={hour.toString()} className={`grid group hover:bg-slate-50 ${view === 'day' ? 'grid-cols-2' : 'grid-cols-8'}`}>
                                    <div className="p-2 border-r text-xs text-slate-500 text-center flex items-center justify-center w-20">
                                        {format(hour, 'HH:mm')}
                                    </div>
                                    {daysToShow.map(day => {
                                        const appointment = getAppointmentForSlot(day, hour);
                                        return (
                                            <div key={day.toString()} className={`p-1 border-r h-24 relative transition-all duration-200 ${!appointment ? 'hover:bg-blue-50/50 hover:shadow-inner cursor-pointer' : ''}`}>
                                                {appointment ? (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAppointment(appointment);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className={`absolute inset-1 border-l-4 rounded p-1 text-xs overflow-hidden cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md z-10 ${getServiceColor(appointment.serviceName)}`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold truncate">{appointment.patientName}</p>
                                                            <div className={`w-2 h-2 rounded-full ${appointment.sede === 'norte' ? 'bg-blue-500' : 'bg-purple-500'}`} title={`Sede ${appointment.sede}`} />
                                                        </div>
                                                        <p className="truncate opacity-80 text-[10px]">{appointment.serviceName}</p>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <span className="bg-white/50 px-1 rounded text-[10px]">
                                                                {getStatusText(appointment.status)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity duration-300"
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
                                                        <Plus className="w-8 h-8 text-company-blue bg-blue-100 rounded-full p-1.5 shadow-sm transform scale-90 hover:scale-110 transition-transform duration-200" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}