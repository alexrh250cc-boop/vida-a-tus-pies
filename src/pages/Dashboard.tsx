import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Appointment, Patient, Service } from '../types';
import {
    Users, Calendar, DollarSign, TrendingUp,
    Clock, Activity,
    ChevronRight, UserPlus, CalendarPlus,
    AlertCircle, Phone, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSede, setSelectedSede] = useState<string>('all');
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pts, apts, svs] = await Promise.all([
                api.getPatients(),
                api.getAppointments(),
                api.getServices()
            ]);
            setPatients(pts);
            setAppointments(apts);
            setServices(svs);

            // Últimos 5 pacientes registrados
            setRecentPatients(pts.slice(0, 5));
        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date.startsWith(today));

    // Datos para el gráfico (últimos 7 días)
    const getChartData = () => {
        const data = [];
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = days[d.getDay()];

            const count = appointments.filter(a => a.date.startsWith(dateStr)).length;

            data.push({
                name: dayName,
                citas: count
            });
        }
        return data;
    };

    const chartData = getChartData();

    // Estadísticas por estado


    // Ingresos del mes
    const monthlyIncome = appointments
        .filter(a => a.status === 'completed' && new Date(a.date).getMonth() === new Date().getMonth())
        .reduce((total, apt) => {
            const service = services.find(s => s.id === apt.serviceId);
            return total + (service?.price || 0);
        }, 0);

    const stats = [
        {
            name: 'Pacientes Totales',
            value: patients.length,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            shadow: 'shadow-blue-100',
            change: '+5%',
            link: '/pacientes'
        },
        {
            name: 'Citas Hoy',
            value: todayAppointments.length,
            icon: Calendar,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-100',
            shadow: 'shadow-green-100',
            change: todayAppointments.length > 0 ? `${todayAppointments.length} pendientes` : 'Sin citas',
            link: '/agenda'
        },
        {
            name: 'Ingresos Mes',
            value: `$${monthlyIncome.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-100',
            shadow: 'shadow-yellow-100',
            change: monthlyIncome > 0 ? '+$' + monthlyIncome.toFixed(2) : '$0',
            link: '/reportes'
        },
        {
            name: 'Servicios Activos',
            value: services.length,
            icon: Activity,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            shadow: 'shadow-purple-100',
            change: services.length > 0 ? `${services.length} disponibles` : 'Sin servicios',
            link: '/servicios'
        },
    ];



    const getStatusText = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Programada';
            case 'completed': return 'Completada';
            case 'cancelled': return 'Cancelada';
            default: return status;
        }
    };

    // Helper para colores de avatar
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-company-blue mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con bienvenida personalizada */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        ¡Hola, {user?.name}! 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {new Date().toLocaleDateString('es-EC', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/agenda')}
                        className="bg-company-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2 transition-colors"
                    >
                        <CalendarPlus className="w-4 h-4" />
                        Nueva Cita
                    </button>
                    <button
                        onClick={() => navigate('/pacientes')}
                        className="bg-company-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nuevo Paciente
                    </button>
                </div>
            </div>

            {/* Filtro rápido de sede (solo para admin) */}
            {user?.role === 'admin' && (
                <div className="flex gap-2">
                    <select
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                        <option value="all">Todas las sedes</option>
                        <option value="norte">Sede Norte</option>
                        <option value="sur">Sede Sur</option>
                    </select>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div
                        key={item.name}
                        onClick={() => navigate(item.link)}
                        className={`relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border ${item.border} hover:shadow-md hover:${item.shadow} transition-all duration-300 cursor-pointer group`}
                    >
                        <dt>
                            <div className={`absolute rounded-2xl p-3 ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-slate-500">{item.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{item.change}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-company-blue transition-colors" />
                        </dd>
                    </div>
                ))}
            </div>

            {/* Estadísticas de citas y Gráfico */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-company-blue" />
                        Citas de la semana
                    </h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="citas" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.citas > 0 ? '#3b82f6' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Próximas Citas */}
                <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-company-blue" />
                            Próximas Citas
                        </h2>
                        <button
                            onClick={() => navigate('/agenda')}
                            className="text-sm text-company-blue hover:underline flex items-center gap-1"
                        >
                            Ver todas
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {todayAppointments.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No hay citas programadas para hoy</p>
                            <button
                                onClick={() => navigate('/agenda')}
                                className="mt-3 text-company-blue hover:underline text-sm"
                            >
                                Agendar nueva cita
                            </button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {todayAppointments.slice(0, 5).map((apt) => (
                                <li key={apt.id} className="py-3 hover:bg-slate-50 px-3 rounded-lg transition-colors cursor-pointer" onClick={() => navigate('/agenda')}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(apt.patientName)}`}>
                                                {apt.patientName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{apt.patientName}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" />
                                                    {patients.find(p => p.id === apt.patientId)?.phone || 'Sin teléfono'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-2 mb-1">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                apt.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {getStatusText(apt.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pl-12">
                                        <p className="text-xs text-slate-500">
                                            {apt.serviceName} · Dr. {apt.professionalName}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Últimos pacientes registrados y acciones rápidas */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Últimos pacientes */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-company-blue" />
                            Últimos Pacientes
                        </h2>
                        <button
                            onClick={() => navigate('/pacientes')}
                            className="text-sm text-company-blue hover:underline flex items-center gap-1"
                        >
                            Ver todos
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <ul className="divide-y divide-slate-100">
                        {recentPatients.map((patient) => (
                            <li key={patient.id} className="py-3 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(patient.name)}`}>
                                            {patient.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {patient.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/pacientes/${patient.id}`)}
                                        className="text-xs text-company-blue hover:underline"
                                    >
                                        Ver ficha
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Acciones rápidas y tips */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-company-blue" />
                        Acciones Rápidas
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/agenda')}
                            className="p-4 border rounded-lg hover:bg-slate-50 text-left transition-colors group"
                        >
                            <CalendarPlus className="w-6 h-6 text-company-blue mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium block">Nueva Cita</span>
                            <span className="text-xs text-slate-400 mt-1">Agenda una consulta</span>
                        </button>
                        <button
                            onClick={() => navigate('/pacientes')}
                            className="p-4 border rounded-lg hover:bg-slate-50 text-left transition-colors group"
                        >
                            <UserPlus className="w-6 h-6 text-company-green mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium block">Nuevo Paciente</span>
                            <span className="text-xs text-slate-400 mt-1">Registra un paciente</span>
                        </button>
                        <button
                            onClick={() => navigate('/servicios')}
                            className="p-4 border rounded-lg hover:bg-slate-50 text-left transition-colors group"
                        >
                            <Activity className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium block">Servicios</span>
                            <span className="text-xs text-slate-400 mt-1">Administra servicios</span>
                        </button>
                        <button
                            onClick={() => navigate('/reportes')}
                            className="p-4 border rounded-lg hover:bg-slate-50 text-left transition-colors group"
                        >
                            <TrendingUp className="w-6 h-6 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium block">Reportes</span>
                            <span className="text-xs text-slate-400 mt-1">Estadísticas</span>
                        </button>
                    </div>

                    {/* Tips rápidos */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Recordatorio
                        </h3>
                        <p className="text-xs text-blue-600">
                            {todayAppointments.length === 0
                                ? "No tienes citas programadas para hoy. ¿Quieres agendar alguna?"
                                : `Tienes ${todayAppointments.length} cita${todayAppointments.length > 1 ? 's' : ''} programada${todayAppointments.length > 1 ? 's' : ''} para hoy.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}