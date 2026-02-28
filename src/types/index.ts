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
    available_sedes: Sede[];
}

export interface Patient {
    id: string;
    cedula: string;
    name: string;
    phone: string;
    email: string;
    history: string;
    address?: string;        // ← NUEVO: Dirección del paciente
    birth_date?: string;     // ← NUEVO: Fecha de nacimiento (YYYY-MM-DD)
    created_by?: string;     // ← NUEVO: ID del profesional que creó al paciente
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
// NUEVO: Interfaz para Notas Clínicas
// ============================================
export interface ClinicalNote {
    id: string;
    patient_id: string;
    professional_id?: string;
    professional_name?: string;
    title: string;
    content: string;
    note_date: string;
    created_at: string;
    updated_at: string;
}

export type ClinicalNoteFormData = Omit<ClinicalNote, 'id' | 'created_at' | 'updated_at' | 'professional_name'>;

// ============================================
// NUEVO: Interfaz para Archivos de Pacientes
// ============================================
export interface PatientFile {
    id: string;
    patient_id: string;
    name: string;
    file_path: string;
    file_type: string;
    file_size?: number;
    created_at: string;
}

export type PatientFileFormData = Omit<PatientFile, 'id' | 'created_at'>;

// ============================================
// Interfaz para Fichas Podológicas
// ============================================
export interface FichaPodologica {
    id: string;
    patient_id: string;
    professional_id?: string | null;
    appointment_id?: string | null;
    fecha: string;
    motivo_consulta: string | null;
    enfermedades: {
        diabetes: boolean;
        hipertension: boolean;
        hipotiroidismo: boolean;
        hipertiroidismo: boolean;
        otras: boolean;
    };
    otras_enfermedades: string | null;
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

// ============================================
// Report Interfaces
// ============================================

export interface ReportKPIs {
    totalPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    estimatedIncome: number;
    actualIncome: number;
    paymentBreakdown: {
        cash: number;
        transfer: number;
        card: number;
    };
}

export interface AppointmentsByDay {
    date: string;
    scheduled: number;
    completed: number;
    cancelled: number;
}

export interface ServiceRanking {
    name: string;
    count: number;
    income: number;
}

export interface ProfessionalStats {
    name: string;
    count: number;
}

export interface IncomeSummary {
    serviceName: string;
    count: number;
    unitPrice: number;
    total: number;
}
// ============================================
// NUEVO: Interfaz para Pagos
// ============================================
export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface Payment {
    id: string;
    appointment_id: string;
    patient_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    notes?: string;
    created_by: string;
    created_at: string;
}

export type PaymentFormData = Omit<Payment, 'id' | 'created_at' | 'created_by' | 'payment_date'>;
