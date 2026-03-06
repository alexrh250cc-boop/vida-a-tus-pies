import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extend jsPDF with autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, `${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};

export const exportPatientHistoryToPDF = (historyData: any) => {
    const doc = new jsPDF();
    const { patient, appointments, notes } = historyData;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('Historia Clínica - VIDA A TUS PIES', 105, 20, { align: 'center' });

    // Patient Info
    doc.setFontSize(14);
    doc.text('Información del Paciente', 14, 35);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nombre: ${patient.name}`, 14, 45);
    doc.text(`Cédula: ${patient.cedula}`, 14, 50);
    doc.text(`Teléfono: ${patient.phone}`, 14, 55);
    doc.text(`Correo: ${patient.email}`, 14, 60);

    // Appointments Table
    if (appointments && appointments.length > 0) {
        doc.setFontSize(14);
        doc.text('Historial de Citas', 14, 75);
        doc.autoTable({
            startY: 80,
            head: [['Fecha', 'Servicio', 'Sede', 'Estado']],
            body: appointments.map((apt: any) => [
                format(new Date(apt.date), 'dd/MM/yyyy HH:mm'),
                apt.serviceName,
                apt.sede,
                apt.status
            ]),
            theme: 'striped'
        });
    }

    // Notes
    let finalY = (doc as any).lastAutoTable.finalY + 15 || 100;
    if (notes && notes.length > 0) {
        doc.setFontSize(14);
        doc.text('Notas Evolutivas', 14, finalY);
        doc.setFontSize(10);
        notes.forEach((note: any) => {
            finalY += 10;
            if (finalY > 270) { doc.addPage(); finalY = 20; }
            doc.text(`${format(new Date(note.created_at), 'dd/MM/yyyy')}: ${note.content}`, 14, finalY, { maxWidth: 180 });
        });
    }

    doc.save(`Historia_${patient.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportReportToPDF = (reportData: any) => {
    const doc = new jsPDF();
    const { kpis, serviceData } = reportData;

    doc.setFontSize(22);
    doc.setTextColor(0, 102, 204);
    doc.text('Reporte de Gestión - VIDA A TUS PIES', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, 105, 28, { align: 'center' });

    // KPIs Section
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Resumen de Indicadores (KPIs)', 14, 45);

    doc.autoTable({
        startY: 50,
        head: [['Métrica', 'Valor']],
        body: [
            ['Total Citas', kpis.totalAppointments],
            ['Ingresos Totales (Estimados)', `$${kpis.totalRevenue.toLocaleString()}`],
            ['Ingresos Reales (Caja)', `$${kpis.actualRevenue.toLocaleString()}`],
            ['Citas Completadas', kpis.completedAppointments],
            ['Nuevos Pacientes', kpis.newPatients]
        ],
        theme: 'grid'
    });

    // Top Services
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Servicios Más Solicitados', 14, finalY);
    doc.autoTable({
        startY: finalY + 5,
        head: [['Servicio', 'Cantidad']],
        body: serviceData.map((s: any) => [s.name, s.value]),
        theme: 'striped'
    });

    doc.save(`Reporte_VidaATusPies_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
