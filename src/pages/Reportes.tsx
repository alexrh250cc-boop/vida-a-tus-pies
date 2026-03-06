import { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, Users, Calendar, CheckCircle2, TrendingUp,
    PieChart as PieChartIcon, User, DollarSign,
    AlertCircle, RefreshCw, Download, Pill, ShoppingBag, Package,
    Sparkles, Activity, Clock, ArrowUpRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import {
    ReportKPIs, AppointmentsByDay, ServiceRanking,
    ProfessionalStats, IncomeSummary, Appointment,
    SaleWithItems, ProductReportData
} from '../types';
import { exportReportToPDF, exportToExcel } from '../lib/exportUtils';
import { KPICard, KPICardSkeleton } from '../components/ui/KPICard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type DateRangeType = 'today' | 'week' | 'month' | 'custom';
type TabType = 'ventas' | 'citas' | 'productos';

// ── Mensajes amigables según contexto ─────────────────────────────────────
const EMPTY_MESSAGES = {
    ventas: [
        "✨ No hay ventas en este período. ¿Un día tranquilo?",
        "🦶 Sin registros de ventas. ¡La caja está esperando!",
        "📦 Período sin ventas. ¿Probamos mañana?",
        "💤 Este período está en blanco. ¿Listo para facturar?",
        "🌟 Silencio en caja. ¿Primera venta del mes?"
    ],
    citas: [
        "📅 Agenda vacía en este período.",
        "☀️ Sin citas programadas. ¿Día libre?",
        "⏰ Horario despejado. ¿Aprovechas para organizar?",
        "📋 No hay pacientes en este rango de fechas.",
        "🕊️ Calma total. Disfruta mientras dure."
    ],
    productos: [
        "📦 Inventario sin movimiento en este período.",
        "🏷️ No se vendieron productos. ¿Ofertas nuevas?",
        "💊 Sin medicamentos vendidos. Stock completo.",
        "📊 Rotación cero en este período.",
        "🛒 Carrito vacío. ¡A impulsar ventas!"
    ]
};

const getRandomMessage = (type: 'ventas' | 'citas' | 'productos'): string => {
    const messages = EMPTY_MESSAGES[type];
    return messages[Math.floor(Math.random() * messages.length)];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const EmptyState = ({ message, type }: { message: string; type?: 'ventas' | 'citas' | 'productos' }) => {
    const emoji = type === 'ventas' ? '🛒' : type === 'citas' ? '📅' : '📦';
    
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full gap-3 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                <AlertCircle className="w-7 h-7 text-slate-400 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-sm text-slate-400 font-medium max-w-[220px]">
                {emoji} {message}
            </p>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-sm min-w-[150px] animate-in fade-in duration-200">
            <p className="font-semibold text-slate-500 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-slate-600">{p.name}:</span>
                    <span className="font-bold text-slate-800">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function Reportes() {
    const [rangeType, setRangeType] = useState<DateRangeType>('month');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState<TabType>('ventas');
    const [loading, setLoading] = useState(true);

    const [kpis, setKpis] = useState<ReportKPIs | null>(null);
    const [appointmentsByDay, setAppointmentsByDay] = useState<AppointmentsByDay[]>([]);
    const [serviceRanking, setServiceRanking] = useState<ServiceRanking[]>([]);
    const [professionalStats, setProfessionalStats] = useState<ProfessionalStats[]>([]);
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary[]>([]);
    const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
    const [sales, setSales] = useState<SaleWithItems[]>([]);
    const [productReport, setProductReport] = useState<ProductReportData[]>([]);

    const [salesCategoryFilter, setSalesCategoryFilter] = useState<string>('all');
    const [salesTypeFilter, setSalesTypeFilter] = useState<string>('all');

    useEffect(() => { handleRangeChange(rangeType); }, [rangeType]);
    useEffect(() => { fetchData(); }, [startDate, endDate]);

    const handleRangeChange = (type: DateRangeType) => {
        const today = new Date();
        if (type === 'today') {
            const d = format(today, 'yyyy-MM-dd');
            setStartDate(d); setEndDate(d);
        } else if (type === 'week') {
            setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        } else if (type === 'month') {
            setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        }
        setRangeType(type);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const startStr = `${startDate}T00:00:00`;
            const endStr = `${endDate}T23:59:59`;

            const [kpiData, dayData, rankingData, profData, incomeData, allApts, allSales, prodStats] =
                await Promise.all([
                    api.getReportKPIs(startStr, endStr),
                    api.getAppointmentsByDay(startStr, endStr),
                    api.getServicesRanking(startStr, endStr),
                    api.getAppointmentsByProfessional(startStr, endStr),
                    api.getIncomeSummary(startStr, endStr),
                    api.getAppointments(),
                    api.getSales(),
                    api.getProductReportData(startDate, endDate),
                ]);

            setKpis(kpiData);
            setAppointmentsByDay(dayData);
            setServiceRanking(rankingData);
            setProfessionalStats(profData);
            setIncomeSummary(incomeData);

            // ✅ CORREGIDO: Eliminé el límite de 10 para mostrar TODAS las citas del período
            const filteredApts = allApts
                .filter(a => { 
                    const d = a.date.split('T')[0]; 
                    return d >= startDate && d <= endDate; 
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRecentAppointments(filteredApts);

            const filteredSales = allSales.filter(s => {
                const d = s.date.split('T')[0];
                return d >= startDate && d <= endDate;
            });
            setSales(filteredSales);
            setProductReport(prodStats);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            const data = await api.getReportSummaryForExport(startDate, endDate);
            exportReportToPDF(data);
        } catch { alert('Error al generar el reporte PDF'); }
    };

    const salesReportItems = useMemo(() => {
        let items: any[] = [];
        sales.forEach(sale => {
            // ✅ FILTRO: Ignorar ventas canceladas
            if (sale.status === 'cancelled') return;
            
            const isAppointment = !!sale.appointment_id;
            const saleType = isAppointment ? 'Cita' : 'Directa';
            if (salesTypeFilter !== 'all') {
                if (salesTypeFilter === 'appointment' && !isAppointment) return;
                if (salesTypeFilter === 'direct' && isAppointment) return;
            }
            sale.items?.forEach(item => {
                const category = item.category || 'General';
                const isMedication = category.toLowerCase().includes('medicamento');
                if (salesCategoryFilter !== 'all') {
                    if (salesCategoryFilter === 'medications' && !isMedication) return;
                    if (salesCategoryFilter === 'services' && isMedication) return;
                }
                items.push({
                    id: item.id, date: sale.date, productName: item.product_name,
                    quantity: item.quantity, category, isMedication,
                    unitPrice: item.unit_price,
                    total: item.unit_price * item.quantity,
                    saleType, patientName: sale.patient_name,
                });
            });
            const itemsTotal = sale.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) || 0;
            const serviceAmount = sale.total - itemsTotal;
            if (serviceAmount > 1 && (salesCategoryFilter === 'all' || salesCategoryFilter === 'services')) {
                items.push({
                    id: `svc-${sale.id}`, date: sale.date,
                    productName: 'Servicio Podológico (Cita)',
                    quantity: 1, category: 'Cita', isMedication: false,
                    unitPrice: serviceAmount, total: serviceAmount,
                    saleType, patientName: sale.patient_name,
                });
            }
        });
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, salesCategoryFilter, salesTypeFilter]);

    // ✅ CORREGIDO: Retorna 0 si no hay items
    const salesTotals = useMemo(() => {
        let general = 0, medications = 0, others = 0;
        if (salesReportItems.length > 0) {
            salesReportItems.forEach(item => {
                general += item.total;
                if (item.isMedication) medications += item.total;
                else others += item.total;
            });
        }
        return { general, medications, others };
    }, [salesReportItems]);

    const handleExportSalesExcel = () => {
        if (!salesReportItems.length) return alert('No hay datos para exportar');
        exportToExcel(
            salesReportItems.map(item => ({
                'Fecha': format(parseISO(item.date), 'dd/MM/yyyy HH:mm'),
                'Producto/Servicio': item.productName,
                'Paciente': item.patientName || 'Mostrador',
                'Cantidad': item.quantity,
                'Categoría': item.category,
                'Medicamento': item.isMedication ? 'Sí' : 'No',
                'Tipo de Venta': item.saleType,
                'Precio Unitario': item.unitPrice,
                'Total': item.total,
            })),
            'Reporte_Ventas'
        );
    };

    const handleExportProductsExcel = () => {
        if (!productReport.length) return alert('No hay datos para exportar');
        exportToExcel(
            productReport.map(p => ({
                'Nombre de Producto': p.name,
                'Categoría': p.category || 'General',
                'Stock Disponible': p.stock,
                'Cantidad Vendida': p.soldQuantity,
                'Ingresos Generados': p.revenue,
            })),
            'Reporte_Productos'
        );
    };

    // Tab definitions con badges de contador
    const tabs: { id: TabType; label: string; icon: any; activeColor: string; count?: number }[] = [
        { 
            id: 'ventas', 
            label: 'Ventas', 
            icon: DollarSign, 
            activeColor: 'border-blue-600 text-blue-600 bg-blue-50',
            count: salesReportItems.length 
        },
        { 
            id: 'citas', 
            label: 'Citas', 
            icon: Calendar, 
            activeColor: 'border-amber-500 text-amber-600 bg-amber-50',
            count: recentAppointments.length 
        },
        { 
            id: 'productos', 
            label: 'Productos', 
            icon: Package, 
            activeColor: 'border-emerald-500 text-emerald-600 bg-emerald-50',
            count: productReport.length 
        },
    ];

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 shadow-lg">
                {/* decorative elements */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/5" />
                <div className="absolute top-1/2 left-1/4 w-20 h-20 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-0 left-0 w-60 h-px bg-gradient-to-r from-white/50 to-transparent" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Período activo
                        </p>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3">
                            <BarChart3 className="w-7 h-7 text-white/90" />
                            Reportes & Estadísticas
                        </h1>
                        <p className="text-white/70 mt-1 text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {startDate === endDate
                                ? format(parseISO(startDate), "dd 'de' MMMM yyyy", { locale: es })
                                : `${format(parseISO(startDate), "dd MMM", { locale: es })} → ${format(parseISO(endDate), "dd MMM yyyy", { locale: es })}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Quick range buttons */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 flex border border-white/20">
                            {[
                                { id: 'today', label: 'Hoy' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mes' },
                            ].map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleRangeChange(r.id as DateRangeType)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${rangeType === r.id
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom date range */}
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5">
                            <input
                                type="date" value={startDate}
                                onChange={e => { setStartDate(e.target.value); setRangeType('custom'); }}
                                className="text-xs bg-transparent text-white/80 focus:outline-none cursor-pointer w-24"
                            />
                            <span className="text-white/40">→</span>
                            <input
                                type="date" value={endDate}
                                onChange={e => { setEndDate(e.target.value); setRangeType('custom'); }}
                                className="text-xs bg-transparent text-white/80 focus:outline-none cursor-pointer w-24"
                            />
                        </div>

                        {/* Actions */}
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-purple-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
                            title="Exportar PDF"
                        >
                            <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                            onClick={fetchData} disabled={loading}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 hover:scale-105 active:scale-95"
                            title="Refrescar"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-white' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── NAVIGATION TABS ────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${isActive
                                ? `${tab.activeColor} shadow-sm`
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive
                                    ? 'bg-white/30 text-current'
                                    : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB: VENTAS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'ventas' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {loading ? (
                            <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
                        ) : (
                            <>
                                <KPICard
                                    title="Total General"
                                    value={`$${(salesTotals.general || 0).toLocaleString('es-CO')}`}
                                    subValue="Todas las ventas y servicios"
                                    icon={DollarSign}
                                    color="violet"
                                    tooltip="Suma total de todas las ventas y servicios facturados en el período"
                                    featured
                                />
                                <KPICard
                                    title="Medicamentos"
                                    value={`$${(salesTotals.medications || 0).toLocaleString('es-CO')}`}
                                    subValue="Categoría medicamento"
                                    icon={Pill}
                                    color="emerald"
                                    tooltip="Ingresos exclusivamente de productos categorizados como medicamentos"
                                />
                                <KPICard
                                    title="Otros Servicios"
                                    value={`$${(salesTotals.others || 0).toLocaleString('es-CO')}`}
                                    subValue="Excl. medicamentos"
                                    icon={Package}
                                    color="amber"
                                    tooltip="Ingresos por servicios, cremas, insumos y otros productos"
                                />
                            </>
                        )}
                    </div>

                    {/* Sales Detail Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-blue-500" />
                                Detalle de Ventas
                                <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {salesReportItems.length}
                                </span>
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                                <select
                                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={salesCategoryFilter}
                                    onChange={e => setSalesCategoryFilter(e.target.value)}
                                >
                                    <option value="all">Todas las categorías</option>
                                    <option value="medications">💊 Medicamentos</option>
                                    <option value="services">📋 Servicios y Otros</option>
                                </select>
                                <select
                                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={salesTypeFilter}
                                    onChange={e => setSalesTypeFilter(e.target.value)}
                                >
                                    <option value="all">Todos los tipos</option>
                                    <option value="appointment">📅 Venta en Cita</option>
                                    <option value="direct">🛒 Venta Directa</option>
                                </select>
                                <button
                                    onClick={handleExportSalesExcel}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors hover:scale-105 active:scale-95"
                                    title="Exportar Excel"
                                >
                                    <Download className="w-4 h-4" /> Excel
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {salesReportItems.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3.5">Fecha</th>
                                            <th className="px-5 py-3.5">Producto / Servicio</th>
                                            <th className="px-5 py-3.5 text-center">Cant.</th>
                                            <th className="px-5 py-3.5">Categoría</th>
                                            <th className="px-5 py-3.5">Tipo</th>
                                            <th className="px-5 py-3.5 text-right">Unitario</th>
                                            <th className="px-5 py-3.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {salesReportItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap font-medium">
                                                    {format(parseISO(item.date), 'dd/MM/yy HH:mm')}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.isMedication ? 'bg-emerald-100 group-hover:scale-110 transition-transform' : 'bg-slate-100 group-hover:scale-110 transition-transform'
                                                            }`}>
                                                            {item.isMedication
                                                                ? <Pill className="w-3.5 h-3.5 text-emerald-600" />
                                                                : <Package className="w-3.5 h-3.5 text-slate-500" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-xs">{item.productName}</p>
                                                            {item.patientName && item.patientName !== 'Mostrador' && (
                                                                <p className="text-[10px] text-slate-400">{item.patientName}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs group-hover:bg-slate-200 transition-colors">
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isMedication
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.saleType === 'Cita'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {item.saleType === 'Cita' ? '📅 ' + item.saleType : '🛒 ' + item.saleType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-slate-500 text-xs">
                                                    ${item.unitPrice.toLocaleString('es-CO')}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-black text-slate-800">
                                                    ${item.total.toLocaleString('es-CO')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState message={getRandomMessage('ventas')} type="ventas" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: CITAS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'citas' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {loading ? (
                            <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
                        ) : (
                            <>
                                <KPICard
                                    title="Total Pacientes"
                                    value={String(kpis?.totalPatients ?? 0)}
                                    subValue="Registro histórico total"
                                    icon={Users}
                                    color="blue"
                                    tooltip="Número total de pacientes registrados en el sistema"
                                />
                                <KPICard
                                    title="Citas Agendadas"
                                    value={String(kpis?.totalAppointments ?? 0)}
                                    subValue="En el rango seleccionado"
                                    icon={Calendar}
                                    color="amber"
                                    tooltip="Total de citas creadas en el período, sin importar su estado"
                                />
                                <KPICard
                                    title="Citas Completadas"
                                    value={String(kpis?.completedAppointments ?? 0)}
                                    subValue={`${kpis?.totalAppointments ? Math.round((kpis.completedAppointments / kpis.totalAppointments) * 100) : 0}% efectividad`}
                                    icon={CheckCircle2}
                                    color="emerald"
                                    tooltip="Atenciones efectivamente realizadas en el período"
                                />
                                <KPICard
                                    title="Ingresos (Real / Est.)"
                                    value={`$${kpis?.actualIncome.toLocaleString('es-CO', { minimumFractionDigits: 0 }) ?? 0}`}
                                    subValue={`$${kpis?.estimatedIncome.toLocaleString('es-CO', { minimumFractionDigits: 0 }) ?? 0} estimado`}
                                    icon={DollarSign}
                                    color="violet"
                                    tooltip="Ingresos reales recaudados vs ingresos estimados por las citas completadas"
                                    featured
                                />
                            </>
                        )}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Flujo de citas */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[380px]">
                            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                                Flujo de Citas por Día
                                {appointmentsByDay.length > 0 && (
                                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {appointmentsByDay.length} días
                                    </span>
                                )}
                            </h3>
                            {loading ? <div className="h-64 animate-pulse bg-slate-50 rounded-xl" /> :
                                appointmentsByDay.length > 0 ? (
                                    <div className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={appointmentsByDay}>
                                                <defs>
                                                    <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="gSched" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tickFormatter={v => format(parseISO(v), 'dd MMM', { locale: es })}
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={<CustomTooltip />}
                                                    labelFormatter={v => format(parseISO(v as string), "eeee dd 'de' MMMM", { locale: es })} />
                                                <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={8} />
                                                <Area type="monotone" dataKey="completed" name="Completadas" stroke="#10b981" strokeWidth={2.5} fill="url(#gComp)" />
                                                <Area type="monotone" dataKey="scheduled" name="Programadas" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gSched)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState message={getRandomMessage('citas')} type="citas" />}
                        </div>

                        {/* Servicios populares */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[380px]">
                            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-amber-500" />
                                Servicios más Populares
                                {serviceRanking.length > 0 && (
                                    <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {serviceRanking.length}
                                    </span>
                                )}
                            </h3>
                            {loading ? <div className="h-64 animate-pulse bg-slate-50 rounded-xl" /> :
                                serviceRanking.length > 0 ? (
                                    <div className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={serviceRanking} cx="50%" cy="45%"
                                                    innerRadius={55} outerRadius={90} paddingAngle={4}
                                                    dataKey="count" nameKey="name">
                                                    {serviceRanking.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }} />
                                                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState message={getRandomMessage('citas')} type="citas" />}
                        </div>

                        {/* Profesionales */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-500" />
                                Citas por Profesional
                                {professionalStats.length > 0 && (
                                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {professionalStats.length}
                                    </span>
                                )}
                            </h3>
                            {loading ? <div className="h-48 animate-pulse bg-slate-50 rounded-xl" /> :
                                professionalStats.length > 0 ? (
                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={professionalStats} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#475569' }} />
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }} />
                                                <Bar dataKey="count" name="Citas" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState message="No hay datos de profesionales" type="citas" />}
                        </div>

                        {/* Métodos de pago */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                Métodos de Pago
                            </h3>
                            {loading ? <div className="h-48 animate-pulse bg-slate-50 rounded-xl" /> :
                                kpis && (kpis.paymentBreakdown.cash > 0 || kpis.paymentBreakdown.transfer > 0 || kpis.paymentBreakdown.card > 0) ? (
                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Efectivo', value: kpis.paymentBreakdown.cash },
                                                        { name: 'Transferencia', value: kpis.paymentBreakdown.transfer },
                                                        { name: 'Tarjeta', value: kpis.paymentBreakdown.card },
                                                    ].filter(i => i.value > 0)}
                                                    cx="50%" cy="45%"
                                                    innerRadius={52} outerRadius={80} paddingAngle={4}
                                                    dataKey="value" nameKey="name"
                                                >
                                                    <Cell fill="#10b981" />
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#f59e0b" />
                                                </Pie>
                                                <RechartsTooltip
                                                    formatter={(v: number) => `$${v.toLocaleString('es-CO')}`}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }}
                                                />
                                                <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState message="No hay datos de pagos para este período" type="ventas" />}
                        </div>
                    </div>

                    {/* Tables */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Recent appointments */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-50 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <h3 className="font-bold text-slate-800">Citas Recientes</h3>
                                {recentAppointments.length > 0 && (
                                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {recentAppointments.length}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="p-5 space-y-3">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />)}
                                    </div>
                                ) : recentAppointments.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="px-5 py-3.5">Paciente</th>
                                                <th className="px-5 py-3.5">Servicio</th>
                                                <th className="px-5 py-3.5">Fecha</th>
                                                <th className="px-5 py-3.5 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {recentAppointments.map(apt => (
                                                <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-5 py-3.5 font-medium text-slate-800">{apt.patientName}</td>
                                                    <td className="px-5 py-3.5 text-slate-500 text-xs">{apt.serviceName}</td>
                                                    <td className="px-5 py-3.5 text-slate-400 text-xs">{format(parseISO(apt.date), 'dd/MM/yy HH:mm')}</td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            apt.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {apt.status === 'completed' ? '✅ Completada' :
                                                                apt.status === 'cancelled' ? '❌ Cancelada' : '⏳ Pendiente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <EmptyState message={getRandomMessage('citas')} type="citas" />
                                )}
                            </div>
                        </div>

                        {/* Income summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-50 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-slate-800">Ingresos por Servicio en Citas</h3>
                                {incomeSummary.length > 0 && (
                                    <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {incomeSummary.length}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="p-5 space-y-3">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />)}
                                    </div>
                                ) : incomeSummary.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="px-5 py-3.5">Servicio</th>
                                                <th className="px-5 py-3.5 text-center">Cant.</th>
                                                <th className="px-5 py-3.5 text-right">Unitario</th>
                                                <th className="px-5 py-3.5 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {incomeSummary.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-5 py-3.5 font-medium text-slate-800">{item.serviceName}</td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs group-hover:bg-slate-200 transition-colors">
                                                            {item.count}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-slate-400 text-xs">${item.unitPrice.toLocaleString('es-CO')}</td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-blue-600">${item.total.toLocaleString('es-CO')}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-blue-50/60">
                                                <td colSpan={3} className="px-5 py-3.5 font-bold text-slate-700 uppercase text-xs tracking-wider">Total Estimado</td>
                                                <td className="px-5 py-3.5 text-right font-black text-blue-700 text-base">
                                                    ${incomeSummary.reduce((s, i) => s + i.total, 0).toLocaleString('es-CO')}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <EmptyState message="No hay datos de ingresos registrados" type="ventas" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: PRODUCTOS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'productos' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-slate-800">Rotación y Rentabilidad de Productos</h3>
                                <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {productReport.length}
                                </span>
                            </div>
                            <button
                                onClick={handleExportProductsExcel}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors hover:scale-105 active:scale-95"
                            >
                                <Download className="w-4 h-4" /> Excel
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            {productReport.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3.5">Producto</th>
                                            <th className="px-5 py-3.5">Categoría</th>
                                            <th className="px-5 py-3.5">Stock Actual</th>
                                            <th className="px-5 py-3.5 text-center">Cant. Vendida</th>
                                            <th className="px-5 py-3.5 text-right">Ingresos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {productReport.map(prod => {
                                            const isLowStock = prod.stock <= 5;
                                            const isMedication = prod.category?.toLowerCase().includes('medicamento');
                                            const stockPct = Math.min(100, (prod.stock / Math.max(prod.stock + prod.soldQuantity, 1)) * 100);
                                            return (
                                                <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${isLowStock ? 'bg-rose-100' : isMedication ? 'bg-emerald-50' : 'bg-blue-50'
                                                                }`}>
                                                                <Package className={`w-3.5 h-3.5 ${isLowStock ? 'text-rose-500' : isMedication ? 'text-emerald-500' : 'text-blue-500'
                                                                    }`} />
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-800">{prod.name}</span>
                                                                {isLowStock && (
                                                                    <span className="ml-2 text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                                                                        ⚠️ Stock bajo
                                                                    </span>
                                                                )}
                                                                {isMedication && !isLowStock && (
                                                                    <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                                                                        💊 Medicamento
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                                                            {prod.category || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="min-w-[100px]">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-sm font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-700'}`}>
                                                                    {prod.stock}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">{Math.round(stockPct)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${isLowStock ? 'bg-rose-400' :
                                                                        stockPct < 40 ? 'bg-amber-400' :
                                                                            'bg-emerald-400'
                                                                        }`}
                                                                    style={{ width: `${stockPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        {prod.soldQuantity > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                                                {prod.soldQuantity}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                                                        ${prod.revenue.toLocaleString('es-CO')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState message={getRandomMessage('productos')} type="productos" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}