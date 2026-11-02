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
    addMonths,
    subMonths,
    startOfDay,
    parseISO,
    isValid,
    isSameMonth,
    isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Appointment, Sede, Patient, Service, PaymentMethod, Product } from '../types';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
    Edit, Trash2, User, FileText, Search, Settings2,
    CalendarDays, MoreHorizontal, Check
} from 'lucide-react';

export default function Agenda() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'month'>('week');
    const [selectedSede, setSelectedSede] = useState<Sede | 'all'>('all');
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
    const [availableProfessionals, setAvailableProfessionals] = useState<{ id: string; name: string }[]>([]);
    const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
    const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
    const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState(false);
    const [nowTime, setNowTime] = useState(new Date());
    const [isNavigating, setIsNavigating] = useState(false);

    // Reloj en tiempo real para la línea de hora actual (cada 60 segundos)
    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
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

    // Intervalos
    const [slotInterval, setSlotInterval] = useState<15 | 30 | 60>(30);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [appointmentToPay, setAppointmentToPay] = useState<Appointment | null>(null);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState<number>(0);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: 0,
        payment_method: 'cash' as PaymentMethod,
        notes: '',
        selectedProducts: [] as { id: string, name: string, price: number, quantity: number }[],
        adjustment_type: 'none' as 'none' | 'discount' | 'extra',
        adjustment_amount: 0,
        adjustment_reason: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (user) {
            const permitidas = user.sedes_permitidas || [];
            if (user.role === 'podologo' && permitidas.length > 0) {
                if (selectedSede === 'all' || !permitidas.includes(selectedSede as Sede)) {
                    const initialSede = permitidas[0];
                    setSelectedSede(initialSede);
                    setFormData(prev => ({ ...prev, sede: initialSede }));
                }
            }
        }
    }, [user]);

    useEffect(() => {
        if (patientSearchTerm.trim() === '') {
            setFilteredPatients([]);
        } else {
            const filtered = patients.filter(patient =>
                (patient.name?.toLowerCase() || '').includes(patientSearchTerm.toLowerCase()) ||
                (patient.cedula?.toLowerCase() || '').includes(patientSearchTerm.toLowerCase())
            );
            setFilteredPatients(filtered);
        }
    }, [patientSearchTerm, patients]);

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
            const [appointmentsData, patientsData, servicesData, productsData] = await Promise.all([
                api.getAppointments(),
                api.getPatients(),
                api.getServices(),
                api.getProducts()
            ]);
            setAppointments(appointmentsData);
            setPatients(patientsData);
            setServices(servicesData);
            setProducts(productsData);

            // Extraer lista de profesionales únicos para el filtro cruzado
            const profMap = new Map<string, string>();
            appointmentsData.forEach(apt => {
                if (apt.professionalId && apt.professionalName) {
                    profMap.set(apt.professionalId, apt.professionalName);
                }
            });
            if (user?.id && user?.name) {
                profMap.set(user.id, user.name);
            }
            setAvailableProfessionals(Array.from(profMap.entries()).map(([id, name]) => ({ id, name })));
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

    const handleUpdateAppointment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
                const service = services.find(s => s.id === appointment.serviceId);
                setPaymentFormData({
                    amount: service?.price || 0,
                    payment_method: 'cash',
                    notes: '',
                    selectedProducts: [],
                    adjustment_type: 'none',
                    adjustment_amount: 0,
                    adjustment_reason: ''
                });
                setAppointmentToPay(appointment);
                setIsNotesOpen(false);
                setCashReceived(0);
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

    // ✅ FUNCIÓN CORREGIDA - AHORA USA LA FECHA DE LA CITA
    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointmentToPay) return;

        setSaving(true);
        try {
            // Calcular monto final del servicio con ajustes
            const adjustmentAmt = Number(paymentFormData.adjustment_amount) || 0;
            let finalServiceAmount = Number(paymentFormData.amount) || 0;
            let adjustmentDetails = '';

            if (paymentFormData.adjustment_type === 'discount') {
                finalServiceAmount -= adjustmentAmt;
                adjustmentDetails = ` - Descuento: $${adjustmentAmt}`;
            } else if (paymentFormData.adjustment_type === 'extra') {
                finalServiceAmount += adjustmentAmt;
                adjustmentDetails = ` + Extra: $${adjustmentAmt}`;
            }

            if (finalServiceAmount < 0) finalServiceAmount = 0; // Prevenir montos negativos

            let finalNotes = paymentFormData.notes || `Cita Completada: ${appointmentToPay.patientName}`;
            if (paymentFormData.adjustment_type !== 'none' && adjustmentAmt > 0) {
                finalNotes += `\n[Ajuste Aplicado${adjustmentDetails}]`;
                if (paymentFormData.adjustment_reason) {
                    finalNotes += ` Motivo: ${paymentFormData.adjustment_reason}`;
                }
            }

            // CREAR VENTA CON appointment_id Y LA FECHA DE LA CITA
            const createdSale = await api.createSale({
                appointment_id: appointmentToPay.id,
                patient_id: appointmentToPay.patientId,
                sede: appointmentToPay.sede, // ← Hereda la sede de la cita
                custom_date: appointmentToPay.date, // ← USAR LA FECHA DE LA CITA
                items: paymentFormData.selectedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.quantity,
                    unit_price: p.price
                })),
                service_amount: finalServiceAmount,
                payment_method: paymentFormData.payment_method,
                notes: finalNotes // Notas guardadas con auditoría de ajuste
            });

            // ACTUALIZAR ESTADO DE LA CITA (Con rollback compensatorio si falla)
            try {
                await api.updateAppointment(appointmentToPay.id, { status: 'completed' });
            } catch (appointmentError: any) {
                console.error('Error al actualizar cita, ejecutando rollback compensatorio de la venta:', appointmentError);
                if (createdSale?.id) {
                    try {
                        await api.cancelSale(createdSale.id, 'Rollback: Fallo al actualizar cita');
                    } catch (cancelError: any) {
                        console.error('Error al cancelar la venta durante el rollback:', cancelError);
                    }
                }
                throw new Error(
                    `No se pudo completar la cita (${appointmentError.message || 'Error en cita'}). ` +
                    'La venta fue revertida y el stock devuelto al inventario.'
                );
            }

            // CERRAR MODALES
            setIsPaymentModalOpen(false);
            setIsDetailsModalOpen(false);
            setAppointmentToPay(null);

            // RECARGAR DATOS
            await loadData();

            alert('✅ Pago registrado y cita completada con éxito.');
        } catch (error: any) {
            console.error('Error registrando pago:', error);
            alert('Error al registrar pago: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

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
        current.setHours(8, 0, 0, 0);
        const end = new Date(current);
        end.setHours(20, 0, 0, 0);

        while (current < end) {
            slots.push(new Date(current));
            current = new Date(current.getTime() + slotInterval * 60000);
        }
        return slots;
    };

    const hours = getHours();

    const handleNavigateDate = (newDate: Date) => {
        setIsNavigating(true);
        setCurrentDate(newDate);
        setTimeout(() => setIsNavigating(false), 150);
    };

    const filteredAppointments = appointments.filter(apt => {
        const matchSede = (selectedSede === 'all' || apt.sede === selectedSede);
        const matchProf = (selectedProfessional === 'all' || apt.professionalId === selectedProfessional);
        return matchSede && matchProf;
    });

    const getAppointmentsForSlot = (day: Date, hour: Date) => {
        if (!day || !hour) return [];

        const cellDateStr = format(day, 'yyyy-MM-dd');
        const cellStart = new Date(day);
        cellStart.setHours(hour.getHours(), hour.getMinutes(), 0, 0);
        const cellEnd = new Date(cellStart.getTime() + slotInterval * 60000);

        return filteredAppointments.filter(apt => {
            try {
                if (!apt?.date) return false;

                const aptStart = parseISO(apt.date);

                if (!isValid(aptStart)) return false;

                const aptDateStr = format(aptStart, 'yyyy-MM-dd');

                if (aptDateStr !== cellDateStr) return false;

                const service = services.find(s => s.id === apt.serviceId);
                const duration = Number(service?.duration) || 60;
                const aptEnd = new Date(aptStart.getTime() + duration * 60000);

                return (aptStart < cellEnd) && (aptEnd > cellStart);
            } catch (error) {
                console.error('Error procesando cita:', apt, error);
                return false;
            }
        });
    };

    const getServiceBackground = (serviceName: string | undefined) => {
        if (!serviceName) return 'bg-slate-50 hover:bg-slate-100/90 text-slate-800';

        const name = serviceName.toLowerCase();
        if (name.includes('consulta')) return 'bg-sky-50/90 hover:bg-sky-100/90 text-sky-950';
        if (name.includes('uña') || name.includes('corte')) return 'bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-950';
        if (name.includes('hongo') || name.includes('tratamiento')) return 'bg-amber-50/90 hover:bg-amber-100/90 text-amber-950';
        if (name.includes('plantilla') || name.includes('orto')) return 'bg-purple-50/90 hover:bg-purple-100/90 text-purple-950';
        return 'bg-blue-50/90 hover:bg-blue-100/90 text-blue-950';
    };

    const getStatusBorder = (status: string) => {
        switch (status) {
            case 'completed': return 'border-l-emerald-500';
            case 'cancelled': return 'border-l-slate-400';
            default: return 'border-l-amber-500'; // Programada / Falta cobrar
        }
    };

    const getDaysToShow = () => {
        if (view === 'day') {
            return [currentDate];
        }
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
        }
        return [];
    };

    const daysToShow = getDaysToShow();

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            {loading && <div className="text-center py-4 text-slate-500">Cargando agenda...</div>}

            {/* Backdrop para cerrar menús flotantes al hacer click fuera */}
            {(isMiniCalendarOpen || isIntervalMenuOpen || isOverflowMenuOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-black/10 transition-opacity"
                    onClick={() => {
                        setIsMiniCalendarOpen(false);
                        setIsIntervalMenuOpen(false);
                        setIsOverflowMenuOpen(false);
                    }}
                />
            )}

            {/* BARRA UNIFICADA DE CONTROL (Estilo Google Calendar / consultorio.me) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs px-3.5 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 relative z-40">
                {/* LADO IZQUIERDO: Título, Botón Hoy, Flechas y Fecha */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-company-blue flex items-center justify-center font-bold">
                            <Calendar className="w-4 h-4 text-company-blue" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Agenda</h1>
                    </div>

                    <div className="h-5 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleNavigateDate(new Date())}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition-all"
                            title="Ir al día de hoy"
                        >
                            Hoy
                        </button>
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    if (view === 'day') handleNavigateDate(addDays(currentDate, -1));
                                    else if (view === 'week') handleNavigateDate(addDays(currentDate, -7));
                                    else handleNavigateDate(startOfMonth(addDays(startOfMonth(currentDate), -1)));
                                }}
                                className="p-1 hover:bg-white hover:shadow-xs rounded-md text-slate-600 transition-all active:scale-95"
                                title="Anterior (Día/Semana)"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (view === 'day') handleNavigateDate(addDays(currentDate, 1));
                                    else if (view === 'week') handleNavigateDate(addDays(currentDate, 7));
                                    else handleNavigateDate(startOfMonth(addDays(endOfMonth(currentDate), 1)));
                                }}
                                className="p-1 hover:bg-white hover:shadow-xs rounded-md text-slate-600 transition-all active:scale-95"
                                title="Siguiente (Día/Semana)"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <span className="font-bold text-sm text-slate-800 capitalize select-none ml-1.5 whitespace-nowrap">
                            {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : "MMMM yyyy", { locale: es })}
                        </span>
                    </div>
                </div>

                {/* LADO DERECHO: Sedes, Especialistas, Vistas, Herramientas y Nueva Cita */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
                    {/* Selector de Sede en Pills con colores distintivos */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5" title="Filtrar citas por sede">
                        {user?.role === 'admin' && (
                            <button
                                type="button"
                                onClick={() => setSelectedSede('all')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                    selectedSede === 'all'
                                        ? 'bg-white text-slate-800 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Todas
                            </button>
                        )}
                        {(user?.role === 'admin' ? ['norte', 'sur'] : user?.sedes_permitidas || []).map(s => {
                            const isSelected = selectedSede === s;
                            const colorClass = s === 'norte'
                                ? (isSelected ? 'bg-blue-500 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-blue-600')
                                : (isSelected ? 'bg-purple-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-purple-600');
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSede(s as Sede);
                                        setFormData(prev => ({ ...prev, sede: s as Sede }));
                                    }}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${colorClass}`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filtro Cruzado de Especialistas */}
                    {(user?.role === 'admin' || availableProfessionals.length > 1) && (
                        <div className="relative" title="Filtrar por especialista">
                            <select
                                value={selectedProfessional}
                                onChange={(e) => setSelectedProfessional(e.target.value)}
                                className="pl-7 pr-3 py-1 bg-slate-100 hover:bg-slate-200/80 border-0 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer appearance-none focus:ring-2 focus:ring-blue-500 h-8"
                            >
                                <option value="all">👨‍⚕️ Todos los especialistas</option>
                                {availableProfessionals.map(p => (
                                    <option key={p.id} value={p.id}>
                                        Dr(a). {p.name}
                                    </option>
                                ))}
                            </select>
                            <User className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    )}

                    {/* Selector de Vistas (Día, Semana, Mes) */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl">
                        {(['day', 'week', 'month'] as const).map((viewOption) => (
                            <button
                                key={viewOption}
                                type="button"
                                onClick={() => setView(viewOption)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                    view === viewOption
                                        ? 'bg-white shadow-xs text-company-blue'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {viewOption === 'day' ? 'Día' : viewOption === 'week' ? 'Sem' : 'Mes'}
                            </button>
                        ))}
                    </div>

                    {/* HERRAMIENTAS DESKTOP (>= lg): Intervalos y Mini-calendario */}
                    <div className="hidden lg:flex items-center gap-1">
                        {/* Selector de Intervalos ⚙️ */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsIntervalMenuOpen(!isIntervalMenuOpen);
                                    setIsMiniCalendarOpen(false);
                                    setIsOverflowMenuOpen(false);
                                }}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                    isIntervalMenuOpen
                                        ? 'bg-blue-50 border-blue-200 text-company-blue'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title="Configurar resolución de intervalos (15m, 30m, 60m)"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>

                            {isIntervalMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Resolución de Agenda
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {[15, 30, 60].map((interval) => (
                                            <button
                                                key={interval}
                                                type="button"
                                                onClick={() => {
                                                    setSlotInterval(interval as 15 | 30 | 60);
                                                    setIsIntervalMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    slotInterval === interval
                                                        ? 'bg-blue-50 text-company-blue font-semibold'
                                                        : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span>{interval} minutos {interval === 30 ? '(Recomendado)' : ''}</span>
                                                {slotInterval === interval && <Check className="w-3.5 h-3.5 text-company-blue" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Widget Mini-Calendario 🗓️ */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setMiniCalendarDate(currentDate);
                                    setIsMiniCalendarOpen(!isMiniCalendarOpen);
                                    setIsIntervalMenuOpen(false);
                                    setIsOverflowMenuOpen(false);
                                }}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                    isMiniCalendarOpen
                                        ? 'bg-blue-50 border-blue-200 text-company-blue'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title="Abrir selector rápido de fecha mensual"
                            >
                                <CalendarDays className="w-4 h-4" />
                            </button>

                            {isMiniCalendarOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-sm text-slate-800 capitalize">
                                            {format(miniCalendarDate, 'MMMM yyyy', { locale: es })}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setMiniCalendarDate(subMonths(miniCalendarDate, 1))}
                                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                                title="Mes anterior"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMiniCalendarDate(new Date())}
                                                className="px-2 py-0.5 text-[10px] font-semibold text-company-blue hover:bg-blue-50 rounded"
                                                title="Mes actual"
                                            >
                                                Hoy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMiniCalendarDate(addMonths(miniCalendarDate, 1))}
                                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                                title="Mes siguiente"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, idx) => (
                                            <span key={idx} className="text-[11px] font-semibold text-slate-400">
                                                {d}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {eachDayOfInterval({
                                            start: startOfWeek(startOfMonth(miniCalendarDate), { weekStartsOn: 1 }),
                                            end: endOfWeek(endOfMonth(miniCalendarDate), { weekStartsOn: 1 })
                                        }).map((day, idx) => {
                                            const isSelected = isSameDay(day, currentDate);
                                            const isDayToday = isSameDay(day, new Date());
                                            const isCurrentMonthDay = isSameMonth(day, miniCalendarDate);

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        handleNavigateDate(day);
                                                        setIsMiniCalendarOpen(false);
                                                    }}
                                                    className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? 'bg-company-blue text-white font-bold shadow-xs'
                                                            : isDayToday
                                                            ? 'bg-blue-50 text-company-blue font-bold border border-blue-200'
                                                            : isCurrentMonthDay
                                                            ? 'text-slate-700 hover:bg-slate-100'
                                                            : 'text-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTÓN OVERFLOW [...] PARA PANTALLAS PEQUEÑAS (< lg) */}
                    <div className="lg:hidden relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOverflowMenuOpen(!isOverflowMenuOpen);
                                setIsMiniCalendarOpen(false);
                                setIsIntervalMenuOpen(false);
                            }}
                            className={`p-1.5 rounded-xl border transition-colors ${
                                isOverflowMenuOpen
                                    ? 'bg-blue-50 border-blue-200 text-company-blue'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Más opciones de agenda"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isOverflowMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b pb-1 mb-1">
                                    Opciones adicionales
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOverflowMenuOpen(false);
                                        setMiniCalendarDate(currentDate);
                                        setIsMiniCalendarOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    <CalendarDays className="w-4 h-4 text-company-blue" />
                                    <span>Selector de fecha mensual</span>
                                </button>
                                <div className="mt-2 pt-2 border-t">
                                    <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Intervalo de tiempo
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        {[15, 30, 60].map((int) => (
                                            <button
                                                key={int}
                                                type="button"
                                                onClick={() => {
                                                    setSlotInterval(int as 15 | 30 | 60);
                                                    setIsOverflowMenuOpen(false);
                                                }}
                                                className={`py-1 text-xs rounded font-semibold text-center ${
                                                    slotInterval === int
                                                        ? 'bg-company-blue text-white'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {int}m
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BOTÓN PRINCIPAL [+ NUEVA CITA] */}
                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                        title="Agendar una nueva cita"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Cita</span>
                    </button>
                </div>
            </div>

            {/* FRANJA DE LEYENDA DISCRETA DE SERVICIOS */}
            <div className="flex items-center justify-between text-xs px-3.5 py-1.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-slate-600 overflow-x-auto whitespace-nowrap gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leyenda:</span>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                        <span className="text-slate-600 text-xs">Consulta</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-slate-600 text-xs">Uña / Corte</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-slate-600 text-xs">Hongo / Tratamiento</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                        <span className="text-slate-600 text-xs">Plantilla / Orto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-slate-600 text-xs">Otros</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        📅 {filteredAppointments.length} citas registradas
                    </span>
                </div>
            </div>

            {/* Grid de agenda */}
            <div className={`flex-1 overflow-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-opacity duration-150 ${isNavigating ? 'opacity-60' : 'opacity-100'}`}>
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
                                const dayAppointments = filteredAppointments.filter(apt => {
                                    try {
                                        if (!apt?.date) return false;
                                        const aptDate = parseISO(apt.date);
                                        return isValid(aptDate) && isSameDay(aptDate, day);
                                    } catch {
                                        return false;
                                    }
                                });
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
                                                <div key={apt.id} className={`text-[10px] truncate px-1 py-0.5 rounded border-l-2 ${getStatusBorder(apt.status)} ${getServiceBackground(apt.serviceName)} flex items-center justify-between gap-1`}>
                                                    <span className="font-semibold truncate">{apt.date ? format(parseISO(apt.date), 'HH:mm') : '--:--'} {apt.patientName}</span>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${apt.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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
                        <div
                            className="grid border-b sticky top-0 bg-slate-50 z-10"
                            style={{ gridTemplateColumns: view === 'day' ? '5rem minmax(0, 1fr)' : '5rem repeat(7, minmax(0, 1fr))' }}
                        >
                            <div className="p-3 border-r text-xs font-semibold text-slate-500 text-center">Hora</div>
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
                                <div
                                    key={hour.toString()}
                                    className="grid group hover:bg-slate-50"
                                    style={{ gridTemplateColumns: view === 'day' ? '5rem minmax(0, 1fr)' : '5rem repeat(7, minmax(0, 1fr))' }}
                                >
                                    <div className="p-2 border-r text-xs text-slate-500 text-center flex items-center justify-center h-24">
                                        {format(hour, 'HH:mm')}
                                    </div>
                                    {daysToShow.map(day => {
                                        const appointmentsInSlot = getAppointmentsForSlot(day, hour);

                                        // Cálculo del Indicador de Hora Actual en Tiempo Real
                                        const slotStart = new Date(day);
                                        slotStart.setHours(hour.getHours(), hour.getMinutes(), 0, 0);
                                        const slotEnd = new Date(slotStart.getTime() + slotInterval * 60000);
                                        const isToday = isSameDay(day, nowTime);
                                        const isCurrentTimeInSlot = isToday && nowTime >= slotStart && nowTime < slotEnd;
                                        const nowMinutesOffset = (nowTime.getTime() - slotStart.getTime()) / 60000;
                                        const nowTopOffset = nowMinutesOffset * 1.6;

                                        return (
                                            <div key={day.toString()} className={`p-0 border-r h-24 relative transition-all duration-200 ${appointmentsInSlot.length === 0 ? 'hover:bg-blue-50/50 hover:shadow-inner cursor-pointer' : ''}`}>
                                                {/* Indicador de Hora Actual en Tiempo Real */}
                                                {isCurrentTimeInSlot && (
                                                    <div
                                                        style={{ top: `${nowTopOffset}px` }}
                                                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                                                    >
                                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-400 ring-2 ring-white -ml-1 z-30 animate-pulse" />
                                                        <div className="flex-1 border-t-2 border-rose-500 border-dashed" />
                                                        <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ml-1 mr-1">
                                                            {format(nowTime, 'HH:mm')}
                                                        </span>
                                                    </div>
                                                )}
                                                {appointmentsInSlot.map(appointment => {
                                                    try {
                                                        if (!appointment?.date) return null;

                                                        const aptStart = parseISO(appointment.date);
                                                        if (!isValid(aptStart)) return null;

                                                        const service = services.find(s => s.id === appointment.serviceId);
                                                        const duration = Number(service?.duration) || 60;

                                                        const slotStart = new Date(day);
                                                        slotStart.setHours(hour.getHours(), hour.getMinutes(), 0, 0);
                                                        const slotEnd = new Date(slotStart.getTime() + slotInterval * 60000);

                                                        if (aptStart < slotStart || aptStart >= slotEnd) return null;

                                                        const height = (duration * 1.6);
                                                        const minutesOffset = (aptStart.getTime() - slotStart.getTime()) / 60000;
                                                        const topOffset = (minutesOffset * 1.6);

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
                                                                    top: `${topOffset}px`,
                                                                    zIndex: 20
                                                                }}
                                                                className={`absolute left-1 right-1 rounded-lg p-1.5 text-xs overflow-hidden cursor-pointer shadow-xs transition-all duration-200 hover:scale-[1.01] hover:shadow-md border border-slate-200/70 border-l-4 ${getStatusBorder(appointment.status)} ${getServiceBackground(appointment.serviceName)} flex flex-col justify-between`}
                                                            >
                                                                <div>
                                                                    <div className="flex justify-between items-start gap-1">
                                                                        <p className="font-bold text-slate-900 truncate text-[11px] leading-tight">{appointment.patientName}</p>
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${appointment.sede === 'norte' ? 'bg-blue-500' : 'bg-purple-500'}`} title={`Sede ${appointment.sede}`} />
                                                                    </div>
                                                                    <p className="truncate text-slate-600 text-[10px] mt-0.5 font-medium leading-tight">{appointment.serviceName}</p>
                                                                </div>

                                                                <div className="mt-1 flex items-center justify-between gap-1 pt-0.5 border-t border-black/5">
                                                                    <span className="text-[10px] font-semibold text-slate-600">
                                                                        {format(aptStart, 'HH:mm')} ({duration}')
                                                                    </span>

                                                                    {/* Pastilla de Alto Contraste de Estado de Pago */}
                                                                    {appointment.status === 'completed' ? (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white shadow-2xs tracking-wide shrink-0">
                                                                            <span>✓</span>
                                                                            <span>PAGADO</span>
                                                                        </span>
                                                                    ) : appointment.status === 'cancelled' ? (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-400 text-white shadow-2xs tracking-wide shrink-0 line-through">
                                                                            <span>✕</span>
                                                                            <span>CANCELADA</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-2xs tracking-wide shrink-0">
                                                                            <span>⏳</span>
                                                                            <span>FALTA PAGO</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    } catch (error) {
                                                        console.error('Error renderizando cita:', error);
                                                        return null;
                                                    }
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

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Servicio *</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-company-blue outline-none"
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                >
                                    <option value="">Seleccionar servicio</option>
                                    {services
                                        .filter(service => !service.available_sedes || service.available_sedes.length === 0 || service.available_sedes.includes(formData.sede))
                                        .map(service => (
                                            <option key={service.id} value={service.id}>
                                                {service.name} - ${service.price} ({service.duration} min)
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Sede *</label>
                                <div className="flex gap-4">
                                    {(user?.role === 'admin' ? (['norte', 'sur'] as const) : user?.sedes_permitidas || []).map(s => (
                                        <label key={s} className="flex items-center cursor-pointer group">
                                            <input
                                                type="radio"
                                                value={s}
                                                checked={formData.sede === s}
                                                onChange={(e) => {
                                                    const newSede = e.target.value as Sede;
                                                    const curService = services.find(srv => srv.id === formData.serviceId);
                                                    const isStillValid = curService && (!curService.available_sedes || curService.available_sedes.length === 0 || curService.available_sedes.includes(newSede));
                                                    setFormData({
                                                        ...formData,
                                                        sede: newSede,
                                                        serviceId: isStillValid ? formData.serviceId : ''
                                                    });
                                                }}
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
                                        {selectedAppointment.date ? format(parseISO(selectedAppointment.date), "d 'de' MMMM", { locale: es }) : 'Fecha no disponible'}
                                        <Clock className="w-3.5 h-3.5 ml-1" />
                                        {selectedAppointment.date ? format(parseISO(selectedAppointment.date), "HH:mm") : '--:--'}
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

                        <form
                            onSubmit={handleSavePayment}
                            className="space-y-4"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !saving) {
                                    e.preventDefault();
                                    handleSavePayment(e as unknown as React.FormEvent);
                                }
                            }}
                        >
                            <div className="bg-slate-50 p-4 rounded-lg mb-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Servicio: <span className="font-bold text-slate-800">{appointmentToPay.serviceName}</span></span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">Precio: $</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-20 px-2 py-1 text-right border border-slate-300 rounded focus:ring-2 focus:ring-company-blue outline-none font-bold text-slate-800"
                                            value={paymentFormData.amount}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 border-t border-slate-200 pt-2">Paciente: <span className="font-bold text-slate-800">{appointmentToPay.patientName}</span></p>
                            </div>

                            {/* AJUSTE MANUAL */}
                            <div className="border rounded-lg p-3 space-y-3 bg-white">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Ajuste Manual al Servicio</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentFormData({ ...paymentFormData, adjustment_type: paymentFormData.adjustment_type === 'discount' ? 'none' : 'discount' })}
                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${paymentFormData.adjustment_type === 'discount' ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Descuento (-)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentFormData({ ...paymentFormData, adjustment_type: paymentFormData.adjustment_type === 'extra' ? 'none' : 'extra' })}
                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${paymentFormData.adjustment_type === 'extra' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Extra (+)
                                    </button>
                                </div>
                                {paymentFormData.adjustment_type !== 'none' && (
                                    <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="col-span-1">
                                            <label className="block text-xs text-slate-500 mb-1 font-medium">Monto ($)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-company-blue outline-none"
                                                value={paymentFormData.adjustment_amount || ''}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, adjustment_amount: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-slate-500 mb-1 font-medium">Motivo (Opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-company-blue outline-none"
                                                value={paymentFormData.adjustment_reason}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, adjustment_reason: e.target.value })}
                                                placeholder="Ej. Promoción, domicilio..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PRODUCTOS */}
                            <div className="border rounded-lg p-3 space-y-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Añadir Productos</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                                        onChange={(e) => {
                                            const prod = products.find(p => p.id === e.target.value);
                                            if (prod) {
                                                const existing = paymentFormData.selectedProducts.find(p => p.id === prod.id);
                                                if (existing) {
                                                    setPaymentFormData({
                                                        ...paymentFormData,
                                                        selectedProducts: paymentFormData.selectedProducts.map(p =>
                                                            p.id === prod.id ? { ...p, quantity: p.quantity + 1 } : p
                                                        )
                                                    });
                                                } else {
                                                    setPaymentFormData({
                                                        ...paymentFormData,
                                                        selectedProducts: [...paymentFormData.selectedProducts, { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }]
                                                    });
                                                }
                                                e.target.value = '';
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">Seleccionar producto...</option>
                                        {products.filter(p => p.stock > 0).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                                        ))}
                                    </select>
                                </div>

                                {paymentFormData.selectedProducts.length > 0 && (
                                    <div className="space-y-2 max-h-32 overflow-y-auto pt-2 border-t border-slate-100">
                                        {paymentFormData.selectedProducts.map((p, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentFormData({
                                                            ...paymentFormData,
                                                            selectedProducts: paymentFormData.selectedProducts.filter((_, i) => i !== idx)
                                                        })}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-slate-700">{p.name} (x{p.quantity})</span>
                                                </div>
                                                <span className="font-medium text-slate-900">${(p.price * p.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* TOTAL */}
                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Monto Total a Pagar ($)</label>
                                <div className="w-full bg-slate-900 border border-slate-200 rounded-lg p-3 text-2xl font-black text-white flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-400">Total:</span>
                                    <span>
                                        ${(
                                            Math.max(0, (Number(paymentFormData.amount) || 0) +
                                                (paymentFormData.adjustment_type === 'extra' ? (Number(paymentFormData.adjustment_amount) || 0) : paymentFormData.adjustment_type === 'discount' ? -(Number(paymentFormData.adjustment_amount) || 0) : 0)) +
                                            paymentFormData.selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
                                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* MÉTODO DE PAGO */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Método de Pago *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['cash', 'transfer', 'card'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => {
                                                setPaymentFormData({ ...paymentFormData, payment_method: method });
                                                if (method !== 'cash') setCashReceived(0);
                                            }}
                                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${paymentFormData.payment_method === method
                                                ? 'bg-company-blue border-company-blue text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-company-blue'
                                                }`}
                                        >
                                            {method === 'cash' ? '💵 Efectivo' : method === 'transfer' ? '🏦 Transf.' : '💳 Tarjeta'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CALCULADORA DE CAMBIO (solo efectivo) */}
                            {paymentFormData.payment_method === 'cash' && (() => {
                                const modalTotal = Math.max(0,
                                    (Number(paymentFormData.amount) || 0) +
                                    (paymentFormData.adjustment_type === 'extra' ? (Number(paymentFormData.adjustment_amount) || 0)
                                        : paymentFormData.adjustment_type === 'discount' ? -(Number(paymentFormData.adjustment_amount) || 0) : 0) +
                                    paymentFormData.selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0)
                                );
                                const change = cashReceived - modalTotal;
                                return (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                        <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                            💵 Calculadora de Cambio
                                        </p>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium">Efectivo Recibido ($)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={cashReceived || ''}
                                                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-1 bg-white"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(['Exacto', 10, 20, 50, 100] as const).map((denom) => (
                                                <button
                                                    key={denom}
                                                    type="button"
                                                    onClick={() => setCashReceived(denom === 'Exacto' ? modalTotal : Number(denom))}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                                                >
                                                    {typeof denom === 'string' ? denom : `$${denom}`}
                                                </button>
                                            ))}
                                        </div>
                                        {cashReceived > 0 && (
                                            <div className={`flex items-center justify-between p-2.5 rounded-lg font-bold text-sm ${change >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                                <span>{change >= 0 ? '✅ Cambio a devolver:' : '⚠️ Falta:'}</span>
                                                <span className="text-base">${Math.abs(change).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* NOTAS COLAPSABLES */}
                            <div>
                                {!isNotesOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsNotesOpen(true)}
                                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                                    >
                                        <span className="text-base leading-none">+</span>
                                        Añadir nota u observación
                                    </button>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Notas (Opcional)</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-company-blue resize-none"
                                            rows={2}
                                            placeholder="Ej: Pago parcial, descuento aplicado..."
                                            value={paymentFormData.notes}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ACCIONES */}
                            <div className="flex gap-3 pt-4 border-t font-semibold">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3 bg-company-green text-white rounded-lg hover:bg-green-600 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? 'Procesando...' : '✓ Registrar Pago y Finalizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}