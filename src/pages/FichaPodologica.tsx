
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import {
    Save, X, Printer, FileText,
    Footprints,
    User, Phone, Mail, MapPin, Clock,
    Heart, Pill, AlertTriangle, Scissors
} from 'lucide-react';

interface FichaPodologicaProps {
    patientId: string;
    appointmentId?: string;
    onClose?: () => void;
}

interface FichaData {
    id?: string;
    patient_id: string;
    appointment_id?: string;
    fecha: string;
    motivo_consulta: string;
    enfermedades: {
        diabetes: boolean;
        hipertension: boolean;
        hipotiroidismo: boolean;
        hipertiroidismo: boolean;
    };
    tiempo_enfermedad: string;
    medicacion: string;
    alergias: string;
    cirugias_miembro_inferior: string;
    diagnostico_pie_derecho: string;
    diagnostico_pie_izquierdo: string;
    observaciones: string;
    firma_paciente?: string;
    firma_profesional?: string;
    created_at?: string;
}

export default function FichaPodologica({ patientId, appointmentId, onClose }: FichaPodologicaProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [patient, setPatient] = useState<any>(null);
    // const [appointment, setAppointment] = useState<any>(null); // Unused
    const [existingFicha, setExistingFicha] = useState<FichaData | null>(null);
    const [formData, setFormData] = useState<FichaData>({
        patient_id: patientId,
        appointment_id: appointmentId,
        fecha: new Date().toISOString().split('T')[0],
        motivo_consulta: '',
        enfermedades: {
            diabetes: false,
            hipertension: false,
            hipotiroidismo: false,
            hipertiroidismo: false
        },
        tiempo_enfermedad: '',
        medicacion: '',
        alergias: '',
        cirugias_miembro_inferior: '',
        diagnostico_pie_derecho: '',
        diagnostico_pie_izquierdo: '',
        observaciones: ''
    });

    useEffect(() => {
        loadData();
    }, [patientId, appointmentId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar datos del paciente
            const patientData = await api.getPatient(patientId);
            setPatient(patientData);

            // Cargar datos de la cita si existe
            if (appointmentId) {
                // const appointments = await api.getAppointments();
                // const apt = appointments.find(a => a.id === appointmentId);
                // setAppointment(apt);
            }

            // Buscar si ya existe una ficha para este paciente/cita
            const { data: fichaExistente } = await supabase
                .from('fichas_podologicas')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fichaExistente) {
                setExistingFicha(fichaExistente);
                setFormData(fichaExistente);
            }
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
            if (existingFicha?.id) {
                // Actualizar ficha existente
                await supabase
                    .from('fichas_podologicas')
                    .update(formData)
                    .eq('id', existingFicha.id);
            } else {
                // Crear nueva ficha
                await supabase
                    .from('fichas_podologicas')
                    .insert([formData]);
            }
            alert('Ficha guardada correctamente');
            if (onClose) onClose();
        } catch (error: any) {
            console.error('Error guardando ficha:', error);
            alert('Error al guardar ficha: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Cargando ficha...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto print:shadow-none print:p-0">
            {/* Header con acciones */}
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-company-blue" />
                    Ficha Podológica
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 border rounded-lg hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 bg-company-green text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Título para impresión */}
            <div className="hidden print:block text-center mb-4">
                <h1 className="text-2xl font-bold">FICHA PODOLÓGICA</h1>
                <p className="text-sm text-slate-600">Fecha: {formData.fecha}</p>
            </div>

            {/* Información del paciente */}
            <div className="bg-slate-50 p-4 rounded-lg mb-6 print:bg-white print:border">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-company-blue" />
                    Datos del Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-slate-500">Nombre</p>
                        <p className="font-medium">{patient?.name || '---'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Cédula/RUC</p>
                        <p className="font-medium">{patient?.cedula || '---'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Edad</p>
                        <p className="font-medium">
                            {patient?.birth_date ?
                                Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / 31557600000) : '---'
                            } años
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Fecha Nacimiento</p>
                        <p className="font-medium">{patient?.birth_date || '---'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Teléfono</p>
                        <p className="font-medium flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {patient?.phone || '---'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-medium flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {patient?.email || '---'}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-sm text-slate-500">Dirección</p>
                        <p className="font-medium flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {patient?.address || '---'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulario de la ficha */}
            <form onSubmit={handleSubmit} className="space-y-6 print:space-y-4">
                {/* Motivo de consulta */}
                <div className="bg-white p-4 rounded-lg border">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        MOTIVO DE CONSULTA:
                    </label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        value={formData.motivo_consulta}
                        onChange={(e) => setFormData({ ...formData, motivo_consulta: e.target.value })}
                        placeholder="Describa el motivo de la consulta..."
                    />
                </div>

                {/* Enfermedades */}
                <div className="bg-white p-4 rounded-lg border">
                    <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        ENFERMEDADES:
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.enfermedades.diabetes}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    enfermedades: { ...formData.enfermedades, diabetes: e.target.checked }
                                })}
                                className="rounded"
                            />
                            <span>Diabetes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.enfermedades.hipertension}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    enfermedades: { ...formData.enfermedades, hipertension: e.target.checked }
                                })}
                                className="rounded"
                            />
                            <span>Hipertensión</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.enfermedades.hipotiroidismo}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    enfermedades: { ...formData.enfermedades, hipotiroidismo: e.target.checked }
                                })}
                                className="rounded"
                            />
                            <span>Hipotiroidismo</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.enfermedades.hipertiroidismo}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    enfermedades: { ...formData.enfermedades, hipertiroidismo: e.target.checked }
                                })}
                                className="rounded"
                            />
                            <span>Hipertiroidismo</span>
                        </label>
                    </div>
                </div>

                {/* Tiempo y medicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            TIEMPO DE ENFERMEDAD:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.tiempo_enfermedad}
                            onChange={(e) => setFormData({ ...formData, tiempo_enfermedad: e.target.value })}
                            placeholder="Ej: 2 años, 6 meses..."
                        />
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Pill className="w-4 h-4 text-purple-500" />
                            MEDICACIÓN ACTUAL:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.medicacion}
                            onChange={(e) => setFormData({ ...formData, medicacion: e.target.value })}
                            placeholder="Medicamentos que toma..."
                        />
                    </div>
                </div>

                {/* Alergias y cirugías */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ALERGIAS:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.alergias}
                            onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                            placeholder="Alergias conocidas..."
                        />
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-orange-500" />
                            CIRUGÍAS MIEMBRO INFERIOR:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.cirugias_miembro_inferior}
                            onChange={(e) => setFormData({ ...formData, cirugias_miembro_inferior: e.target.value })}
                            placeholder="Cirugías previas..."
                        />
                    </div>
                </div>

                {/* Diagnóstico por pie */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-blue-500" />
                            PIE DERECHO - DIAGNÓSTICO:
                        </label>
                        <textarea
                            rows={4}
                            className="w-full p-2 border rounded-lg"
                            value={formData.diagnostico_pie_derecho}
                            onChange={(e) => setFormData({ ...formData, diagnostico_pie_derecho: e.target.value })}
                            placeholder="Hallazgos, diagnósticos, tratamientos..."
                        />
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-green-500" />
                            PIE IZQUIERDO - DIAGNÓSTICO:
                        </label>
                        <textarea
                            rows={4}
                            className="w-full p-2 border rounded-lg"
                            value={formData.diagnostico_pie_izquierdo}
                            onChange={(e) => setFormData({ ...formData, diagnostico_pie_izquierdo: e.target.value })}
                            placeholder="Hallazgos, diagnósticos, tratamientos..."
                        />
                    </div>
                </div>

                {/* Observaciones adicionales */}
                <div className="bg-white p-4 rounded-lg border">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        OBSERVACIONES ADICIONALES:
                    </label>
                    <textarea
                        rows={3}
                        className="w-full p-2 border rounded-lg"
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        placeholder="Notas adicionales, recomendaciones..."
                    />
                </div>

                {/* Consentimiento informado y firmas */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-lg mb-3">CONSENTIMIENTO INFORMADO</h4>
                    <p className="text-sm mb-4">
                        Yo, <strong>{patient?.name || '_________________'}</strong>, acepto que el/la podólogo/a
                        proceda al tratamiento requerido. Me ha indicado el tipo de procedimiento y las consecuencias
                        que se pueden presentar, así como las indicaciones a seguir, para evitar complicaciones.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <p className="text-sm font-medium mb-1">Firma del Paciente:</p>
                            <div className="border-2 border-dashed border-slate-300 h-16 rounded-lg flex items-center justify-center text-slate-400">
                                [Espacio para firma]
                            </div>
                            <p className="text-xs text-slate-500 mt-1">C.I.: {patient?.cedula || '___________'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Firma del Profesional:</p>
                            <div className="border-2 border-dashed border-slate-300 h-16 rounded-lg flex items-center justify-center text-slate-400">
                                [Espacio para firma]
                            </div>
                            <p className="text-xs text-slate-500 mt-1">C.I.: ___________</p>
                        </div>
                    </div>
                </div>

                {/* Botón guardar para impresión (solo visible en print) */}
                <div className="hidden print:block text-center text-xs text-slate-400 mt-4">
                    Documento generado electrónicamente el {new Date().toLocaleDateString()}
                </div>
            </form>
        </div>
    );
}