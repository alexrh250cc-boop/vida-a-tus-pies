import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FichaPodologica } from '../../types';
import { 
    Save, X, Printer, FileText, 
    Heart, Clock, Pill, AlertTriangle, 
    Scissors, User, Phone, Mail, MapPin, Activity
} from 'lucide-react';

interface FichaPodologicaModalProps {
    patientId: string;
    patientData: any;
    ficha?: FichaPodologica | null;
    onClose: () => void;
    onSave: () => void;
}

export default function FichaPodologicaModal({ 
    patientId, 
    patientData, 
    ficha, 
    onClose, 
    onSave 
}: FichaPodologicaModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Omit<FichaPodologica, 'id' | 'created_at' | 'updated_at'>>({
        patient_id: patientId,
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
        if (ficha) {
            setFormData({
                patient_id: ficha.patient_id,
                fecha: ficha.fecha,
                motivo_consulta: ficha.motivo_consulta || '',
                enfermedades: ficha.enfermedades || {
                    diabetes: false,
                    hipertension: false,
                    hipotiroidismo: false,
                    hipertiroidismo: false
                },
                tiempo_enfermedad: ficha.tiempo_enfermedad || '',
                medicacion: ficha.medicacion || '',
                alergias: ficha.alergias || '',
                cirugias_miembro_inferior: ficha.cirugias_miembro_inferior || '',
                diagnostico_pie_derecho: ficha.diagnostico_pie_derecho || '',
                diagnostico_pie_izquierdo: ficha.diagnostico_pie_izquierdo || '',
                observaciones: ficha.observaciones || ''
            });
        }
    }, [ficha]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (ficha?.id) {
                await api.updateFicha(ficha.id, formData);
                alert('Ficha actualizada correctamente');
            } else {
                await api.createFicha(formData);
                alert('Ficha guardada correctamente');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error guardando ficha:', error);
            alert('Error al guardar ficha: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const enfermedadesText = [
            formData.enfermedades.diabetes ? 'Diabetes' : null,
            formData.enfermedades.hipertension ? 'Hipertensión' : null,
            formData.enfermedades.hipotiroidismo ? 'Hipotiroidismo' : null,
            formData.enfermedades.hipertiroidismo ? 'Hipertiroidismo' : null
        ].filter(Boolean).join(', ') || 'Ninguna';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ficha Podológica - ${patientData?.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #2563eb; text-align: center; }
                    h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .section { margin-bottom: 20px; }
                    .label { font-weight: bold; color: #64748b; }
                    .value { margin-top: 5px; padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 4px; }
                    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
                    .firma { border-top: 1px solid black; padding-top: 10px; text-align: center; }
                    @media print {
                        body { margin: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>FICHA PODOLÓGICA</h1>
                    <p>Fecha: ${formData.fecha}</p>
                </div>

                <div class="patient-info">
                    <h2>Datos del Paciente</h2>
                    <p><strong>Nombre:</strong> ${patientData?.name || ''}</p>
                    <p><strong>Cédula:</strong> ${patientData?.cedula || ''}</p>
                    <p><strong>Teléfono:</strong> ${patientData?.phone || ''}</p>
                    <p><strong>Email:</strong> ${patientData?.email || ''}</p>
                    <p><strong>Dirección:</strong> ${patientData?.address || ''}</p>
                </div>

                <div class="section">
                    <h2>Motivo de Consulta</h2>
                    <div class="value">${formData.motivo_consulta || 'No especificado'}</div>
                </div>

                <div class="section">
                    <h2>Enfermedades</h2>
                    <div class="value">${enfermedadesText}</div>
                </div>

                <div class="grid">
                    <div class="section">
                        <h2>Tiempo de Enfermedad</h2>
                        <div class="value">${formData.tiempo_enfermedad || 'No especificado'}</div>
                    </div>
                    <div class="section">
                        <h2>Medicación</h2>
                        <div class="value">${formData.medicacion || 'No especificado'}</div>
                    </div>
                </div>

                <div class="grid">
                    <div class="section">
                        <h2>Alergias</h2>
                        <div class="value">${formData.alergias || 'No especificado'}</div>
                    </div>
                    <div class="section">
                        <h2>Cirugías MI</h2>
                        <div class="value">${formData.cirugias_miembro_inferior || 'No especificado'}</div>
                    </div>
                </div>

                <div class="grid">
                    <div class="section">
                        <h2>Diagnóstico Pie Derecho</h2>
                        <div class="value">${formData.diagnostico_pie_derecho || 'No especificado'}</div>
                    </div>
                    <div class="section">
                        <h2>Diagnóstico Pie Izquierdo</h2>
                        <div class="value">${formData.diagnostico_pie_izquierdo || 'No especificado'}</div>
                    </div>
                </div>

                <div class="section">
                    <h2>Observaciones</h2>
                    <div class="value">${formData.observaciones || 'No especificado'}</div>
                </div>

                <div class="section">
                    <h2>Consentimiento Informado</h2>
                    <div class="value">
                        Yo, ${patientData?.name || '_________________'}, acepto que el/la podólogo/a 
                        proceda al tratamiento requerido. Me ha indicado el tipo de procedimiento y las consecuencias 
                        que se pueden presentar, así como las indicaciones a seguir, para evitar complicaciones.
                    </div>
                </div>

                <div class="firmas">
                    <div class="firma">
                        <p>Firma del Paciente</p>
                        <p>C.I.: ${patientData?.cedula || '___________'}</p>
                    </div>
                    <div class="firma">
                        <p>Firma del Profesional</p>
                        <p>C.I.: ___________</p>
                    </div>
                </div>

                <p style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px;">
                    Documento generado electrónicamente el ${new Date().toLocaleDateString()}
                </p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b z-10">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-company-blue" />
                    {ficha ? 'Editar Ficha Podológica' : 'Nueva Ficha Podológica'}
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
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-company-blue" />
                    Datos del Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-slate-500">Nombre</p>
                        <p className="font-medium">{patientData?.name || '---'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Cédula/RUC</p>
                        <p className="font-medium">{patientData?.cedula || '---'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Teléfono</p>
                        <p className="font-medium flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {patientData?.phone || '---'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-medium flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {patientData?.email || '---'}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-sm text-slate-500">Dirección</p>
                        <p className="font-medium flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {patientData?.address || '---'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        MOTIVO DE CONSULTA:
                    </label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        value={formData.motivo_consulta || ''}
                        onChange={(e) => setFormData({...formData, motivo_consulta: e.target.value})}
                        placeholder="Describa el motivo de la consulta..."
                    />
                </div>

                <div>
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
                                    enfermedades: {...formData.enfermedades, diabetes: e.target.checked}
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
                                    enfermedades: {...formData.enfermedades, hipertension: e.target.checked}
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
                                    enfermedades: {...formData.enfermedades, hipotiroidismo: e.target.checked}
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
                                    enfermedades: {...formData.enfermedades, hipertiroidismo: e.target.checked}
                                })}
                                className="rounded"
                            />
                            <span>Hipertiroidismo</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            TIEMPO DE ENFERMEDAD:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.tiempo_enfermedad || ''}
                            onChange={(e) => setFormData({...formData, tiempo_enfermedad: e.target.value})}
                            placeholder="Ej: 2 años, 6 meses..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Pill className="w-4 h-4 text-purple-500" />
                            MEDICACIÓN ACTUAL:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.medicacion || ''}
                            onChange={(e) => setFormData({...formData, medicacion: e.target.value})}
                            placeholder="Medicamentos que toma..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ALERGIAS:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.alergias || ''}
                            onChange={(e) => setFormData({...formData, alergias: e.target.value})}
                            placeholder="Alergias conocidas..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-orange-500" />
                            CIRUGÍAS MIEMBRO INFERIOR:
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg"
                            value={formData.cirugias_miembro_inferior || ''}
                            onChange={(e) => setFormData({...formData, cirugias_miembro_inferior: e.target.value})}
                            placeholder="Cirugías previas..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            PIE DERECHO - DIAGNÓSTICO:
                        </label>
                        <textarea
                            rows={3}
                            className="w-full p-2 border rounded-lg"
                            value={formData.diagnostico_pie_derecho || ''}
                            onChange={(e) => setFormData({...formData, diagnostico_pie_derecho: e.target.value})}
                            placeholder="Hallazgos, diagnósticos, tratamientos..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-500" />
                            PIE IZQUIERDO - DIAGNÓSTICO:
                        </label>
                        <textarea
                            rows={3}
                            className="w-full p-2 border rounded-lg"
                            value={formData.diagnostico_pie_izquierdo || ''}
                            onChange={(e) => setFormData({...formData, diagnostico_pie_izquierdo: e.target.value})}
                            placeholder="Hallazgos, diagnósticos, tratamientos..."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        OBSERVACIONES ADICIONALES:
                    </label>
                    <textarea
                        rows={2}
                        className="w-full p-2 border rounded-lg"
                        value={formData.observaciones || ''}
                        onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                        placeholder="Notas adicionales, recomendaciones..."
                    />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium mb-2">CONSENTIMIENTO INFORMADO</p>
                    <p className="text-xs text-slate-600">
                        Yo, <strong>{patientData?.name || '_________________'}</strong>, acepto que el/la podólogo/a 
                        proceda al tratamiento requerido. Me ha indicado el tipo de procedimiento y las consecuencias 
                        que se pueden presentar, así como las indicaciones a seguir, para evitar complicaciones.
                    </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-company-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : (ficha ? 'Actualizar' : 'Guardar')}
                    </button>
                </div>
            </form>
        </div>
    );
}