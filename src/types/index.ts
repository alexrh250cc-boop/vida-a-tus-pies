export type Role = 'admin' | 'podologo';
export type Sede = 'norte' | 'sur';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    sede?: Sede; // If podologo is assigned to a specific sede primarily
}

export interface Service {
    id: string;
    name: string;
    duration: number; // in minutes
    price: number;
    available_sedes: Sede[];  // ← CAMBIADO de availableSedes a available_sedes
}

export interface Patient {
    id: string;
    cedula: string;
    name: string;
    phone: string;
    email: string;
    history: string;
    createdAt: string;
}

export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    serviceId: string;
    serviceName: string;
    professionalId: string;
    professionalName: string;
    sede: Sede;
    date: string; // ISO string
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
}

// ============================================
// Interfaz para Fichas Podológicas
// ============================================
export interface FichaPodologica {
    id: string;
    patient_id: string;
    appointment_id?: string | null;
    fecha: string;
    motivo_consulta: string | null;
    enfermedades: {
        diabetes: boolean;
        hipertension: boolean;
        hipotiroidismo: boolean;
        hipertiroidismo: boolean;
    };
    tiempo_enfermedad: string | null;
    medicacion: string | null;
    alergias: string | null;
    cirugias_miembro_inferior: string | null;
    diagnostico_pie_derecho: string | null;
    diagnostico_pie_izquierdo: string | null;
    observaciones: string | null;
    firma_paciente?: string | null;
    firma_profesional?: string | null;
    created_at: string;
    updated_at: string;
}

export type FichaPodologicaFormData = Omit<FichaPodologica, 'id' | 'created_at' | 'updated_at'>;