import { supabase } from './supabase';
import { Appointment, Patient, Service, User, FichaPodologica } from '../types';

export const api = {
    // Users (Profiles)
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;
        return data || [];
    },

    // Services
    getServices: async (): Promise<Service[]> => {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    createService: async (service: Omit<Service, 'id'>) => {
        const { data, error } = await supabase
            .from('services')
            .insert([{
                name: service.name,
                duration: service.duration,
                price: service.price,
                available_sedes: service.available_sedes  // ← CAMBIADO
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateService: async (id: string, service: Partial<Service>) => {
        const { data, error } = await supabase
            .from('services')
            .update({
                name: service.name,
                duration: service.duration,
                price: service.price,
                available_sedes: service.available_sedes  // ← CAMBIADO
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteService: async (id: string) => {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Patients
    getPatients: async (): Promise<Patient[]> => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getPatient: async (id: string): Promise<Patient | null> => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    createPatient: async (patient: Omit<Patient, 'id' | 'createdAt'>) => {
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                name: patient.name,
                cedula: patient.cedula,
                phone: patient.phone,
                email: patient.email,
                history: patient.history
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updatePatient: async (id: string, patient: Partial<Patient>) => {
        const { data, error } = await supabase
            .from('patients')
            .update(patient)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deletePatient: async (id: string) => {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Appointments
    getAppointments: async (): Promise<Appointment[]> => {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(name),
                service:services(name),
                professional:profiles(name)
            `)
            .order('date', { ascending: true });

        if (error) throw error;

        return (data || []).map((apt: any) => ({
            id: apt.id,
            patientId: apt.patient_id,
            patientName: apt.patient?.name || 'Desconocido',
            serviceId: apt.service_id,
            serviceName: apt.service?.name || 'Servicio',
            professionalId: apt.professional_id,
            professionalName: apt.professional?.name || 'Doctor',
            sede: apt.sede,
            date: apt.date,
            status: apt.status,
            notes: apt.notes
        }));
    },

    createAppointment: async (appointment: Omit<Appointment, 'id' | 'patientName' | 'serviceName' | 'professionalName'>) => {
        const { data, error } = await supabase
            .from('appointments')
            .insert([{
                patient_id: appointment.patientId,
                service_id: appointment.serviceId,
                professional_id: appointment.professionalId,
                sede: appointment.sede,
                date: appointment.date,
                status: appointment.status,
                notes: appointment.notes
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateAppointment: async (id: string, appointment: Partial<Appointment>) => {
        const updateData: any = {};
        if (appointment.patientId) updateData.patient_id = appointment.patientId;
        if (appointment.serviceId) updateData.service_id = appointment.serviceId;
        if (appointment.professionalId) updateData.professional_id = appointment.professionalId;
        if (appointment.sede) updateData.sede = appointment.sede;
        if (appointment.date) updateData.date = appointment.date;
        if (appointment.status) updateData.status = appointment.status;
        if (appointment.notes !== undefined) updateData.notes = appointment.notes;

        const { data, error } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteAppointment: async (id: string) => {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Fichas Podológicas
    getFichasByPatient: async (patientId: string): Promise<FichaPodologica[]> => {
        const { data, error } = await supabase
            .from('fichas_podologicas')
            .select('*')
            .eq('patient_id', patientId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getFicha: async (id: string): Promise<FichaPodologica | null> => {
        const { data, error } = await supabase
            .from('fichas_podologicas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    createFicha: async (ficha: Omit<FichaPodologica, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('fichas_podologicas')
            .insert([{
                patient_id: ficha.patient_id,
                appointment_id: ficha.appointment_id,
                fecha: ficha.fecha,
                motivo_consulta: ficha.motivo_consulta,
                enfermedades: ficha.enfermedades,
                tiempo_enfermedad: ficha.tiempo_enfermedad,
                medicacion: ficha.medicacion,
                alergias: ficha.alergias,
                cirugias_miembro_inferior: ficha.cirugias_miembro_inferior,
                diagnostico_pie_derecho: ficha.diagnostico_pie_derecho,
                diagnostico_pie_izquierdo: ficha.diagnostico_pie_izquierdo,
                observaciones: ficha.observaciones,
                firma_paciente: ficha.firma_paciente,
                firma_profesional: ficha.firma_profesional
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateFicha: async (id: string, ficha: Partial<FichaPodologica>) => {
        const { data, error } = await supabase
            .from('fichas_podologicas')
            .update({
                fecha: ficha.fecha,
                motivo_consulta: ficha.motivo_consulta,
                enfermedades: ficha.enfermedades,
                tiempo_enfermedad: ficha.tiempo_enfermedad,
                medicacion: ficha.medicacion,
                alergias: ficha.alergias,
                cirugias_miembro_inferior: ficha.cirugias_miembro_inferior,
                diagnostico_pie_derecho: ficha.diagnostico_pie_derecho,
                diagnostico_pie_izquierdo: ficha.diagnostico_pie_izquierdo,
                observaciones: ficha.observaciones,
                firma_paciente: ficha.firma_paciente,
                firma_profesional: ficha.firma_profesional
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteFicha: async (id: string) => {
        const { error } = await supabase
            .from('fichas_podologicas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};