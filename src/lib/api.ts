import { supabase } from './supabase';
import { Appointment, Patient, Service, User, FichaPodologica, ClinicalNote, PatientFile, ClinicalNoteFormData, ReportKPIs, AppointmentsByDay, ServiceRanking, ProfessionalStats, IncomeSummary, Payment, PaymentFormData } from '../types';

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

        const { error } = await supabase.from('appointments').delete().eq('id', id);
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
    }
};
