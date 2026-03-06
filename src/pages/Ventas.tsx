import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Product, PaymentMethod, SaleWithItems } from '../types';
import {
    Search,
    ShoppingBag,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    CheckCircle2,
    Pill,
    History,
    Store,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CartItem extends Product {
    quantity: number;
}

type TabType = 'venta' | 'historial';
type FilterCategory = 'all' | 'medication' | 'service';

export default function Ventas() {
    const [activeTab, setActiveTab] = useState<TabType>('venta');

    // Venta state
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Historial state
    const [sales, setSales] = useState<SaleWithItems[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (activeTab === 'historial') {
            loadSales();
        }
    }, [activeTab]);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const loadSales = async () => {
        setLoadingSales(true);
        try {
            const data = await api.getSales();
            // Filter out direct sales or all sales? 
            // Mostrador normally has patient_name = 'Mostrador' or patient_id = null
            setSales(data);
        } catch (error) {
            console.error('Error loading sales:', error);
        } finally {
            setLoadingSales(false);
        }
    };

    // --- Funciones Carrito ---
    const addToCart = (product: Product) => {
        const currentQty = cart.find(item => item.id === product.id)?.quantity || 0;
        if (currentQty >= product.stock) return;

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                if (newQty > item.stock) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const confirmRemoveItem = (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar "${name}" del carrito?`)) {
            setCart(prev => prev.filter(item => item.id !== id));
        }
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleFinishSale = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            await api.createSale({
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price
                })),
                payment_method: paymentMethod
            });
            setCart([]);
            setShowSuccess(true);
            await loadProducts();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error finishing sale:', error);
            alert('Error al procesar la venta');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Funciones Historial ---
    const handleCancelSale = async (saleId: string) => {
        const reason = window.prompt('Por favor, ingresa el MOTIVO de la anulación (obligatorio):');

        if (reason === null) return; // Cancelled prompt
        if (!reason.trim()) {
            alert('Debes ingresar un motivo para anular la venta.');
            return;
        }

        if (!window.confirm(`¿Confirmas la ANULACIÓN de esta venta?\nMotivo: ${reason}\n\nEl stock será devuelto al inventario.`)) {
            return;
        }

        try {
            await api.cancelSale(saleId, reason);
            alert('Venta anulada correctamente. El stock ha sido restaurado.');
            await loadSales(); // Refrescar historial
            await loadProducts(); // Refrescar stock en memoria
        } catch (error) {
            console.error('Error cancelling sale:', error);
            alert('Hubo un error al anular la venta. Verifique la consola o intente nuevamente.');
        }
    };

    const toggleExpand = (saleId: string) => {
        setExpandedSaleId(prev => prev === saleId ? null : saleId);
    };

    // --- Filtros Catálogo ---
    const isMedication = (cat: string | null) => cat?.toLowerCase() === 'medicamento' || cat?.toLowerCase() === 'medicamentos';

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isMed = isMedication(p.category);

        if (categoryFilter === 'medication' && !isMed) return false;
        if (categoryFilter === 'service' && isMed) return false;

        return matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Store className="w-7 h-7 text-blue-600" />
                        Módulo de Ventas
                    </h1>
                    <p className="text-slate-500">Gestiona las ventas directas e historial</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('venta')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'venta'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Punto de Venta
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'historial'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Historial y Devoluciones
                    </button>
                </div>
            </div>

            {/* TAB: PUNTO DE VENTA */}
            {activeTab === 'venta' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-300">
                    {/* Catalog */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${categoryFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setCategoryFilter('medication')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${categoryFilter === 'medication' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Pill className="w-3 h-3" />
                                    Medicamentos
                                </button>
                                <button
                                    onClick={() => setCategoryFilter('service')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${categoryFilter === 'service' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Otros
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredProducts.map(product => {
                                const inCart = cart.find(item => item.id === product.id)?.quantity || 0;
                                const availableStock = product.stock - inCart;
                                const isMed = isMedication(product.category);

                                return (
                                    <button
                                        key={product.id}
                                        disabled={availableStock <= 0}
                                        onClick={() => addToCart(product)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all group ${availableStock <= 0
                                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                                            : isMed
                                                ? 'bg-white border-transparent border-l-emerald-500 hover:border-emerald-300 hover:shadow-md'
                                                : 'bg-white border-transparent border-l-blue-500 hover:border-blue-300 hover:shadow-md'
                                            } shadow-sm`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    {isMed && <Pill className={`w-3.5 h-3.5 ${availableStock <= 0 ? 'text-slate-400' : 'text-emerald-500'}`} />}
                                                    <span className="font-semibold text-slate-900 line-clamp-1">{product.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-0.5">{product.category || 'General'}</span>
                                            </div>
                                            <span className="text-slate-700 font-bold bg-slate-100 px-2 py-1 rounded-md text-sm">
                                                ${product.price.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs mt-3">
                                            <span className={`${availableStock <= (product as any).min_stock ? 'text-rose-500 font-medium' : 'text-slate-500'}`}>
                                                Stock disponible: {availableStock}
                                            </span>
                                            {inCart > 0 && (
                                                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                                    En carrito: {inCart}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {filteredProducts.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
                                    <ShoppingBag className="w-12 h-12 text-slate-200 mb-3" />
                                    <p>No se encontraron productos para esta búsqueda o filtro.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-[calc(100vh-14rem)] sticky top-8">
                            <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                                <div className="flex items-center">
                                    <ShoppingCart className="w-5 h-5 text-blue-600 mr-2" />
                                    <h2 className="font-bold text-slate-800">Carrito Actual</h2>
                                </div>
                                <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                    {cart.length} items
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                                        <ShoppingCart className="w-16 h-16 opacity-10" />
                                        <p className="text-sm">Agrega productos al carrito para comenzar</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-semibold text-slate-800 leading-tight pr-4">{item.name}</span>
                                                <span className="text-sm font-bold text-slate-900">${(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => confirmRemoveItem(item.id, item.name)}
                                                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                                    title="Eliminar producto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-5 bg-white rounded-b-2xl border-t border-slate-100 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] space-y-5">
                                <div className="space-y-2.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <CreditCard className="w-3.5 h-3.5" />
                                        Método de Pago
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cash', 'transfer', 'card'] as PaymentMethod[]).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${paymentMethod === method
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {method === 'cash' ? 'Efectivo' : method === 'transfer' ? 'Transf.' : 'Tarjeta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end py-2 border-t border-slate-100 pt-3">
                                    <span className="text-slate-500 font-medium">Total a Pagar</span>
                                    <span className="text-3xl font-black text-slate-900 tracking-tight">${total.toLocaleString()}</span>
                                </div>

                                {showSuccess ? (
                                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-center font-bold border border-emerald-100 animate-in zoom-in duration-300">
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        ¡Venta Procesada!
                                    </div>
                                ) : (
                                    <button
                                        disabled={cart.length === 0 || isProcessing}
                                        onClick={handleFinishSale}
                                        className={`w-full py-4 rounded-xl flex items-center justify-center font-bold text-base transition-all ${cart.length === 0 || isProcessing
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]'
                                            }`}
                                    >
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        {isProcessing ? 'Procesando...' : 'Cobrar e Imprimir'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: HISTORIAL DE VENTAS */}
            {activeTab === 'historial' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600" />
                            Registro de Ventas (Todas)
                        </h2>
                        <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border shadow-sm">
                            Mostrando histórico completo
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        {loadingSales ? (
                            <div className="p-12 text-center text-slate-400 animate-pulse flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                Cargando ventas...
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                                <AlertCircle className="w-12 h-12 text-slate-200 mb-3" />
                                <p>No existen ventas registradas aún.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 w-10"></th>
                                        <th className="px-6 py-4">Fecha y Hora</th>
                                        <th className="px-6 py-4">Contexto</th>
                                        <th className="px-6 py-4">Método</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sales.map((sale) => {
                                        const isExpanded = expandedSaleId === sale.id;
                                        const isCancelled = sale.status === 'cancelled';

                                        return (
                                            <React.Fragment key={sale.id}>
                                                <tr className={`hover:bg-slate-50 transition-colors ${isCancelled ? 'opacity-75 bg-slate-50/50' : ''}`}>
                                                    <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleExpand(sale.id)}>
                                                        <button className="text-slate-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors">
                                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                                                        {format(parseISO(sale.date), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {sale.appointment_id ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                Venta en Cita
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                Venta Directa
                                                            </span>
                                                        )}
                                                        {sale.patient_name && sale.patient_name !== 'Mostrador' && (
                                                            <div className="text-xs text-slate-400 mt-1 line-clamp-1">{sale.patient_name}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-600 text-xs font-semibold uppercase">
                                                            {sale.payment_method === 'cash' ? 'EFECTIVO' : sale.payment_method === 'transfer' ? 'TRANSFERENCIA' : 'TARJETA'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                        ${sale.total.toLocaleString('es-CO')}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isCancelled ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                                ANULADA
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                COMPLETADA
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {!isCancelled && (
                                                            <button
                                                                onClick={() => handleCancelSale(sale.id)}
                                                                className="inline-flex items-center text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-rose-200 hover:border-rose-300 shadow-sm"
                                                                title="Anular venta y devolver al stock"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                                Anular
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={7} className="px-0 py-0 border-b-0">
                                                            <div className="bg-slate-50 border-y border-slate-200 px-12 py-6 shadow-inner">
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                                                                    <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                                                                    Productos en esta transacción
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                                    {sale.items?.map(item => (
                                                                        <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-start">
                                                                            <div className="bg-blue-50 text-blue-700 w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 mr-3">
                                                                                {item.quantity}x
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{item.product_name}</p>
                                                                                <p className="text-xs text-slate-500">Unit: ${item.unit_price.toLocaleString('es-CO')}</p>
                                                                                <p className="text-xs font-bold text-blue-600 mt-0.5">Sub: ${(item.quantity * item.unit_price).toLocaleString('es-CO')}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {(!sale.items || sale.items.length === 0) && (
                                                                        <p className="text-sm text-slate-500 italic">No hay detalles de productos asociados.</p>
                                                                    )}
                                                                </div>

                                                                {isCancelled && sale.cancel_reason && (
                                                                    <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                                                                        <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Detalles de Anulación</h5>
                                                                        <p className="text-sm text-rose-900 font-medium">{sale.cancel_reason}</p>
                                                                        {sale.cancelled_at && (
                                                                            <p className="text-[10px] text-rose-400 mt-2 italic">
                                                                                Anulada el {format(parseISO(sale.cancelled_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
