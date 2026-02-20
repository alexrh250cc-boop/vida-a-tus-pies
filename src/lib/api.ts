import { supabase } from './supabase';
import { Appointment, Patient, Service, User, FichaPodologica, ClinicalNote, PatientFile, ClinicalNoteFormData, ReportKPIs, AppointmentsByDay, ServiceRanking, ProfessionalStats, IncomeSummary } from '../types';

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
                available_sedes: service.available_sedes
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
                available_sedes: service.available_sedes
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
                history: patient.history,
                address: patient.address,
                birth_date: patient.birth_date
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updatePatient: async (id: string, patient: Partial<Patient>) => {
        const { data, error } = await supabase
            .from('patients')
            .update({
                name: patient.name,
                cedula: patient.cedula,
                phone: patient.phone,
                email: patient.email,
                history: patient.history,
                address: patient.address,
                birth_date: patient.birth_date
            })
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

    // Clinical Notes
    getClinicalNotes: async (patientId: string): Promise<ClinicalNote[]> => {
        const { data, error } = await supabase
            .from('clinical_notes')
            .select(`
                *,
                professional:profiles(name)
            `)
            .eq('patient_id', patientId)
            .order('note_date', { ascending: false });

        if (error) throw error;

        return (data || []).map((note: any) => ({
            ...note,
            professional_name: note.professional?.name
        }));
    },

    createClinicalNote: async (note: ClinicalNoteFormData) => {
        const { data, error } = await supabase
            .from('clinical_notes')
            .insert([{
                patient_id: note.patient_id,
                professional_id: note.professional_id,
                title: note.title,
                content: note.content,
                note_date: note.note_date
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateClinicalNote: async (id: string, note: Partial<ClinicalNote>) => {
        const { data, error } = await supabase
            .from('clinical_notes')
            .update({
                title: note.title,
                content: note.content,
                note_date: note.note_date
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteClinicalNote: async (id: string) => {
        const { error } = await supabase
            .from('clinical_notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Patient Files
    getPatientFiles: async (patientId: string): Promise<PatientFile[]> => {
        const { data, error } = await supabase
            .from('patient_files')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    uploadPatientFile: async (patientId: string, file: File) => {
        // Generar nombre único para el archivo
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        // Subir archivo a Storage
        const { error: uploadError } = await supabase.storage
            .from('patient-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('patient-files')
            .getPublicUrl(filePath);

        // Guardar referencia en la base de datos
        const { data, error } = await supabase
            .from('patient_files')
            .insert([{
                patient_id: patientId,
                name: file.name,
                file_path: filePath,
                file_type: file.type,
                file_size: file.size
            }])
            .select()
            .single();

        if (error) throw error;
        return { ...data, publicUrl };
    },

    deletePatientFile: async (id: string, filePath: string) => {
        // Eliminar de Storage
        const { error: storageError } = await supabase.storage
            .from('patient-files')
            .remove([filePath]);

        if (storageError) throw storageError;

        // Eliminar de la base de datos
        const { error } = await supabase
            .from('patient_files')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    getFilePublicUrl: (filePath: string): string => {
        const { data } = supabase.storage
            .from('patient-files')
            .getPublicUrl(filePath);
        return data.publicUrl;
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
        // Validar que la hora esté entre 8 y 20
        const appointmentDate = new Date(appointment.date);
        const hour = appointmentDate.getHours();

        if (hour < 8 || hour > 20) {
            throw new Error('Las citas solo pueden agendarse entre las 8:00 y las 20:00');
        }

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
    },

    // Reports
    getReportKPIs: async (startDate: string, endDate: string): Promise<ReportKPIs> => {
        // Total Patients (Total historical, not necessarily in range, but user asked for KPIs)
        // Usually, total patients is historical, but range might apply to new ones.
        // Let's get total patients historical for now as it's a general KPI.
        const { count: totalPatients, error: pError } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true });

        if (pError) throw pError;

        // Total Appointments in range
        const { data: appointments, error: aError } = await supabase
            .from('appointments')
            .select('status, service:services(price)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (aError) throw aError;

        const totalAppointments = appointments?.length || 0;
        const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;

        const estimatedIncome = appointments?.reduce((sum, a) => {
            if (a.status === 'completed' && a.service) {
                return sum + (a.service as any).price;
            }
            return sum;
        }, 0) || 0;

        return {
            totalPatients: totalPatients || 0,
            totalAppointments,
            completedAppointments,
            estimatedIncome
        };
    },

    getAppointmentsByDay: async (startDate: string, endDate: string): Promise<AppointmentsByDay[]> => {
        const { data, error } = await supabase
            .from('appointments')
            .select('date, status')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;

        const daysMap: Record<string, AppointmentsByDay> = {};

        data?.forEach(apt => {
            const day = apt.date.split('T')[0];
            if (!daysMap[day]) {
                daysMap[day] = { date: day, scheduled: 0, completed: 0, cancelled: 0 };
            }
            if (apt.status === 'scheduled') daysMap[day].scheduled++;
            else if (apt.status === 'completed') daysMap[day].completed++;
            else if (apt.status === 'cancelled') daysMap[day].cancelled++;
        });

        return Object.values(daysMap);
    },

    getServicesRanking: async (startDate: string, endDate: string): Promise<ServiceRanking[]> => {
        const { data, error } = await supabase
            .from('appointments')
            .select('status, service:services(name, price)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;

        const servicesMap: Record<string, ServiceRanking> = {};

        data?.forEach(apt => {
            if (apt.service) {
                const s = apt.service as any;
                if (!servicesMap[s.name]) {
                    servicesMap[s.name] = { name: s.name, count: 0, income: 0 };
                }
                servicesMap[s.name].count++;
                if (apt.status === 'completed') {
                    servicesMap[s.name].income += s.price;
                }
            }
        });

        return Object.values(servicesMap).sort((a, b) => b.count - a.count);
    },

    getAppointmentsByProfessional: async (startDate: string, endDate: string): Promise<ProfessionalStats[]> => {
        const { data, error } = await supabase
            .from('appointments')
            .select('professional:profiles(name)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;

        const profMap: Record<string, ProfessionalStats> = {};

        data?.forEach(apt => {
            if (apt.professional) {
                const p = apt.professional as any;
                if (!profMap[p.name]) {
                    profMap[p.name] = { name: p.name, count: 0 };
                }
                profMap[p.name].count++;
            }
        });

        return Object.values(profMap).sort((a, b) => b.count - a.count);
    },

    getIncomeSummary: async (startDate: string, endDate: string): Promise<IncomeSummary[]> => {
        const { data, error } = await supabase
            .from('appointments')
            .select('status, service:services(name, price)')
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('status', 'completed');

        if (error) throw error;

        const summaryMap: Record<string, IncomeSummary> = {};

        data?.forEach(apt => {
            if (apt.service) {
                const s = apt.service as any;
                if (!summaryMap[s.name]) {
                    summaryMap[s.name] = { serviceName: s.name, count: 0, unitPrice: s.price, total: 0 };
                }
                summaryMap[s.name].count++;
                summaryMap[s.name].total += s.price;
            }
        });

        return Object.values(summaryMap).sort((a, b) => b.total - a.total);
    }
};