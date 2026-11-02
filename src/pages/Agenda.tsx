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
    isValid,
    isSameMonth,
    isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Appointment, Sede, Patient, Service, PaymentMethod, Product } from '../types';
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
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
    const [availableProfessionals, setAvailableProfessionals] = useState<{ id: string; name: string }[]>([]);
    const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
    const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState(false);
    const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {}, 60000);
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

    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    const [slotInterval] = useState<15 | 30 | 60>(30);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [appointmentToPay, setAppointmentToPay] = useState<Appointment | null>(null);
    
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
    const [isProductsOpen, setIsProductsOpen] = useState(false);
    const [isChangeCalcOpen, setIsChangeCalcOpen] = useState(false);
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
        if (!confirm('¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer.')) return;

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
                setIsAdjustmentOpen(false);
                setIsProductsOpen(false);
                setIsChangeCalcOpen(false);
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

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointmentToPay) return;

        setSaving(true);
        try {
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

            if (finalServiceAmount < 0) finalServiceAmount = 0;

            let finalNotes = paymentFormData.notes || `Cita Completada: ${appointmentToPay.patientName}`;
            if (paymentFormData.adjustment_type !== 'none' && adjustmentAmt > 0) {
                finalNotes += `\n[Ajuste Aplicado${adjustmentDetails}]`;
                if (paymentFormData.adjustment_reason) {
                    finalNotes += ` Motivo: ${paymentFormData.adjustment_reason}`;
                }
            }

            const createdSale = await api.createSale({
                appointment_id: appointmentToPay.id,
                patient_id: appointmentToPay.patientId,
                sede: appointmentToPay.sede,
                custom_date: appointmentToPay.date,
                items: paymentFormData.selectedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.quantity,
                    unit_price: p.price
                })),
                service_amount: finalServiceAmount,
                payment_method: paymentFormData.payment_method,
                notes: finalNotes
            });

            try {
                await api.updateAppointment(appointmentToPay.id, { status: 'completed' });
            } catch (appointmentError: any) {
                if (createdSale?.id) {
                    try { await api.cancelSale(createdSale.id, 'Rollback: Fallo al actualizar cita'); } catch {}
                }
                throw new Error(`No se pudo completar la cita. La venta fue revertida.`);
            }

            setIsPaymentModalOpen(false);
            setIsDetailsModalOpen(false);
            setAppointmentToPay(null);
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
                if (format(aptStart, 'yyyy-MM-dd') !== cellDateStr) return false;

                const service = services.find(s => s.id === apt.serviceId);
                const duration = Number(service?.duration) || 60;
                const aptEnd = new Date(aptStart.getTime() + duration * 60000);
                return (aptStart < cellEnd) && (aptEnd > cellStart);
            } catch {
                return false;
            }
        });
    };

    const getServiceBackground = (serviceName: string | undefined) => {
        if (!serviceName) return 'bg-slate-50 hover:bg-slate-100 text-slate-800';
        const name = serviceName.toLowerCase();
        if (name.includes('consulta')) return 'bg-sky-50 text-sky-950';
        if (name.includes('uña') || name.includes('corte')) return 'bg-emerald-50 text-emerald-950';
        if (name.includes('hongo')) return 'bg-amber-50 text-amber-950';
        return 'bg-blue-50 text-blue-950';
    };

    const getStatusBorder = (status: string) => {
        switch (status) {
            case 'completed': return 'border-l-emerald-500';
            case 'cancelled': return 'border-l-slate-400';
            default: return 'border-l-amber-500';
        }
    };

    const getDaysToShow = () => {
        if (view === 'day') return [currentDate];
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

            {(isMiniCalendarOpen || isIntervalMenuOpen || isOverflowMenuOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-black/10"
                    onClick={() => {
                        setIsMiniCalendarOpen(false);
                        setIsIntervalMenuOpen(false);
                        setIsOverflowMenuOpen(false);
                    }}
                />
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs px-3.5 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 relative z-40">
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
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
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
                                className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"
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
                                className="p-1 hover:bg-white rounded-md text-slate-600 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <span className="font-bold text-sm text-slate-800 capitalize select-none ml-1.5 whitespace-nowrap">
                            {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : "MMMM yyyy", { locale: es })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5">
                        {user?.role === 'admin' && (
                            <button
                                type="button"
                                onClick={() => setSelectedSede('all')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                    selectedSede === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Todas
                            </button>
                        )}
                        {(user?.role === 'admin' ? ['norte', 'sur'] : user?.sedes_permitidas || []).map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    setSelectedSede(s as Sede);
                                    setFormData(prev => ({ ...prev, sede: s as Sede }));
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                                    selectedSede === s ? 'bg-blue-500 text-white shadow-xs font-bold' : 'text-slate-600'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {(user?.role === 'admin' || availableProfessionals.length > 1) && (
                        <div className="relative">
                            <select
                                value={selectedProfessional}
                                onChange={(e) => setSelectedProfessional(e.target.value)}
                                className="pl-7 pr-3 py-1 bg-slate-100 border-0 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer appearance-none h-8"
                            >
                                <option value="all">👨‍⚕️ Todos</option>
                                {availableProfessionals.map(p => (
                                    <option key={p.id} value={p.id}>Dr(a). {p.name}</option>
                                ))}
                            </select>
                            <User className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    )}

                    <div className="flex bg-slate-100 p-0.5 rounded-xl">
                        {(['day', 'week', 'month'] as const).map((viewOption) => (
                            <button
                                key={viewOption}
                                type="button"
                                onClick={() => setView(viewOption)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                    view === viewOption ? 'bg-white shadow-xs text-company-blue' : 'text-slate-500'
                                }`}
                            >
                                {viewOption === 'day' ? 'Día' : viewOption === 'week' ? 'Sem' : 'Mes'}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Cita</span>
                    </button>
                </div>
            </div>

            <div className={`flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-xs transition-opacity duration-150 ${isNavigating ? 'opacity-60' : 'opacity-100'}`}>
                {view === 'month' ? (
                    <div className="min-w-[800px] h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b bg-slate-50">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                                <div key={day} className="p-2 text-center text-sm font-semibold text-slate-600 border-r last:border-r-0">{day}</div>
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
                                    } catch { return false; }
                                });
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`min-h-[100px] p-2 hover:bg-slate-50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                        onClick={() => { setCurrentDate(day); setView('day'); }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-company-blue text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayAppointments.length > 0 && (
                                                <span className="text-xs font-bold text-company-blue bg-blue-100 px-1.5 rounded-full">{dayAppointments.length}</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                            {dayAppointments.slice(0, 3).map(apt => (
                                                <div key={apt.id} className={`text-[10px] truncate px-1 py-0.5 rounded border-l-2 ${getStatusBorder(apt.status)} ${getServiceBackground(apt.serviceName)} flex items-center justify-between gap-1`}>
                                                    <span className="font-semibold truncate">{apt.date ? format(parseISO(apt.date), 'HH:mm') : '--:--'} {apt.patientName}</span>
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
                                    <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-company-blue' : 'text-slate-800'}`}>{format(day, 'd')}</p>
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

                                        return (
                                            <div key={day.toString()} className={`p-0 border-r h-24 relative transition-all ${appointmentsInSlot.length === 0 ? 'hover:bg-blue-50/50 cursor-pointer' : ''}`}>
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
                                                                onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appointment); setIsDetailsModalOpen(true); }}
                                                                style={{ height: `${height}px`, top: `${topOffset}px`, zIndex: 20 }}
                                                                className={`absolute left-1 right-1 rounded-lg p-1.5 text-xs overflow-hidden cursor-pointer shadow-xs border border-slate-200 border-l-4 ${getStatusBorder(appointment.status)} ${getServiceBackground(appointment.serviceName)} flex flex-col justify-between`}
                                                            >
                                                                <div>
                                                                    <div className="flex justify-between items-start gap-1">
                                                                        <p className="font-bold text-slate-900 truncate text-[11px] leading-tight">{appointment.patientName}</p>
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${appointment.sede === 'norte' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                                                    </div>
                                                                    <p className="truncate text-slate-600 text-[10px] mt-0.5 font-medium leading-tight">{appointment.serviceName}</p>
                                                                </div>

                                                                <div className="mt-1 flex items-center justify-between gap-1 pt-0.5 border-t border-black/5">
                                                                    <span className="text-[10px] font-semibold text-slate-600">{format(aptStart, 'HH:mm')} ({duration}')</span>
                                                                    {appointment.status === 'completed' ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white shrink-0">✓ PAGADO</span>
                                                                    ) : appointment.status === 'cancelled' ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-400 text-white shrink-0 line-through">✕ CANCELADA</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shrink-0">⏳ FALTA PAGO</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })}
                                                {appointmentsInSlot.length === 0 && (
                                                    <div
                                                        className="w-full h-full flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity"
                                                        onClick={() => { setSelectedAppointment(null); setFormData({ ...formData, date: format(day, 'yyyy-MM-dd'), time: format(hour, 'HH:mm') }); setIsModalOpen(true); }}
                                                    >
                                                        <Plus className="w-8 h-8 text-company-blue bg-blue-100 rounded-full p-1.5 shadow-sm" />
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{selectedAppointment ? 'Editar Cita' : 'Nueva Cita'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setSelectedAppointment(null); resetForm(); }} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={selectedAppointment ? handleUpdateAppointment : handleSubmit} className="space-y-4">
                            <div className="relative" ref={searchRef}>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Paciente *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        placeholder="Buscar..."
                                        value={patientSearchTerm}
                                        onChange={(e) => { setPatientSearchTerm(e.target.value); setShowPatientSuggestions(true); if (formData.patientId) setFormData({ ...formData, patientId: '' }); }}
                                    />
                                </div>
                                {showPatientSuggestions && filteredPatients.length > 0 && (
                                    <ul className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {filteredPatients.map(p => (
                                            <li key={p.id} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0" onClick={() => handleSelectPatient(p)}>
                                                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.cedula}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Servicio *</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none"
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                >
                                    <option value="">Seleccionar servicio</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${s.price} ({s.duration} min)</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                {(user?.role === 'admin' ? (['norte', 'sur'] as const) : user?.sedes_permitidas || []).map(s => (
                                    <label key={s} className="flex items-center cursor-pointer">
                                        <input type="radio" value={s} checked={formData.sede === s} onChange={(e) => setFormData({ ...formData, sede: e.target.value as Sede })} className="mr-2" />
                                        <span className="capitalize">{s}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" required className="bg-slate-50 border p-2 rounded-lg" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                <input type="text" required className="bg-slate-50 border p-2 rounded-lg" placeholder="10:00" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-company-blue text-white rounded-lg">{saving ? 'Guardando...' : 'Guardar'}</button>
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
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                                            selectedAppointment.status === 'scheduled' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        }`}
                                    >
                                        Programada
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment?.id || '', 'completed')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                                            selectedAppointment.status === 'completed' ? 'bg-green-600 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                    >
                                        {selectedAppointment.status === 'completed' ? 'Atendida ✓' : 'Completar'}
                                    </button>
                                    <button
                                        onClick={() => handleChangeStatus(selectedAppointment?.id || '', 'cancelled')}
                                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                                            selectedAppointment.status === 'cancelled' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                        }`}
                                    >
                                        Cancelada
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button onClick={() => openEditModal(selectedAppointment)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">
                                    <Edit className="w-4 h-4" />
                                    Editar Cita
                                </button>
                                {(user?.role === 'admin' || user?.id === selectedAppointment.professionalId) && (
                                    <button onClick={() => handleDeleteAppointment(selectedAppointment.id, selectedAppointment)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white font-medium border border-red-100">
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                )}
                            </div>

                            <button onClick={() => navigate(`/pacientes/${selectedAppointment.patientId}`)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white font-bold border border-blue-100">
                                <FileText className="w-4 h-4" />
                                Ver Expediente Clínico Completo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE PAGO */}
            {isPaymentModalOpen && appointmentToPay && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-3">
                    <div className="bg-white rounded-xl w-full max-w-sm p-4 shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-y-auto text-xs">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b">
                            <h2 className="text-base font-bold text-slate-800">Registrar Pago</h2>
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePayment} className="space-y-2.5">
                            <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Servicio: <span className="font-bold text-slate-800">{appointmentToPay.serviceName}</span></span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-500 font-medium">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-16 px-1.5 py-0.5 text-right border border-slate-300 rounded outline-none font-bold text-slate-800 bg-white"
                                            value={paymentFormData.amount}
                                            onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <p className="text-slate-500 text-[11px]">Paciente: <span className="font-bold text-slate-800">{appointmentToPay.patientName}</span></p>
                            </div>

                            <div className="border border-slate-200 rounded-lg p-2 bg-white">
                                {!isAdjustmentOpen && paymentFormData.adjustment_type === 'none' ? (
                                    <button type="button" onClick={() => setIsAdjustmentOpen(true)} className="w-full text-left text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between">
                                        <span>+ Ajuste manual (Descuento / Extra)</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Ajuste al Servicio</label>
                                            <button type="button" onClick={() => { setIsAdjustmentOpen(false); setPaymentFormData({ ...paymentFormData, adjustment_type: 'none', adjustment_amount: 0, adjustment_reason: '' }); }} className="text-[10px] text-slate-400">Cerrar</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setPaymentFormData({ ...paymentFormData, adjustment_type: paymentFormData.adjustment_type === 'discount' ? 'none' : 'discount' })} className={`flex-1 py-1 px-2 rounded text-xs font-bold border ${paymentFormData.adjustment_type === 'discount' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600'}`}>Descuento (-)</button>
                                            <button type="button" onClick={() => setPaymentFormData({ ...paymentFormData, adjustment_type: paymentFormData.adjustment_type === 'extra' ? 'none' : 'extra' })} className={`flex-1 py-1 px-2 rounded text-xs font-bold border ${paymentFormData.adjustment_type === 'extra' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600'}`}>Extra (+)</button>
                                        </div>
                                        {paymentFormData.adjustment_type !== 'none' && (
                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                <input type="number" min="0" step="0.01" className="col-span-1 px-2 py-1 border rounded text-xs outline-none" value={paymentFormData.adjustment_amount || ''} onChange={(e) => setPaymentFormData({ ...paymentFormData, adjustment_amount: parseFloat(e.target.value) || 0 })} placeholder="Monto" />
                                                <input type="text" className="col-span-2 px-2 py-1 border rounded text-xs outline-none" value={paymentFormData.adjustment_reason} onChange={(e) => setPaymentFormData({ ...paymentFormData, adjustment_reason: e.target.value })} placeholder="Motivo..." />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="border border-slate-200 rounded-lg p-2 bg-white">
                                {!isProductsOpen && paymentFormData.selectedProducts.length === 0 ? (
                                    <button type="button" onClick={() => setIsProductsOpen(true)} className="w-full text-left text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between">
                                        <span>+ Añadir productos complementarios</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Productos</label>
                                            <button type="button" onClick={() => setIsProductsOpen(false)} className="text-[10px] text-slate-400">Ocultar</button>
                                        </div>
                                        <select
                                            className="w-full bg-slate-50 border rounded p-1.5 text-xs outline-none"
                                            onChange={(e) => {
                                                const prod = products.find(p => p.id === e.target.value);
                                                if (prod) {
                                                    const existing = paymentFormData.selectedProducts.find(p => p.id === prod.id);
                                                    if (existing) {
                                                        setPaymentFormData({ ...paymentFormData, selectedProducts: paymentFormData.selectedProducts.map(p => p.id === prod.id ? { ...p, quantity: p.quantity + 1 } : p) });
                                                    } else {
                                                        setPaymentFormData({ ...paymentFormData, selectedProducts: [...paymentFormData.selectedProducts, { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }] });
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="">Seleccionar producto...</option>
                                            {products.filter(p => p.stock > 0).map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                                        </select>
                                        {paymentFormData.selectedProducts.length > 0 && (
                                            <div className="space-y-1 max-h-20 overflow-y-auto pt-1 border-t">
                                                {paymentFormData.selectedProducts.map((p, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => setPaymentFormData({ ...paymentFormData, selectedProducts: paymentFormData.selectedProducts.filter((_, i) => i !== idx) })} className="text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                                                            <span className="text-slate-700 truncate max-w-[150px]">{p.name} (x{p.quantity})</span>
                                                        </div>
                                                        <span className="font-semibold">${(p.price * p.quantity).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 text-white rounded-lg p-2.5 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-300">Total a Pagar:</span>
                                <span className="text-xl font-black tracking-tight">
                                    ${(
                                        Math.max(0, (Number(paymentFormData.amount) || 0) +
                                            (paymentFormData.adjustment_type === 'extra' ? (Number(paymentFormData.adjustment_amount) || 0) : paymentFormData.adjustment_type === 'discount' ? -(Number(paymentFormData.adjustment_amount) || 0) : 0)) +
                                        paymentFormData.selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
                                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Método de Pago *</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['cash', 'transfer', 'card'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => { setPaymentFormData({ ...paymentFormData, payment_method: method }); if (method !== 'cash') setCashReceived(0); }}
                                            className={`py-1.5 px-1 rounded-lg border text-xs font-bold transition-all ${paymentFormData.payment_method === method ? 'bg-company-blue border-company-blue text-white' : 'bg-white text-slate-600'}`}
                                        >
                                            {method === 'cash' ? '💵 Efectivo' : method === 'transfer' ? '🏦 Transf.' : '💳 Tarjeta'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {paymentFormData.payment_method === 'cash' && (() => {
                                const modalTotal = Math.max(0,
                                    (Number(paymentFormData.amount) || 0) +
                                    (paymentFormData.adjustment_type === 'extra' ? (Number(paymentFormData.adjustment_amount) || 0) : paymentFormData.adjustment_type === 'discount' ? -(Number(paymentFormData.adjustment_amount) || 0) : 0) +
                                    paymentFormData.selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0)
                                );
                                const change = cashReceived - modalTotal;

                                return (
                                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-2">
                                        {!isChangeCalcOpen && cashReceived === 0 ? (
                                            <button type="button" onClick={() => setIsChangeCalcOpen(true)} className="w-full text-left text-[11px] font-bold text-blue-700 flex items-center justify-between">
                                                <span>💵 Calcular cambio / vuelto</span>
                                            </button>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[11px] font-bold text-blue-800">
                                                    <span>Calculadora de Cambio</span>
                                                    <button type="button" onClick={() => { setIsChangeCalcOpen(false); setCashReceived(0); }} className="text-[10px] text-slate-400">Cerrar</button>
                                                </div>
                                                <input type="number" min="0" step="0.01" value={cashReceived || ''} onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1 text-xs bg-white outline-none" placeholder="Efectivo recibido..." />
                                                <div className="flex flex-wrap gap-1">
                                                    {(['Exacto', 10, 20, 50, 100] as const).map((denom) => (
                                                        <button key={denom} type="button" onClick={() => setCashReceived(denom === 'Exacto' ? modalTotal : Number(denom))} className="px-2 py-0.5 bg-white border rounded text-[10px] font-semibold text-slate-700">
                                                            {typeof denom === 'string' ? denom : `$${denom}`}
                                                        </button>
                                                    ))}
                                                </div>
                                                {cashReceived > 0 && (
                                                    <div className={`flex items-center justify-between p-1.5 rounded font-bold text-xs ${change >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                                                        <span>{change >= 0 ? '✓ Cambio:' : '⚠️ Falta:'}</span>
                                                        <span>${Math.abs(change).toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div>
                                {!isNotesOpen ? (
                                    <button type="button" onClick={() => setIsNotesOpen(true)} className="text-[11px] text-slate-400 hover:text-slate-700 block">+ Añadir nota u observación</button>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-bold text-slate-700">Notas</label>
                                            <button type="button" onClick={() => { setIsNotesOpen(false); setPaymentFormData({ ...paymentFormData, notes: '' }); }} className="text-[10px] text-slate-400">Cerrar</button>
                                        </div>
                                        <textarea className="w-full bg-slate-50 border rounded p-2 text-xs outline-none resize-none" rows={2} placeholder="Observación..." value={paymentFormData.notes} onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })} autoFocus />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t font-semibold">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-xs">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-2 bg-company-green text-white rounded-lg hover:bg-green-600 font-bold text-xs flex items-center justify-center gap-1 shadow-sm">
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