import { supabase } from './supabase';
import {
    Patient, Appointment, Service, User, FichaPodologica, ClinicalNote, PatientFile,
    ClinicalNoteFormData, ReportKPIs, AppointmentsByDay, ServiceRanking, ProfessionalStats,
    IncomeSummary, Payment, PaymentFormData, Product, PaymentMethod,
    SaleWithItems, SalesMetrics, ProductReportData
} from '../types';

export const api = {
    // Users (Profiles)
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;
        return data || [];
    },

    getProfile: async (id: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
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
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('patients')
            .insert([{
                name: patient.name,
                cedula: patient.cedula,
                phone: patient.phone,
                email: patient.email,
                history: patient.history,
                address: patient.address,
                birth_date: patient.birth_date,
                created_by: user?.id
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data: patient, error: fetchError } = await supabase
            .from('patients')
            .select('created_by')
            .eq('id', id)
            .single();

        if (fetchError || !patient) throw new Error('Paciente no encontrado');

        const role = profile?.role;
        if (role === 'podologo') {
            if (patient.created_by !== user.id) {
                throw new Error('No tienes permiso para eliminar este paciente (solo puedes eliminar pacientes creados por ti).');
            }
        } else if (role !== 'admin') {
            throw new Error('No tienes permisos suficientes para realizar esta acción.');
        }

        const { error: notesError } = await supabase
            .from('clinical_notes')
            .delete()
            .eq('patient_id', id);
        if (notesError) throw notesError;

        const { error: fichasError } = await supabase
            .from('fichas_podologicas')
            .delete()
            .eq('patient_id', id);
        if (fichasError) throw fichasError;

        const { error: appointmentsError } = await supabase
            .from('appointments')
            .delete()
            .eq('patient_id', id);
        if (appointmentsError) throw appointmentsError;

        const { data: files } = await supabase
            .from('patient_files')
            .select('file_path')
            .eq('patient_id', id);

        if (files && files.length > 0) {
            const filePaths = files.map(f => f.file_path);
            await supabase.storage.from('patient-files').remove(filePaths);

            await supabase
                .from('patient_files')
                .delete()
                .eq('patient_id', id);
        }

        const { error: patientError } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (patientError) throw patientError;
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data: note, error: fetchError } = await supabase
            .from('clinical_notes')
            .select('professional_id')
            .eq('id', id)
            .single();

        if (fetchError || !note) throw new Error('Nota no encontrada');

        const role = profile?.role;
        if (role === 'podologo') {
            if (note.professional_id !== user.id) {
                throw new Error('No tienes permiso para eliminar esta nota (solo puedes eliminar tus propias notas).');
            }
        } else if (role !== 'admin') {
            throw new Error('No tienes permisos suficientes para realizar esta acción.');
        }

        const { error } = await supabase.from('clinical_notes').delete().eq('id', id);
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('patient-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('patient-files')
            .getPublicUrl(filePath);

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
        const { error: storageError } = await supabase.storage
            .from('patient-files')
            .remove([filePath]);

        if (storageError) throw storageError;

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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser.id)
            .single();

        let query = supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(name),
                service:services(name),
                professional:profiles(name)
            `);

        if (profile?.role === 'podologo' && profile.sedes_permitidas && profile.sedes_permitidas.length > 0) {
            query = query.in('sede', profile.sedes_permitidas);
        }

        const { data, error } = await query.order('date', { ascending: true });
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser.id)
            .single();

        if (profile?.role === 'podologo') {
            const permitidas = profile.sedes_permitidas || [];
            if (!permitidas.includes(appointment.sede)) {
                throw new Error(`No tienes permiso para agendar citas en la sede ${appointment.sede}`);
            }
        }

        const appointmentDate = new Date(appointment.date);
        const hour = appointmentDate.getHours();

        if (hour < 8 || hour > 20) {
            throw new Error('Las citas solo pueden agendarse entre las 8:00 y las 20:00');
        }

        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('duration')
            .eq('id', appointment.serviceId)
            .single();

        if (serviceError) throw serviceError;
        const duration = service?.duration || 60;

        const hasOverlap = await api.checkOverlap(
            appointment.sede,
            appointment.date,
            duration
        );

        if (hasOverlap) {
            throw new Error('El horario seleccionado no está disponible (se superpone con otra cita)');
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser.id)
            .single();

        const isPodologo = profile?.role === 'podologo';
        const permitidas = profile?.sedes_permitidas || [];

        // Obtener cita actual
        const { data: currentApt, error: aptError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (aptError) throw aptError;

        if (isPodologo) {
            if (!permitidas.includes(currentApt.sede)) {
                throw new Error(`No tienes permiso para modificar citas en la sede ${currentApt.sede}`);
            }
            if (appointment.sede && !permitidas.includes(appointment.sede)) {
                throw new Error(`No tienes permiso para mover citas a la sede ${appointment.sede}`);
            }
        }

        // Si hay cambio de fecha o servicio, validar traslape
        if (appointment.date || appointment.serviceId || appointment.sede) {
            const newDate = appointment.date || currentApt.date;
            const newServiceId = appointment.serviceId || currentApt.service_id;
            const newSede = appointment.sede || currentApt.sede;

            const { data: service, error: serviceError } = await supabase
                .from('services')
                .select('duration')
                .eq('id', newServiceId)
                .single();

            if (serviceError) throw serviceError;
            const duration = service?.duration || 60;

            const hasOverlap = await api.checkOverlap(
                newSede,
                newDate,
                duration,
                id
            );

            if (hasOverlap) {
                throw new Error('El nuevo horario no está disponible (se superpone con otra cita)');
            }
        }

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

    checkOverlap: async (sede: string, date: string, duration: number, excludeId?: string): Promise<boolean> => {
        const start = new Date(date);
        const end = new Date(start.getTime() + duration * 60000);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('id, date, service:services(duration)')
            .eq('sede', sede)
            .neq('status', 'cancelled');

        if (error) throw error;
        if (!appointments) return false;

        return appointments.some((apt: any) => {
            if (excludeId && apt.id === excludeId) return false;

            const aptStart = new Date(apt.date);
            const aptDuration = apt.service?.duration || 60;
            const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000);

            return (start < aptEnd) && (end > aptStart);
        });
    },

    deleteAppointment: async (id: string) => {
        console.log('🗑️ deleteAppointment llamado con ID:', id);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('professional_id')
            .eq('id', id)
            .single();

        if (fetchError || !appointment) throw new Error('Cita no encontrada');

        if (profile?.role === 'podologo') {
            if (appointment.professional_id !== user.id) {
                throw new Error('No tienes permiso para eliminar esta cita (solo puedes eliminar tus propias citas).');
            }
        } else if (profile?.role !== 'admin') {
            throw new Error('No tienes permisos de administrador para realizar esta acción.');
        }

        // ✅ FIX: Eliminar ventas y pagos asociados antes de eliminar la cita
        // 1. Obtener ventas asociadas a esta cita
        console.log('🔍 Buscando ventas con appointment_id:', id);
        
        // 🔧 CORREGIDO: Eliminada la variable no usada 'salesQueryError'
        const { data: associatedSales } = await supabase
            .from('sales')
            .select('id')
            .eq('appointment_id', id);

        console.log('📊 Ventas encontradas:', associatedSales);

        if (associatedSales && associatedSales.length > 0) {
            const saleIds = associatedSales.map(s => s.id);
            console.log('🗑️ Eliminando sale_items para saleIds:', saleIds);

            // 2. Eliminar sale_items de esas ventas (en cascada manual)
            const { error: itemsError } = await supabase
                .from('sale_items')
                .delete()
                .in('sale_id', saleIds);
            if (itemsError) {
                console.error('❌ Error eliminando sale_items:', itemsError);
                throw itemsError;
            }

            // 3. Eliminar las ventas
            console.log('🗑️ Eliminando ventas con ids:', saleIds);
            const { error: salesError } = await supabase
                .from('sales')
                .delete()
                .in('id', saleIds);
            if (salesError) {
                console.error('❌ Error eliminando ventas:', salesError);
                throw salesError;
            }
        } else {
            console.log('⚠️ No se encontraron ventas asociadas');
        }

        // 4. Eliminar pagos asociados a esta cita
        console.log('🗑️ Eliminando pagos con appointment_id:', id);
        const { error: paymentsError } = await supabase
            .from('payments')
            .delete()
            .eq('appointment_id', id);
        if (paymentsError) {
            console.error('❌ Error eliminando pagos:', paymentsError);
            throw paymentsError;
        }

        // 5. Eliminar la cita
        console.log('🗑️ Eliminando cita con id:', id);
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
            console.error('❌ Error eliminando cita:', error);
            throw error;
        }
        
        console.log('✅ Cita eliminada correctamente');
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
                professional_id: ficha.professional_id,
                appointment_id: ficha.appointment_id,
                fecha: ficha.fecha,
                motivo_consulta: ficha.motivo_consulta,
                enfermedades: ficha.enfermedades,
                tiempo_enfermedad: ficha.tiempo_enfermedad,
                medicacion: ficha.medicacion,
                alergias: ficha.alergias,
                cirugias_miembro_inferior: ficha.cirugias_miembro_inferior,
                otras_enfermedades: ficha.otras_enfermedades,
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
                otras_enfermedades: ficha.otras_enfermedades,
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data: ficha, error: fetchError } = await supabase
            .from('fichas_podologicas')
            .select('professional_id')
            .eq('id', id)
            .single();

        if (fetchError || !ficha) throw new Error('Ficha no encontrada');

        const role = profile?.role;
        if (role === 'podologo') {
            if (ficha.professional_id !== user.id) {
                throw new Error('No tienes permiso para eliminar esta ficha (solo puedes eliminar tus propias fichas).');
            }
        } else if (role !== 'admin') {
            throw new Error('No tienes permisos suficientes para realizar esta acción.');
        }

        const { error } = await supabase.from('fichas_podologicas').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // Pagos
    createPayment: async (paymentData: PaymentFormData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data, error } = await supabase
            .from('payments')
            .insert({
                ...paymentData,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    getPaymentsByAppointment: async (appointmentId: string): Promise<Payment[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('appointment_id', appointmentId);

        if (error) throw error;
        return data || [];
    },

    getPaymentsByPatient: async (patientId: string): Promise<Payment[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('patient_id', patientId)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    deletePayment: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Solo los administradores pueden eliminar pagos.');
        }

        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // Reports
    getReportKPIs: async (startDate: string, endDate: string): Promise<ReportKPIs> => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('No autenticado');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser.id)
            .single();

        const isPodologo = profile?.role === 'podologo';
        const permitidas = profile?.sedes_permitidas || [];

        let patientsQuery = supabase.from('patients').select('*', { count: 'exact', head: true });
        if (isPodologo) {
            patientsQuery = patientsQuery.eq('created_by', authUser.id);
        }
        const { count: totalPatients, error: pError } = await patientsQuery;
        if (pError) throw pError;

        let aptQuery = supabase
            .from('appointments')
            .select('status, sede, service:services(price)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (isPodologo && permitidas.length > 0) {
            aptQuery = aptQuery.in('sede', permitidas);
        }

        const { data: appointments, error: aError } = await aptQuery;
        if (aError) throw aError;

        const totalAppointments = appointments?.length || 0;
        const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;

        const estimatedIncome = appointments?.reduce((sum, a) => {
            if (a.status === 'completed' && a.service) {
                return sum + (a.service as any).price;
            }
            return sum;
        }, 0) || 0;

        let payQuery = supabase
            .from('payments')
            .select('amount, payment_method, appointment:appointments(sede)')
            .gte('payment_date', startDate)
            .lte('payment_date', endDate);

        const { data: rawPayments, error: payError } = await payQuery;
        if (payError) throw payError;

        const payments = isPodologo && permitidas.length > 0
            ? rawPayments?.filter(p => p.appointment && permitidas.includes((p.appointment as any).sede))
            : rawPayments;

        const actualIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        const paymentBreakdown = {
            cash: payments?.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            transfer: payments?.filter(p => p.payment_method === 'transfer').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            card: payments?.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
        };

        return {
            totalPatients: totalPatients || 0,
            totalAppointments,
            completedAppointments,
            estimatedIncome,
            actualIncome,
            paymentBreakdown
        };
    },

    getAppointmentsByDay: async (startDate: string, endDate: string): Promise<AppointmentsByDay[]> => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser?.id)
            .single();

        let query = supabase
            .from('appointments')
            .select('date, status, sede')
            .gte('date', startDate)
            .lte('date', endDate);

        if (profile?.role === 'podologo' && profile.sedes_permitidas && profile.sedes_permitidas.length > 0) {
            query = query.in('sede', profile.sedes_permitidas);
        }

        const { data, error } = await query.order('date', { ascending: true });
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser?.id)
            .single();

        let query = supabase
            .from('appointments')
            .select('status, sede, service:services(name, price)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (profile?.role === 'podologo' && profile.sedes_permitidas && profile.sedes_permitidas.length > 0) {
            query = query.in('sede', profile.sedes_permitidas);
        }

        const { data, error } = await query;
        if (error) throw error;

        const servicesMap: Record<string, ServiceRanking> = {};

        data?.forEach((apt: any) => {
            if (apt.service) {
                const s = apt.service;
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser?.id)
            .single();

        let query = supabase
            .from('appointments')
            .select('sede, professional:profiles(name)')
            .gte('date', startDate)
            .lte('date', endDate);

        if (profile?.role === 'podologo' && profile.sedes_permitidas && profile.sedes_permitidas.length > 0) {
            query = query.in('sede', profile.sedes_permitidas);
        }

        const { data, error } = await query;
        if (error) throw error;

        const profMap: Record<string, ProfessionalStats> = {};

        data?.forEach((apt: any) => {
            if (apt.professional) {
                const p = apt.professional;
                if (!profMap[p.name]) {
                    profMap[p.name] = { name: p.name, count: 0 };
                }
                profMap[p.name].count++;
            }
        });

        return Object.values(profMap).sort((a, b) => b.count - a.count);
    },

    getIncomeSummary: async (startDate: string, endDate: string): Promise<IncomeSummary[]> => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, sedes_permitidas')
            .eq('id', authUser?.id)
            .single();

        let query = supabase
            .from('appointments')
            .select('status, sede, service:services(name, price)')
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('status', 'completed');

        if (profile?.role === 'podologo' && profile.sedes_permitidas && profile.sedes_permitidas.length > 0) {
            query = query.in('sede', profile.sedes_permitidas);
        }

        const { data, error } = await query;
        if (error) throw error;

        const summaryMap: Record<string, IncomeSummary> = {};

        data?.forEach((apt: any) => {
            if (apt.service) {
                const s = apt.service;
                if (!summaryMap[s.name]) {
                    summaryMap[s.name] = { serviceName: s.name, count: 0, unitPrice: s.price, total: 0 };
                }
                summaryMap[s.name].count++;
                summaryMap[s.name].total += s.price;
            }
        });

        return Object.values(summaryMap).sort((a, b) => b.total - a.total);
    },

    // Products
    getProducts: async (): Promise<Product[]> => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    createProduct: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateProduct: async (id: string, product: Partial<Product>) => {
        const { data, error } = await supabase
            .from('products')
            .update(product)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    deleteProduct: async (id: string) => {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    // Sales (POS)
    createSale: async (saleData: {
        patient_id?: string | null;
        appointment_id?: string | null;
        items: { product_id: string; quantity: number; unit_price: number }[];
        payment_method: PaymentMethod;
        service_amount?: number;
        notes?: string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const items_total = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total = items_total + (saleData.service_amount || 0);

        // 1. Create Sale
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([{
                patient_id: saleData.patient_id || null,
                appointment_id: saleData.appointment_id || null,
                total,
                payment_method: saleData.payment_method,
                created_by: user.id
            }])
            .select()
            .single();

        if (saleError) throw saleError;

        // 2. Create Sale Items & Update Stock
        for (const item of saleData.items) {
            // Add item
            const { error: itemError } = await supabase
                .from('sale_items')
                .insert([{
                    sale_id: sale.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }]);

            if (itemError) throw itemError;

            // Update stock (RPC would be better, but doing it sequentially here)
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product) {
                await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.product_id);
            }
        }

        // 3. Create Payment record
        await api.createPayment({
            amount: total,
            payment_method: saleData.payment_method,
            patient_id: saleData.patient_id || undefined,
            appointment_id: saleData.appointment_id || undefined,
            notes: saleData.notes || `Venta #${sale.id.slice(0, 8)}`
        });

        return sale;
    },

    getSales: async (): Promise<SaleWithItems[]> => {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                patient:patients(name),
                items:sale_items(
                    *,
                    product:products(name, category)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((s: any) => ({
            ...s,
            patient_name: s.patient?.name || 'Mostrador',
            items: (s.items || []).map((item: any) => ({
                ...item,
                product_name: item.product?.name || 'Producto Elminiado',
                category: item.product?.category || 'General'
            }))
        }));
    },

    getSalesDashboardMetrics: async (startDate: string, endDate: string): Promise<SalesMetrics> => {
        // Para la comparativa, necesitamos el periodo anterior (mismo largo de tiempo)
        const currentStart = new Date(startDate);
        const currentEnd = new Date(endDate);
        const duration = currentEnd.getTime() - currentStart.getTime();

        const prevStart = new Date(currentStart.getTime() - duration - 1000).toISOString();
        const prevEnd = new Date(currentStart.getTime() - 1000).toISOString();

        // 1. Fetch current and previous period sales
        // ✅ FIX: Filtrar por created_at (la tabla sales no tiene columna 'date' separada)
        const [{ data: salesData }, { data: prevSalesData }] = await Promise.all([
            supabase.from('sales').select('*, items:sale_items(*, product:products(name, category))')
                .gte('created_at', startDate).lte('created_at', endDate),
            supabase.from('sales').select('*, items:sale_items(*, product:products(name, category))')
                .gte('created_at', prevStart).lte('created_at', prevEnd)
        ]);

        const processSales = (data: any[] | null) => {
            let total = 0, citas = 0, meds = 0, otros = 0;
            let totalCnt = 0, citasCnt = 0, medsCnt = 0, otrosCnt = 0;
            const revenueByDayMap: Record<string, { total: number; meds: number; citas: number; otros: number }> = {};
            const catMap: Record<string, number> = {};
            const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
            const recent: any[] = [];

            data?.forEach((sale: any) => {
                if (sale.status === 'cancelled') return;

                // ✅ FIX: usar created_at como fuente de fecha canónica
                const saleDate = (sale.created_at || '').split('T')[0];
                if (!revenueByDayMap[saleDate]) {
                    revenueByDayMap[saleDate] = { total: 0, meds: 0, citas: 0, otros: 0 };
                }

                totalCnt++;

                // Citas (Servicios)
                const serviceAmount = sale.service_amount || (sale.total - (sale.items?.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0) || 0));
                const sAmt = Math.max(0, serviceAmount);
                if (sAmt > 0) {
                    citas += sAmt;
                    citasCnt++;
                    revenueByDayMap[saleDate].citas += sAmt;
                    revenueByDayMap[saleDate].total += sAmt;
                    total += sAmt;
                }

                sale.items?.forEach((item: any) => {
                    const itemTotal = item.quantity * item.unit_price;
                    const cat = item.product?.category || 'General';
                    const isMed = cat.toLowerCase().includes('medicamento');
                    const name = item.product?.name || 'Producto Eliminado';

                    if (isMed) {
                        meds += itemTotal;
                        medsCnt += item.quantity;
                        revenueByDayMap[saleDate].meds += itemTotal;
                    } else {
                        otros += itemTotal;
                        otrosCnt += item.quantity;
                        revenueByDayMap[saleDate].otros += itemTotal;
                    }

                    revenueByDayMap[saleDate].total += itemTotal;
                    total += itemTotal;
                    catMap[cat] = (catMap[cat] || 0) + itemTotal;

                    if (!prodMap[item.product_id]) prodMap[item.product_id] = { name, quantity: 0, revenue: 0 };
                    prodMap[item.product_id].quantity += item.quantity;
                    prodMap[item.product_id].revenue += itemTotal;

                    recent.push({
                        name,
                        quantity: item.quantity,
                        date: sale.date,
                        category: cat,
                        price: item.unit_price,
                        type: isMed ? 'med' : 'prod'
                    });
                });

                // Si fue una cita sin items, agregar a recientes
                if (sAmt > 0 && (!sale.items || sale.items.length === 0)) {
                    recent.push({
                        name: 'Servicio Podológico',
                        quantity: 1,
                        date: sale.date,
                        category: 'Cita',
                        price: sAmt,
                        type: 'cita'
                    });
                }
            });

            return { total, citas, meds, otros, totalCnt, citasCnt, medsCnt, otrosCnt, revenueByDayMap, catMap, prodMap, recent };
        };

        const current = processSales(salesData || []);
        const previous = processSales(prevSalesData || []);

        const revenueByDay = Object.keys(current.revenueByDayMap).sort().map(date => ({
            date,
            total: current.revenueByDayMap[date].total,
            medications: current.revenueByDayMap[date].meds,
            citas: current.revenueByDayMap[date].citas,
            otros: current.revenueByDayMap[date].otros
        }));

        const revenueByCategory = Object.entries(current.catMap)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);

        return {
            totalRevenue: current.total,
            citasRevenue: current.citas,
            medicationsRevenue: current.meds,
            otrosRevenue: current.otros,
            totalSalesCount: current.totalCnt,
            citasCount: current.citasCnt,
            medicationsCount: current.medsCnt,
            otrosCount: current.otrosCnt,
            comparison: {
                totalRevenueDelta: current.total - previous.total,
                citasRevenueDelta: current.citas - previous.citas,
                medicationsRevenueDelta: current.meds - previous.meds,
                otrosRevenueDelta: current.otros - previous.otros
            },
            topProducts: Object.values(current.prodMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
            revenueByDay,
            revenueByCategory,
            recentProducts: current.recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
        };
    },

    getProductReportData: async (startDate: string, endDate: string): Promise<ProductReportData[]> => {
        const { data: products, error: prodErr } = await supabase.from('products').select('*');
        if (prodErr) throw prodErr;

        // ✅ FIX: Filtrar por created_at en lugar del campo 'date' inexistente
        const { data: salesData, error: salesErr } = await supabase
            .from('sales')
            .select(`
                status,
                items:sale_items(
                    product_id,
                    quantity,
                    unit_price
                )
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (salesErr) throw salesErr;

        const salesMap: Record<string, { quantity: number; revenue: number }> = {};
        salesData?.forEach((sale: any) => {
            if (sale.status === 'cancelled') return;

            sale.items?.forEach((item: any) => {
                if (!salesMap[item.product_id]) {
                    salesMap[item.product_id] = { quantity: 0, revenue: 0 };
                }
                salesMap[item.product_id].quantity += item.quantity;
                salesMap[item.product_id].revenue += item.quantity * item.unit_price;
            });
        });

        return (products || []).map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            stock: p.stock,
            soldQuantity: salesMap[p.id]?.quantity || 0,
            revenue: salesMap[p.id]?.revenue || 0
        })).sort((a, b) => b.soldQuantity - a.soldQuantity);
    },

    // Export Data Helpers
    getPatientsForExport: async () => {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    getReportSummaryForExport: async (startDate: string, endDate: string) => {
        const kpis = await api.getReportKPIs(startDate, endDate);
        const daily = await api.getAppointmentsByDay(startDate, endDate);
        const services = await api.getServicesRanking(startDate, endDate);
        return { kpis, daily, services };
    },

    getPatientHistoryForExport: async (patientId: string) => {
        const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
        const appointments = await api.getAppointments();
        const patientAppointments = appointments.filter(a => a.patientId === patientId);
        const notes = await api.getClinicalNotes(patientId);
        const fichas = await api.getFichasByPatient(patientId);

        return { patient, appointments: patientAppointments, notes, fichas };
    },

    cancelSale: async (saleId: string, reason?: string, cancelledBy?: string) => {
        // 1. Get sale items to rollback stock
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('product_id, quantity')
            .eq('sale_id', saleId);

        if (itemsError) throw itemsError;

        // 2. Mark sale as cancelled with audit data
        const { error: updateError } = await supabase
            .from('sales')
            .update({
                status: 'cancelled',
                cancel_reason: reason || 'Anulación manual',
                cancelled_at: new Date().toISOString(),
                cancelled_by: cancelledBy
            })
            .eq('id', saleId);

        if (updateError) throw updateError;

        // 3. Rollback stock (Sequential update for simplicity)
        if (saleItems && saleItems.length > 0) {
            for (const item of saleItems) {
                const { data: currentProduct } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();

                if (currentProduct) {
                    await supabase
                        .from('products')
                        .update({ stock: currentProduct.stock + item.quantity })
                        .eq('id', item.product_id);
                }
            }
        }
    }
};