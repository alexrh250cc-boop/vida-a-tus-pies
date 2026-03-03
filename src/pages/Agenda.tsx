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
    parseISO,
    isSameMonth,
    isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Appointment, Sede, Patient, Service, PaymentMethod } from '../types';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
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

    // 🔥 NUEVOS ESTADOS PARA INTERVALOS Y PAGOS
    const [slotInterval, setSlotInterval] = useState<15 | 30 | 60>(60);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [appointmentToPay, setAppointmentToPay] = useState<Appointment | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: 0,
        payment_method: 'cash' as PaymentMethod,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    // 🔥 EFECTO PARA CONFIGURAR SEDE INICIAL SEGÚN PERMISOS
    useEffect(() => {
        if (user) {
            const permitidas = user.sedes_permitidas || [];
            if (user.role === 'podologo' && permitidas.length > 0) {
                // Si el podólogo solo tiene sedes específicas, no permitir 'all'
                if (selectedSede === 'all' || !permitidas.includes(selectedSede as Sede)) {
                    const initialSede = permitidas[0];
                    setSelectedSede(initialSede);
                    setFormData(prev => ({ ...prev, sede: initialSede }));
                }
            }
        }
    }, [user]);

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

    const handleDeleteAppointment = async (id: string, appointment?: Appointment) => {
        const aptToDelete = appointment || selectedAppointment;

        // Validación de permisos
        if (user?.role === 'podologo' && aptToDelete?.professionalId !== user?.id) {
            alert('No tienes permiso para eliminar esta cita.');
            return;
        }

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
        if (newStatus === 'completed') {
            const appointment = appointments.find(a => a.id === id);
            if (appointment) {
                // Pre-cargar el precio del servicio
                const service = services.find(s => s.id === appointment.serviceId);
                setPaymentFormData({
                    amount: service?.price || 0,
                    payment_method: 'cash',
                    notes: ''
                });
                setAppointmentToPay(appointment);
                setIsPaymentModalOpen(true);
            }
            return;
        }

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

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointmentToPay) return;

        setSaving(true);
        try {
            // 1. Registrar el pago
            await api.createPayment({
                appointment_id: appointmentToPay.id,
                patient_id: appointmentToPay.patientId,
                amount: paymentFormData.amount,
                payment_method: paymentFormData.payment_method,
                notes: paymentFormData.notes
            });

            // 2. Cambiar estado de la cita a completada
            await api.updateAppointment(appointmentToPay.id, { status: 'completed' });

            setIsPaymentModalOpen(false);
            setIsDetailsModalOpen(false);
            setAppointmentToPay(null);
            await loadData();
            alert('Pago registrado y cita completada con éxito.');
        } catch (error: any) {
            console.error('Error registrando pago:', error);
            alert('Error al registrar pago: ' + error.message);
        } finally {
            setSaving(false);
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
            time: format(parseISO(appointment.date), 'HH:mm')
        });
        setIsDetailsModalOpen(false);
        setIsModalOpen(true);
    };



    const getHours = () => {
        const slots: Date[] = [];
        let current = startOfDay(currentDate);
        current.setHours(8, 0, 0, 0); // Inicio a las 8:00
        const end = new Date(current);
        end.setHours(20, 0, 0, 0); // Fin a las 20:00

        while (current < end) {
            slots.push(new Date(current));
            current = new Date(current.getTime() + slotInterval * 60000);
        }
        return slots;
    };

    const hours = getHours();

    const filteredAppointments = appointments.filter(apt =>
        (selectedSede === 'all' || apt.sede === selectedSede)
    );

    const getAppointmentsForSlot = (day: Date, hour: Date) => {
        const cellDateStr = format(day, 'yyyy-MM-dd');
        const cellStart = new Date(day);
        cellStart.setHours(hour.getHours(), hour.getMinutes(), 0, 0);
        const cellEnd = new Date(cellStart.getTime() + slotInterval * 60000);

        return filteredAppointments.filter(apt => {
            const aptStart = parseISO(apt.date);
            const aptDateStr = format(aptStart, 'yyyy-MM-dd');

            if (aptDateStr !== cellDateStr) return false;

            const service = services.find(s => s.id === apt.serviceId);
            const duration = service?.duration || 60;
            const aptEnd = new Date(aptStart.getTime() + duration * 60000);

            return (aptStart < cellEnd) && (aptEnd > cellStart);
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
                    {(['day', 'week', 'month'] as const).map((viewOption) => (
                        <button
                            key={viewOption}
                            onClick={() => setView(viewOption)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === viewOption ? 'bg-white shadow text-company-blue' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {viewOption === 'day' ? 'Día' : viewOption === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                        value={selectedSede}
                        onChange={(e) => {
                            const val = e.target.value as any;
                            setSelectedSede(val);
                            // Sincronizar sede del formulario si se selecciona una sede específica
                            if (val !== 'all') {
                                setFormData(prev => ({ ...prev, sede: val }));
                            }
                        }}
                    >
                        {user?.role === 'admin' && <option value="all">Todas las Sedes</option>}
                        {(user?.role === 'admin' ? ['norte', 'sur'] : user?.sedes_permitidas || []).map(s => (
                            <option key={s} value={s} className="capitalize transition-colors">
                                Sede {s}
                            </option>
                        ))}
                    </select>

                    <div className="flex bg-white rounded-lg border shadow-sm p-1">
                        {[15, 30, 60].map((interval) => (
                            <button
                                key={interval}
                                onClick={() => setSlotInterval(interval as 15 | 30 | 60)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${slotInterval === interval
                                    ? 'bg-company-blue text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {interval}m
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="bg-company-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Cita</span>
                    </button>
                </div>
            </div>

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
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="min-w-[800px]">
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
                        <div className="divide-y relative">
                            {hours.map(hour => (
                                <div key={hour.toString()} className={`grid group hover:bg-slate-50 ${view === 'day' ? 'grid-cols-2' : 'grid-cols-8'}`}>
                                    <div className="p-2 border-r text-xs text-slate-500 text-center flex items-center justify-center w-20 h-24">
                                        {format(hour, 'HH:mm')}
                                    </div>
                                    {daysToShow.map(day => {
                                        const appointmentsInSlot = getAppointmentsForSlot(day, hour);
                                        return (
                                            <div key={day.toString()} className={`p-0 border-r h-24 relative transition-all duration-200 ${appointmentsInSlot.length === 0 ? 'hover:bg-blue-50/50 hover:shadow-inner cursor-pointer' : ''}`}>
                                                {appointmentsInSlot.map(appointment => {
                                                    const aptStart = parseISO(appointment.date);
                                                    const service = services.find(s => s.id === appointment.serviceId);
                                                    const duration = service?.duration || 60;

                                                    // Solo mostrar si el inicio de la cita cae en este exacto slot de hora/minuto
                                                    if (aptStart.getHours() !== hour.getHours() || aptStart.getMinutes() !== hour.getMinutes()) return null;

                                                    // Altura proporcional a la duración (60 min = 96px)
                                                    const height = (duration * 1.6);

                                                    return (
                                                        <div
                                                            key={appointment.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedAppointment(appointment);
                                                                setIsDetailsModalOpen(true);
                                                            }}
                                                            style={{
                                                                height: `${height}px`,
                                                                zIndex: 20
                                                            }}
                                                            className={`absolute left-1 right-1 border-l-4 rounded p-1 text-xs overflow-hidden cursor-pointer shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${getServiceColor(appointment.serviceName)}`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <p className="font-bold truncate">{appointment.patientName}</p>
                                                                <div className={`w-2 h-2 rounded-full ${appointment.sede === 'norte' ? 'bg-blue-500' : 'bg-purple-500'}`} title={`Sede ${appointment.sede}`} />
                                                            </div>
                                                            <p className="truncate opacity-80 text-[10px]">{appointment.serviceName}</p>
                                                            <div className="mt-0.5 flex items-center justify-between">
                                                                <span className="text-[9px] font-medium">
                                                                    {format(aptStart, 'HH:mm')} ({duration}')
                                                                </span>
                                                                <span className="bg-white/50 px-1 rounded text-[9px] flex items-center gap-1">
                                                                    {appointment.status === 'completed' && '✓'}
                                                                    {getStatusText(appointment.status)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {appointmentsInSlot.length === 0 && (
                                                    <div
                                                        className="w-full h-full flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity duration-300"
                                                        onClick={() => {
                                                            setSelectedAppointment(null);
                                                            setFormData({
                                                                ...formData,
                                                                date: format(day, 'yyyy-MM-dd'),
                                                                time: format(hour, 'HH:mm')
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

            {/* MODAL: NUEVA / EDITAR CITA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">
                                {selectedAppointment ? 'Editar Cita' : 'Nueva Cita'}
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setSelectedAppointment(null); resetForm(); }} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={selectedAppointment ? handleUpdateAppointment : handleSubmit} className="space-y-4">
                            {/* Paciente */}
                            <div className="relative" ref={searchRef}>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Paciente *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-company-blue outline-none transition-all"
                                        placeholder="Buscar por nombre o cédula..."
                                        value={patientSearchTerm}
                                        onChange={(e) => {
                                            setPatientSearchTerm(e.target.value);
                                            setShowPatientSuggestions(true);
                                            if (formData.patientId) setFormData({ ...formData, patientId: '' });
                                        }}
                                        onFocus={() => setShowPatientSuggestions(true)}
                                    />
                                    {patientSearchTerm && (
                                        <button type="button" onClick={() => { setPatientSearchTerm(''); setFormData({ ...formData, patientId: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {showPatientSuggestions && filteredPatients.length > 0 && (
                                    <ul className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {filteredPatients.map((patient) => (
                                            <li key={patient.id} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0" onClick={() => handleSelectPatient(patient)}>
                                                <p className="text-sm font-bold text-slate-800">{patient.name}</p>
                                                <p className="text-xs text-slate-500">{patient.cedula}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Servicio */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Servicio *</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
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

                            {/* Sede */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Sede *</label>
                                <div className="flex gap-4">
                                    {(user?.role === 'admin' ? (['norte', 'sur'] as const) : user?.sedes_permitidas || []).map(s => (
                                        <label key={s} className="flex items-center cursor-pointer group">
                                            <input
                                                type="radio"
                                                value={s}
                                                checked={formData.sede === s}
                                                onChange={(e) => setFormData({ ...formData, sede: e.target.value as Sede })}
                                                className="mr-2 w-4 h-4 text-company-blue focus:ring-company-blue"
                                            />
                                            <span className="text-sm font-medium text-slate-600 group-hover:text-company-blue capitalize">{s}</span>
                                        </label>
                                    ))}
                                    {(!user?.role || (user.role === 'podologo' && (!user.sedes_permitidas || user.sedes_permitidas.length === 0))) && (
                                        <p className="text-xs text-red-500 italic">No tienes sedes asignadas. Contacta al admin.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Hora *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                        placeholder="Ej: 08:30"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t font-semibold">
                                <button type="button" onClick={() => { setIsModalOpen(false); setSelectedAppointment(null); resetForm(); }} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-700 shadow-lg disabled:opacity-50">
                                    {saving ? 'Guardando...' : (selectedAppointment ? 'Actualizar' : 'Guardar Cita')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DETALLES DE CITA */}
            {isDetailsModalOpen && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Detalles de la Cita</h2>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Paciente</span>
                                    <p className="font-bold text-slate-800">{selectedAppointment.patientName}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Servicio</span>
                                    <p className="font-bold text-slate-800">{selectedAppointment.serviceName}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Fecha y Hora</span>
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {format(parseISO(selectedAppointment.date), "d 'de' MMMM", { locale: es })}
                                        <Clock className="w-3.5 h-3.5 ml-1" />
                                        {format(parseISO(selectedAppointment.date), "HH:mm")}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Profesional</span>
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                        <User className="w-3.5 h-3.5" />
                                        {selectedAppointment.professionalName}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-200 bg-white">
                                <span className="text-sm font-bold text-slate-700 block mb-3">Actualizar Estado:</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment?.id || '', 'scheduled')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${selectedAppointment.status === 'scheduled'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                    >
                                        Programada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment?.id || '', 'completed')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${selectedAppointment.status === 'completed'
                                            ? 'bg-green-600 text-white shadow-md cursor-default'
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                            }`}
                                    >
                                        {selectedAppointment.status === 'completed' ? 'Atendida ✓' : 'Completar'}
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment?.id || '', 'cancelled')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${selectedAppointment.status === 'cancelled'
                                            ? 'bg-red-600 text-white shadow-md'
                                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                                            }`}
                                    >
                                        Cancelada
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button onClick={() => openEditModal(selectedAppointment)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium">
                                    <Edit className="w-4 h-4" />
                                    Editar Cita
                                </button>
                                {(user?.role === 'admin' || user?.id === selectedAppointment.professionalId) && (
                                    <button onClick={() => handleDeleteAppointment(selectedAppointment.id, selectedAppointment)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-medium border border-red-100">
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                )}
                            </div>

                            <button onClick={() => navigate(`/pacientes/${selectedAppointment.patientId}`)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all font-bold border border-blue-100">
                                <FileText className="w-4 h-4" />
                                Ver Expediente Clínico Completo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTRAR PAGO */}
            {isPaymentModalOpen && appointmentToPay && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Registrar Pago</h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePayment} className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg mb-4">
                                <p className="text-sm text-slate-500 mb-1">Servicio: <span className="font-bold text-slate-800">{appointmentToPay.serviceName}</span></p>
                                <p className="text-sm text-slate-500">Paciente: <span className="font-bold text-slate-800">{appointmentToPay.patientName}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Monto a Pagar ($) *</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={paymentFormData.amount}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Método de Pago *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['cash', 'transfer', 'card'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentFormData({ ...paymentFormData, payment_method: method })}
                                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${paymentFormData.payment_method === method
                                                ? 'bg-company-blue border-company-blue text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-company-blue'
                                                }`}
                                        >
                                            {method === 'cash' ? 'Efectivo' : method === 'transfer' ? 'Transf.' : 'Tarjeta'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (Opcional)</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-company-blue"
                                    rows={2}
                                    placeholder="Ej: Pago parcial, descuento aplicado..."
                                    value={paymentFormData.notes}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t font-semibold">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3 bg-company-green text-white rounded-lg hover:bg-green-600 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? 'Procesando...' : 'Registrar Pago y Finalizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
