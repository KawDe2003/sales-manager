import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Modern, well-designed Document PDF Generator for Invoices and Quotations
export const generateDocumentPDF = (type, documentData, items) => {
  try {
    const doc = new jsPDF();

    // Load company config from localStorage
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro';
    const companyAddress = savedConfig.companyAddress || 'Seynex Technologies';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';
    const companyPhone = savedConfig.companyPhone || '';

    // Modern color palette
    const primaryColor = [99, 102, 241]; // Indigo-500
    const accentColor = [248, 250, 252]; // Slate-50
    const textColor = [30, 41, 59]; // Slate-800
    const subTextColor = [100, 116, 139]; // Slate-500

    const isInvoice = type?.toLowerCase().includes('invoice');
    const docTitle = isInvoice ? 'INVOICE' : 'QUOTATION';

    const docNumber = (isInvoice ? documentData?.invoiceNumber : documentData?.quoteNumber) || 'N/A';
    const targetName = (isInvoice ? (documentData?.gymName || documentData?.prospectName) : (documentData?.prospectName || documentData?.gymName)) || 'Valued Client';
    const targetPhone = documentData?.prospectPhone || '';
    const dateStr = documentData?.date ? new Date(documentData.date).toLocaleDateString() : '—';
    const dueDateStr = documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : '—';

    const itemsList = Array.isArray(items) && items.length > 0 ? items : (documentData?.items || []);
    const totalAmount = itemsList.length > 0
      ? itemsList.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
      : Number(documentData?.amount || 0);

    // ── Header Style Block ───────────────────────────────────────────────────
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F'); // Full width header background

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(companyName, 14, 25);

    doc.setFontSize(24);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(docTitle, 196, 25, { align: 'right' });

    // ── Company Details (Top Left) ──────────────────────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
    doc.setFont("helvetica", "normal");
    let cy = 50;
    doc.text(companyAddress, 14, cy);
    doc.text(`Email: ${companyEmail}`, 14, cy + 5);
    if (companyPhone) doc.text(`Phone: ${companyPhone}`, 14, cy + 10);

    // ── Document Details (Top Right) ─────────────────────────────────────────
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(120, 45, 76, 25, 3, 3, 'FD'); // Box around doc details

    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${isInvoice ? 'Invoice' : 'Quote'} No:`, 124, 52);
    doc.setFont("helvetica", "normal");
    doc.text(docNumber, 192, 52, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text(`Date:`, 124, 59);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, 192, 59, { align: 'right' });

    if (isInvoice) {
      doc.setFont("helvetica", "bold");
      doc.text(`Due Date:`, 124, 66);
      doc.setFont("helvetica", "normal");
      doc.text(dueDateStr, 192, 66, { align: 'right' });
    }

    // ── Bill To ───────────────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('PREPARED FOR:', 14, 75);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(14);
    doc.text(targetName, 14, 82);
    
    if (targetPhone) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
      doc.text(`Contact: ${targetPhone}`, 14, 88);
    }

    // ── Line Items Table ──────────────────────────────────────────────────────
    let tableBody = [];
    if (itemsList.length > 0) {
      tableBody = itemsList.map(item => {
        const itemDesc = item.isSubscription ? `[SOFTWARE LICENSE] ${item.name}` : (item.name || 'Item');
        return [
          itemDesc,
          item.type || 'Service',
          `LKR ${Number(item.price || 0).toLocaleString()}`,
          String(item.quantity || 1),
          `LKR ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}`
        ];
      });
    } else {
      tableBody = [
        ['Software Package / Services', 'Package', `LKR ${totalAmount.toLocaleString()}`, '1', `LKR ${totalAmount.toLocaleString()}`]
      ];
    }

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Type', 'Unit Price', 'Qty', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold', textColor: primaryColor }
      },
      styles: { fontSize: 10, textColor: textColor, cellPadding: 6 },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
      margin: { top: 10 }
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    const finalY = (doc.lastAutoTable?.finalY || 120) + 10;

    // Background for totals
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(120, finalY, 76, 20, 3, 3, 'F');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text('Total Amount:', 124, finalY + 12);

    doc.setFontSize(14);
    doc.text(`LKR ${totalAmount.toLocaleString()}`, 192, finalY + 12, { align: 'right' });

    // ── Footer ────────────────────────────────────────────────────────────────
    const pageHeight = doc.internal.pageSize.height;
    
    // ── Bank Account / Verification ──────────────────────────────────────────
    if (isInvoice && savedConfig.bankDetails) {
      const bankY = pageHeight - 45;
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text('PAYMENT INSTRUCTIONS:', 14, bankY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
      doc.text(`Bank: ${savedConfig.bankDetails.bank} | Branch: ${savedConfig.bankDetails.branch}`, 14, bankY + 6);
      doc.text(`A/C Name: ${savedConfig.bankDetails.accountName}`, 14, bankY + 11);
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`Account No: ${savedConfig.bankDetails.accountNumber}`, 14, bankY + 16);
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 20, 196, pageHeight - 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
    doc.text(
      isInvoice
        ? 'Thank you for your business. Please process payment promptly.'
        : 'This quotation is valid for 30 days from the date issued.',
      105,
      pageHeight - 12,
      { align: 'center' }
    );

    // ── Save ──────────────────────────────────────────────────────────────────
    const safeFileName = `${docNumber}_${(targetName).replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(safeFileName);

  } catch (err) {
    console.error('PDF generation error details:', err.message, err.stack);
    alert(`Could not generate PDF: ${err.message || 'Unknown error'}. Please check the console.`);
  }
};

// Report Generator for Analytics
export const generateReportsPDF = (reportData) => {
  try {
    const doc = new jsPDF();
    const primaryColor = [16, 185, 129]; // Emerald 500 for the success theme
    const textColor = [30, 41, 59];
    
    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Sales & Analytics Report", 14, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 196, 25, { align: 'right' });

    // Executive Summary
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 14, 55);

    // KPI Blocks
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 60, 85, 25, 3, 3, 'FD');
    doc.roundedRect(111, 60, 85, 25, 3, 3, 'FD');
    doc.roundedRect(14, 90, 85, 25, 3, 3, 'FD');
    doc.roundedRect(111, 90, 85, 25, 3, 3, 'FD');

    const kpis = [
      { label: "Total Revenue", val: `LKR ${reportData.totalRevenue.toLocaleString()}`, x: 18, y: 70 },
      { label: "Net Profit", val: `LKR ${reportData.netProfit.toLocaleString()}`, x: 115, y: 70 },
      { label: "Total Expenses", val: `LKR ${reportData.totalExpenses.toLocaleString()}`, x: 18, y: 100 },
      { label: "Active Gyms", val: reportData.activeGyms?.toString(), x: 115, y: 100 }
    ];

    kpis.forEach(kpi => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, kpi.x, kpi.y);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(kpi.val, kpi.x, kpi.y + 8);
    });

    // Funnel & Pipeline
    doc.setFontSize(16);
    doc.text("Sales Funnel & Metrics", 14, 130);

    const funnelData = [
      ['Metric', 'Value'],
      ['Total Leads', reportData.totalLeads?.toString() || '0'],
      ['Quotes Generated', reportData.convertedLeads?.toString() || '0'],
      ['Conversion Rate', `${reportData.conversionRate || 0}%`]
    ];

    autoTable(doc, {
      startY: 135,
      head: [funnelData[0]],
      body: funnelData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, // Blue
      margin: { left: 14, right: 111 } // Half width
    });

    autoTable(doc, {
      startY: 135,
      head: [['Top Clients', 'Spend']],
      body: reportData.topClients.map(c => [c[0], `LKR ${c[1].toLocaleString()}`]),
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] }, // Violet
      margin: { left: 111, right: 14 }
    });

    // Monthly Data
    if (reportData.monthlyData && reportData.monthlyData.length > 0) {
      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 160) + 15,
        head: [['Month', 'Revenue']],
        body: reportData.monthlyData.map(m => [m.label, `LKR ${m.total.toLocaleString()}`]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor }
      });
    }

    doc.save("Sales_Manager_Analytics_Report.pdf");

  } catch (err) {
    console.error('Report Generation Error:', err);
    alert('Failed to generate report PDF.');
  }
};
