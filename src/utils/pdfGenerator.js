import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Robust Universal jsPDF Constructor (supports jspdf v3/v4 in Vite & Node ESM)
export const createPDFDoc = (options) => {
  const Constructor = typeof jsPDF === 'function' ? jsPDF : (jsPDF?.jsPDF || jsPDF?.default);
  if (typeof Constructor === 'function') {
    return new Constructor(options);
  }
  throw new Error('Unable to initialize jsPDF engine.');
};

// Robust Universal autoTable Runner
export const runAutoTable = (doc, options) => {
  const fn = typeof autoTable === 'function' ? autoTable : (autoTable?.default || autoTable?.autoTable);
  if (!fn) throw new Error('jspdf-autotable plugin not loaded.');
  return fn(doc, options);
};

// Helper for converting hex color code to RGB array
export const hexToRgb = (hex, defaultRgb = [59, 130, 246]) => {
  if (!hex) return defaultRgb;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : defaultRgb;
};

// Formatting Helpers (Moved to Top for Universal Availability)
export const formatLKR = (val) => {
  const num = Number(val || 0);
  return 'LKR ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDatePretty = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Helper: Apply Professional Header & Repeating Page Footers (Zero Overlap Guaranteed)
export const applyPageHeaderFooter = (doc, { title, subtitle, docNumber, pageCount, companyConfig = {}, primaryColor = [16, 185, 129] }) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Page Footer Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    
    const rawCompany = companyConfig.companyName || companyConfig.dashboardName || 'Seynex Technology';
    const footerCompany = rawCompany.replace(/GymSales\s*(Pro)?/gi, 'Seynex Technology').trim();
    
    // Left: Company & Audit generation date (no center collision)
    doc.text(`${footerCompany} • Audit Generated: ${formatDatePretty(new Date())}`, 14, pageHeight - 8);
    // Right: Page counter cleanly right-aligned at margin
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
};

// Universal Bulletproof Download Trigger with Strict PDF Extension & Real Filename Guarantee
export const savePdfDoc = (doc, fileName) => {
  // 1. Ensure strict .pdf extension
  let safeName = String(fileName || 'document.pdf').trim();
  if (!safeName.toLowerCase().endsWith('.pdf')) {
    safeName = `${safeName}.pdf`;
  }
  // Sanitize filename for all operating systems (Windows, Mac, Linux)
  safeName = safeName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  if (!safeName.toLowerCase().endsWith('.pdf')) {
    safeName = `${safeName}.pdf`;
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 2. Primary Method: Base64 Data URI with explicit application/pdf and embedded filename header
    // WHY THIS WORKS: In Chromium / Windows Chrome, downloading from a `blob:` URL
    // (blob:http://localhost:5173/<uuid>) frequently causes download managers or Chrome's
    // download pipeline to discard the anchor 'download' attribute and name the file after
    // the internal Blob UUID (e.g. 2d9037c2-152f-4ddf-bd54-353b76757563) with no extension!
    // A Base64 Data URI contains NO blob UUID. It forces the browser to use the explicit filename.
    try {
      const rawUri = doc.output('datauristring');
      if (rawUri && typeof rawUri === 'string' && rawUri.startsWith('data:')) {
        // Embed the sanitized safeName into the Data URI header
        const customDataUri = rawUri.replace(
          /filename=[^;]+/,
          `filename=${encodeURIComponent(safeName)}`
        );

        const a = document.createElement('a');
        a.style.position = 'fixed';
        a.style.left = '-9999px';
        a.style.top = '-9999px';
        a.style.opacity = '0';
        a.style.pointerEvents = 'none';
        a.href = customDataUri;
        a.setAttribute('download', safeName);
        a.download = safeName;

        document.body.appendChild(a);

        // Click trigger
        if (typeof a.click === 'function') {
          a.click();
        } else {
          const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
          a.dispatchEvent(evt);
        }

        setTimeout(() => {
          if (a.parentNode) {
            document.body.removeChild(a);
          }
        }, 3000);
        return true;
      }
    } catch (dataUriErr) {
      console.warn('Data URI PDF export failed, falling back to secondary method:', dataUriErr);
    }

    // 3. Secondary Fallback: Windows msSaveOrOpenBlob (legacy Edge / IE)
    try {
      const rawBlob = doc.output('blob');
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(rawBlob, safeName);
        return true;
      }

      // 4. Tertiary Fallback: Blob URL
      const blobUrl = (window.URL || window.webkitURL).createObjectURL(rawBlob);
      const a = document.createElement('a');
      a.style.position = 'fixed';
      a.style.left = '-9999px';
      a.style.top = '-9999px';
      a.style.opacity = '0';
      a.href = blobUrl;
      a.setAttribute('download', safeName);
      a.download = safeName;

      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        (window.URL || window.webkitURL).revokeObjectURL(blobUrl);
      }, 60000);
      return true;
    } catch (blobErr) {
      console.warn('Blob PDF export failed, falling back to doc.save:', blobErr);
    }
  }

  // 5. Ultimate Fallback: Engine internal save
  if (typeof doc?.save === 'function') {
    doc.save(safeName);
    return true;
  }
  return false;
};



// Generic PDF Generator for both Invoices and Quotations
export const generateDocumentPDF = (type, documentData, items) => {
  try {
    const doc = createPDFDoc();

    // Load company config from localStorage
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const rawCompanyName = savedConfig.companyName || savedConfig.dashboardName || 'Seynex Technology';
    const companyName = rawCompanyName.replace(/GymSales\s*(Pro)?/gi, 'Seynex Technology').trim();
    const companyAddress = savedConfig.companyAddress || 'No 680/1B, Hendrik Perera Road, Gonwala, Kelaniya';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';
    const companyPhone = savedConfig.companyPhone || '';

    // Normalise type string
    const isInvoice = type?.toLowerCase().includes('invoice');
    const isReceipt = type?.toLowerCase().includes('receipt');
    const docTitle = isReceipt ? 'PAYMENT RECEIPT' : isInvoice ? 'INVOICE' : 'QUOTATION';

    // Safe field reads — compute targetName and docNumber FIRST
    const docNumber = (isInvoice ? (documentData?.invoiceNumber || documentData?.invoice_number) : (documentData?.quoteNumber || documentData?.quote_number)) || 'N/A';
    const targetName = (isInvoice 
      ? (documentData?.customerName || documentData?.gymName || documentData?.prospectName || documentData?.customer_name) 
      : (documentData?.customerName || documentData?.prospectName || documentData?.gymName || documentData?.prospect_name)) || 'Valued Client';

    // If it's a receipt, delegate directly to the dedicated payment receipt generator
    if (isReceipt) {
      return generatePaymentReceiptPDF(documentData, documentData, { gymName: targetName, name: targetName });
    }

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6', [59, 130, 246]);
    const textColor = [30, 41, 59];
    const lightGray = [248, 250, 252];
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = formatDatePretty(documentData?.date || new Date());
    const dueDateStr = formatDatePretty(documentData?.dueDate);

    const itemsList = Array.isArray(items) && items.length > 0 ? items : (documentData?.items || []);
    const standardItems = itemsList.filter(i => !i.isDiscount);
    const discountItem = itemsList.find(i => i.isDiscount);
    const discountAmount = discountItem ? Math.abs(discountItem.price ?? discountItem.amount ?? 0) : 0;

    // Support both price/quantity and unitPrice/qty naming
    const getItemPrice = (item) => Number(item.price ?? item.unitPrice ?? 0);
    const getItemQty = (item) => Number(item.quantity ?? item.qty ?? 1);
    const getItemTotal = (item) => {
      if (item.amount !== undefined && item.amount !== null && !isNaN(Number(item.amount))) {
        return Number(item.amount);
      }
      return getItemPrice(item) * getItemQty(item);
    };

    const calculatedSubTotal = standardItems.reduce((sum, item) => sum + getItemTotal(item), 0);
    const subTotal = calculatedSubTotal > 0
      ? calculatedSubTotal
      : (Number(documentData?.amount || 0) + discountAmount);

    const totalAmount = subTotal - discountAmount;

    // Add company logo if available (priority logic)
    if (savedConfig.receiptLogo) {
      try {
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 12, 30, 30);
      } catch (e) {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 22);
      }
    } else {
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 22);
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(companyAddress, 14, 28);
    doc.text(`Email: ${companyEmail} | Phone: ${companyPhone}`, 14, 33);

    // Doc Type Title (right side)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(docTitle, pageWidth - 14, 22, { align: 'right' });

    // Doc meta (right side)
    doc.setFontSize(9.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${isInvoice ? 'Invoice' : 'Quotation'} #: ${docNumber}`, pageWidth - 14, 30, { align: 'right' });
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${dateStr}`, pageWidth - 14, 36, { align: 'right' });
    let rightMetaY = 41;
    if (isInvoice && dueDateStr !== '—') {
      doc.text(`Due Date: ${dueDateStr}`, pageWidth - 14, rightMetaY, { align: 'right' });
      rightMetaY += 5;
    }
    const quoteRef = documentData?.quotationNumber || documentData?.quoteRef || documentData?.quotation_number;
    if (isInvoice && quoteRef) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Ref: #${quoteRef}`, pageWidth - 14, rightMetaY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }

    // PAID Watermark for Invoices marked as Paid
    if (isInvoice && documentData?.status === 'Paid') {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.setFontSize(90);
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text('PAID IN FULL', pageWidth / 2, 140, { align: 'center', angle: 30 });
      doc.restoreGraphicsState();
    }

    // ── Bill To ─────────────────────────────────────────────────────────────
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, 48, 95, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 48, 95, 22, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('BILL TO / RECIPIENT:', 18, 55);
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(targetName, 18, 62);
    if (documentData?.contactPerson || documentData?.prospectPhone) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${documentData.contactPerson ? 'Attn: ' + documentData.contactPerson : ''} ${documentData.prospectPhone ? '| ' + documentData.prospectPhone : ''}`, 18, 67);
    }

    // ── Line Items Table ──────────────────────────────────────────────────────
    let tableBody = [];
    if (standardItems.length > 0) {
      tableBody = standardItems.map(item => [
        item.name || item.description || 'Item Description',
        item.type || item.category || 'Service',
        formatLKR(getItemPrice(item)),
        String(getItemQty(item)),
        formatLKR(getItemTotal(item))
      ]);
    } else {
      tableBody = [
        ['Software License Package & Enterprise Support', 'Package', formatLKR(subTotal), '1', formatLKR(subTotal)]
      ];
    }

    runAutoTable(doc, {
      startY: 76,
      head: [['Item Description', 'Classification', 'Unit Price', 'Qty', 'Line Total']],
      body: tableBody,
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59] }
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    let finalY = (doc.lastAutoTable?.finalY || 120) + 8;

    if (discountAmount > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal:', pageWidth - 65, finalY + 4, { align: 'right' });
      doc.text(formatLKR(subTotal), pageWidth - 14, finalY + 4, { align: 'right' });
      
      finalY += 6;
      doc.setTextColor(220, 38, 38);
      doc.text('Discount:', pageWidth - 65, finalY + 4, { align: 'right' });
      doc.text(`- ${formatLKR(discountAmount)}`, pageWidth - 14, finalY + 4, { align: 'right' });
      finalY += 6;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total Amount Due:', pageWidth - 65, finalY + 6, { align: 'right' });

    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(formatLKR(totalAmount), pageWidth - 14, finalY + 6, { align: 'right' });

    // ── Agreement Terms ───────────────────────────────────────────────────────
    let currentY = finalY + 25;

    if (documentData?.agreementTerms) {
      const splitTerms = doc.splitTextToSize(documentData.agreementTerms, 180);
      const requiredSpace = 6 + (splitTerms.length * 4);
      
      if (currentY + requiredSpace > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Service Agreement & Terms:', 14, currentY);
      
      currentY += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      
      doc.text(splitTerms, 14, currentY);
    }

    // ── Installment Schedule Table ──────────────────────────────────────────
    if (isInvoice && documentData?.installmentPlan?.enabled && Array.isArray(documentData.installmentPlan.installments)) {
      currentY += 10;
      if (currentY + 50 > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`INSTALLMENT PAYMENT SCHEDULE (${documentData.installmentPlan.count} ${documentData.installmentPlan.frequency || 'Monthly'} PAYMENTS)`, 14, currentY);

      const instRows = documentData.installmentPlan.installments.map(inst => [
        inst.title,
        inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : 'N/A',
        `LKR ${(inst.amount || 0).toLocaleString()}`,
        inst.status || 'Pending'
      ]);

      runAutoTable(doc, {
        startY: currentY + 4,
        head: [['Installment', 'Due Date', 'Amount Due', 'Status']],
        body: instRows,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: textColor
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 6;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    // ── Bank Account / Verification ──────────────────────────────────────────
    if (isInvoice && savedConfig.bankDetails) {
      const bankY = pageHeight - 45;
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text('PAYMENT BANK DETAILS:', 14, bankY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Bank: ${savedConfig.bankDetails.bank} | Branch: ${savedConfig.bankDetails.branch}`, 14, bankY + 5);
      doc.text(`A/C Name: ${savedConfig.bankDetails.accountName}`, 14, bankY + 9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(10);
      doc.text(`Account No: ${savedConfig.bankDetails.accountNumber}`, 14, bankY + 14);
    }

    // Default Notes & Footer (Properly Spaced Above Divider Line)
    const footerMsg = isReceipt 
      ? 'This is a computer generated receipt. No signature required.' 
      : (isInvoice 
          ? (savedConfig.pdfFooterText || 'Thank you for your business. Please remit payment promptly.')
          : 'Thank you for your interest. This proposal is valid for 30 days from issue date.');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(footerMsg, 14, pageHeight - 24);

    const rawNotes = savedConfig.pdfNotes || 'This document is computer-generated by Seynex Technology Sales Management Suite.';
    const cleanNotes = rawNotes.replace(/GymSales\s*(Pro)?(\s*Management\s*System)?/gi, 'Seynex Technology Sales Management Suite').trim();
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(cleanNotes, 14, pageHeight - 18);

    applyPageHeaderFooter(doc, {
      title: isInvoice ? 'Tax Invoice' : 'Quotation Proposal',
      companyConfig: savedConfig,
      primaryColor
    });

    // ── Save ──────────────────────────────────────────────────────────────────
    const safeDocPrefix = isInvoice ? 'Invoice' : 'Quote';
    const safeFileName = `${safeDocPrefix}_${docNumber}_${(targetName).replace(/[^a-z0-9]/gi, '_')}.pdf`;
    savePdfDoc(doc, safeFileName);

  } catch (err) {
    console.error('PDF generation error details:', err.message, err.stack);
    alert(`Could not generate PDF: ${err.message || 'Unknown error'}. Please check the console.`);
  }
};

// Stock Report Generator
export const generateStockReportPDF = (inventoryItems) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro';
    
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6');
    const textColor = [40, 40, 40];
    const pageHeight = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString();

    // Header
    if (savedConfig.receiptLogo) {
      try {
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 12, 32, 32);
      } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 22);
      }
    } else {
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 22);
    }

    doc.setFontSize(18);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('MASTER STOCK VALUATION REPORT', 196, 22, { align: 'right' });

    doc.setFontSize(10);
    doc.text(`Report Date: ${dateStr}`, 196, 30, { align: 'right' });

    // Table
    const tableBody = inventoryItems.map(item => [
      item.name || 'Untitled Item',
      item.type || 'N/A',
      `LKR ${Number(item.price || 0).toLocaleString()}`,
      item.stock !== null ? String(item.stock) : '—',
      `LKR ${(Number(item.price || 0) * (item.stock || 0)).toLocaleString()}`
    ]);

    const totalValuation = inventoryItems.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.stock || 0))), 0);

    runAutoTable(doc, {
      startY: 48,
      head: [['Item Description', 'Category', 'Unit Price', 'In Stock', 'Total Value']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 9 }
    });

    // Summary
    const finalY = (doc.lastAutoTable?.finalY || 120) + 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL INVENTORY VALUATION:', 140, finalY, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`LKR ${totalValuation.toLocaleString()}`, 196, finalY, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text('Professional Stock Report - Generated by Seynex Technology Sales Management Suite', 14, pageHeight - 15);

    savePdfDoc(doc, `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (err) {
    console.error('Stock Report error:', err);
    alert('Failed to generate report. Check console.');
  }
};

// Accounting Summary Report Generator
export const generateAccountingReportPDF = (data) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = (savedConfig.companyName || 'Seynex Technology').replace(/GymSales\s*(Pro)?/gi, 'Seynex Technology');
    
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6');
    const textColor = [40, 40, 40];
    const pageHeight = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString();

    // Header
    if (savedConfig.receiptLogo) {
      try {
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 12, 32, 32);
      } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 22);
      }
    } else {
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 22);
    }

    doc.setFontSize(18);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('ACCOUNTING SUMMARY REPORT', 196, 22, { align: 'right' });

    doc.setFontSize(10);
    doc.text(`Generated on: ${dateStr}`, 196, 30, { align: 'right' });

    // Table Data
    const tableBody = data.map(row => [
      row.Date,
      row.Type,
      row.Category,
      row.Description,
      `LKR ${Number(row.Amount).toLocaleString()}`
    ]);

    const totalRevenue = data.filter(r => r.Type === 'Revenue').reduce((s, r) => s + Number(r.Amount), 0);
    const totalExpenses = data.filter(r => r.Type === 'Expense').reduce((s, r) => s + Math.abs(Number(r.Amount)), 0);
    const netProfit = totalRevenue - totalExpenses;

    runAutoTable(doc, {
      startY: 48,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      columnStyles: { 4: { halign: 'right' } },
      styles: { fontSize: 8 }
    });

    const finalY = (doc.lastAutoTable?.finalY || 120) + 10;
    
    // Financial Summary
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Total Revenue: LKR ${totalRevenue.toLocaleString()}`, 196, finalY + 5, { align: 'right' });
    doc.text(`Total Expenses: LKR ${totalExpenses.toLocaleString()}`, 196, finalY + 11, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(netProfit >= 0 ? 34 : 244, netProfit >= 0 ? 197 : 63, netProfit >= 0 ? 94 : 94);
    doc.text(`Net Profit: LKR ${netProfit.toLocaleString()}`, 196, finalY + 20, { align: 'right' });

    savePdfDoc(doc, `Accounting_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Accounting Report error:', err);
  }
};

// Formal Corporate Profit & Loss Statement (P&L) PDF Generator
export const generatePnLReportPDF = (pnlData) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro';
    const companyAddress = savedConfig.companyAddress || 'Seynex Technologies';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';
    const companyPhone = savedConfig.companyPhone || '';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1', [99, 102, 241]);
    const dateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });

    // Company Header
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(companyAddress, 14, 28);
    doc.text(`Email: ${companyEmail} ${companyPhone ? '| Phone: ' + companyPhone : ''}`, 14, 33);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('PROFIT & LOSS STATEMENT (P&L)', 196, 22, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`For Period Ending: ${dateStr}`, 196, 30, { align: 'right' });

    // P&L Data Table
    const tableBody = [
      [{ content: '1. REVENUE (INCOME)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Collected Sales Revenue (Paid Invoices)', `LKR ${Number(pnlData.totalRevenue || 0).toLocaleString()}`],
      ['   Projected Annual Subscriptions', `LKR ${Number(pnlData.projectedRenewals || 0).toLocaleString()}`],
      [{ content: 'TOTAL REVENUE (NET SALES)', styles: { fontStyle: 'bold' } }, { content: `LKR ${Number(pnlData.totalRevenue || 0).toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      
      [{ content: '2. COST OF GOODS SOLD (COGS)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Inventory Hardware & Stock Cost', `LKR ${Number(pnlData.totalStockCost || 0).toLocaleString()}`],
      ['   Direct Delivery & Stock COGS', `LKR ${Number(pnlData.estimatedCOGS || 0).toLocaleString()}`],
      [{ content: 'TOTAL COST OF GOODS SOLD', styles: { fontStyle: 'bold' } }, { content: `(LKR ${Number(pnlData.estimatedCOGS || 0).toLocaleString()})`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }],

      [{ content: 'GROSS PROFIT', styles: { fontStyle: 'bold', fontSize: 11 } }, { content: `LKR ${Number(pnlData.grossProfit || 0).toLocaleString()}`, styles: { fontStyle: 'bold', fontSize: 11, textColor: pnlData.grossProfit >= 0 ? [16, 185, 129] : [220, 38, 38] } }],

      [{ content: '3. OPERATING EXPENSES (OPEX)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Operational Expenses (Server, Hosting, Infrastructure)', `LKR ${Number(pnlData.expenseByCategory?.Operational || 0).toLocaleString()}`],
      ['   Marketing & Client Acquisition', `LKR ${Number(pnlData.expenseByCategory?.Marketing || 0).toLocaleString()}`],
      ['   Staff & Payroll', `LKR ${Number(pnlData.expenseByCategory?.Staff || 0).toLocaleString()}`],
      ['   Taxes & Admin Fees', `LKR ${Number(pnlData.expenseByCategory?.Taxes || 0).toLocaleString()}`],
      ['   Other Expenses', `LKR ${Number(pnlData.expenseByCategory?.Other || 0).toLocaleString()}`],
      [{ content: 'TOTAL OPERATING EXPENSES', styles: { fontStyle: 'bold' } }, { content: `(LKR ${Number(pnlData.totalExpenses || 0).toLocaleString()})`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }],

      [{ content: 'NET PROFIT BEFORE TAX (EBITDA)', styles: { fontStyle: 'bold', fontSize: 12 } }, { content: `LKR ${Number(pnlData.netProfit || 0).toLocaleString()}`, styles: { fontStyle: 'bold', fontSize: 12, textColor: pnlData.netProfit >= 0 ? [16, 185, 129] : [220, 38, 38] } }]
    ];

    runAutoTable(doc, {
      startY: 42,
      head: [['Financial Category', 'Amount (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9 }
    });

    const finalY = (doc.lastAutoTable?.finalY || 180) + 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('This Profit & Loss Statement is automatically generated by Seynex Technology Sales Management Suite.', 105, finalY, { align: 'center' });

    savePdfDoc(doc, `PnL_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('PnL PDF error:', err);
  }
};

// Print Formal Corporate Profit & Loss Statement (P&L) Document
export const printPnLReportPDF = (pnlData) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = (savedConfig.companyName || 'Seynex Technology').replace(/GymSales\s*(Pro)?/gi, 'Seynex Technology');
    const companyAddress = savedConfig.companyAddress || 'Seynex Technologies';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';
    const companyPhone = savedConfig.companyPhone || '';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1', [99, 102, 241]);
    const dateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });

    // Company Header
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(companyAddress, 14, 28);
    doc.text(`Email: ${companyEmail} ${companyPhone ? '| Phone: ' + companyPhone : ''}`, 14, 33);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('PROFIT & LOSS STATEMENT (P&L)', 196, 22, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`For Period Ending: ${dateStr}`, 196, 30, { align: 'right' });

    // P&L Data Table
    const tableBody = [
      [{ content: '1. REVENUE (INCOME)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Collected Sales Revenue (Paid Invoices)', `LKR ${Number(pnlData.totalRevenue || 0).toLocaleString()}`],
      ['   Projected Annual Subscriptions', `LKR ${Number(pnlData.projectedRenewals || 0).toLocaleString()}`],
      [{ content: 'TOTAL REVENUE (NET SALES)', styles: { fontStyle: 'bold' } }, { content: `LKR ${Number(pnlData.totalRevenue || 0).toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      
      [{ content: '2. COST OF GOODS SOLD (COGS)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Inventory Hardware & Stock Cost', `LKR ${Number(pnlData.totalStockCost || 0).toLocaleString()}`],
      ['   Direct Delivery & Stock COGS', `LKR ${Number(pnlData.estimatedCOGS || 0).toLocaleString()}`],
      [{ content: 'TOTAL COST OF GOODS SOLD', styles: { fontStyle: 'bold' } }, { content: `(LKR ${Number(pnlData.estimatedCOGS || 0).toLocaleString()})`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }],

      [{ content: 'GROSS PROFIT', styles: { fontStyle: 'bold', fontSize: 11 } }, { content: `LKR ${Number(pnlData.grossProfit || 0).toLocaleString()}`, styles: { fontStyle: 'bold', fontSize: 11, textColor: pnlData.grossProfit >= 0 ? [16, 185, 129] : [220, 38, 38] } }],

      [{ content: '3. OPERATING EXPENSES (OPEX)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['   Operational Expenses (Server, Hosting, Infrastructure)', `LKR ${Number(pnlData.expenseByCategory?.Operational || 0).toLocaleString()}`],
      ['   Marketing & Client Acquisition', `LKR ${Number(pnlData.expenseByCategory?.Marketing || 0).toLocaleString()}`],
      ['   Staff & Payroll', `LKR ${Number(pnlData.expenseByCategory?.Staff || 0).toLocaleString()}`],
      ['   Taxes & Admin Fees', `LKR ${Number(pnlData.expenseByCategory?.Taxes || 0).toLocaleString()}`],
      ['   Other Expenses', `LKR ${Number(pnlData.expenseByCategory?.Other || 0).toLocaleString()}`],
      [{ content: 'TOTAL OPERATING EXPENSES', styles: { fontStyle: 'bold' } }, { content: `(LKR ${Number(pnlData.totalExpenses || 0).toLocaleString()})`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }],

      [{ content: 'NET PROFIT BEFORE TAX (EBITDA)', styles: { fontStyle: 'bold', fontSize: 12 } }, { content: `LKR ${Number(pnlData.netProfit || 0).toLocaleString()}`, styles: { fontStyle: 'bold', fontSize: 12, textColor: pnlData.netProfit >= 0 ? [16, 185, 129] : [220, 38, 38] } }]
    ];

    runAutoTable(doc, {
      startY: 42,
      head: [['Financial Category', 'Amount (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9 }
    });

    const finalY = (doc.lastAutoTable?.finalY || 180) + 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('This Profit & Loss Statement is automatically generated by Seynex Technology Sales Management Suite.', 105, finalY, { align: 'center' });

    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('PnL Print error:', err);
  }
};

// Browser Print (fallback for print button)
export const printDocument = () => {
  window.print();
};

// SLFRS/LKAS Compliant 3-Statement PDF Generator
export const generateSLFRSFinancialStatementsPDF = ({ companyName, periodLabel, pnl, balanceSheet, cashFlow }) => {
  try {
    const doc = createPDFDoc();
    const primaryColor = [30, 41, 59]; // Slate 800

    const cName = (companyName || 'Seynex Technology Enterprise').replace(/GymSales\s*(Pro)?/gi, 'Seynex Technology');
    const fmt = (val) => {
      if (val === 0 || val === undefined || val === null) return '—';
      const num = Number(val);
      if (isNaN(num) || num === 0) return '—';
      return num < 0 ? `(${Math.abs(num).toLocaleString('en-US')})` : num.toLocaleString('en-US');
    };

    const fmtExpense = (val) => {
      if (val === 0 || val === undefined || val === null) return '—';
      const num = Number(val);
      if (isNaN(num) || num === 0) return '—';
      return `(${Math.abs(num).toLocaleString('en-US')})`;
    };

    // Page 1: Statement of Profit or Loss (LKAS 1)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(cName.toUpperCase(), 14, 18);

    doc.setFontSize(12);
    doc.text('STATEMENT OF PROFIT OR LOSS', 14, 26);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`For the Period: ${periodLabel || 'Current Period'}`, 14, 32);
    doc.text('Prepared in accordance with Sri Lanka Accounting Standards (SLFRS/LKAS 1)', 14, 37);

    const pnlBody = [
      ['Revenue', fmt(pnl.current.revenue), fmt(pnl.prior.revenue)],
      ['Cost of Sales', fmtExpense(pnl.current.costOfSales), fmtExpense(pnl.prior.costOfSales)],
      [{ content: 'Gross Profit', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.grossProfit), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.grossProfit), styles: { fontStyle: 'bold' } }],
      ['Other Income', fmt(pnl.current.otherIncome), fmt(pnl.prior.otherIncome)],
      ['Distribution Costs', fmtExpense(pnl.current.distributionCosts), fmtExpense(pnl.prior.distributionCosts)],
      ['Administrative Expenses', fmtExpense(pnl.current.adminExpenses), fmtExpense(pnl.prior.adminExpenses)],
      ['Other Expenses', fmtExpense(pnl.current.otherExpenses), fmtExpense(pnl.prior.otherExpenses)],
      [{ content: 'Operating Profit', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.operatingProfit), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.operatingProfit), styles: { fontStyle: 'bold' } }],
      ['Finance Income', fmt(pnl.current.financeIncome), fmt(pnl.prior.financeIncome)],
      ['Finance Costs', fmtExpense(pnl.current.financeCosts), fmtExpense(pnl.prior.financeCosts)],
      [{ content: 'Profit Before Tax', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.profitBeforeTax), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.profitBeforeTax), styles: { fontStyle: 'bold' } }],
      ['Income Tax Expense', fmtExpense(pnl.current.taxExpense), fmtExpense(pnl.prior.taxExpense)],
      [{ content: 'PROFIT FOR THE PERIOD', styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmt(pnl.current.profitForPeriod), styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmt(pnl.prior.profitForPeriod), styles: { fontStyle: 'bold', fontSize: 10 } }]
    ];

    runAutoTable(doc, {
      startY: 42,
      head: [['Line Item', 'Current Period (LKR)', 'Prior Period (LKR)']],
      body: pnlBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      styles: { fontSize: 8.5, cellPadding: 3.5 }
    });

    // Page 2: Statement of Financial Position (LKAS 1)
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(cName.toUpperCase(), 14, 18);

    doc.setFontSize(12);
    doc.text('STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)', 14, 26);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`As at: ${periodLabel || 'Current Date'}`, 14, 32);
    doc.text('Prepared in accordance with Sri Lanka Accounting Standards (SLFRS/LKAS 1)', 14, 37);

    const bsBody = [
      [{ content: 'ASSETS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      [{ content: 'Non-Current Assets', colSpan: 2, styles: { fontStyle: 'bold' } }],
      ['   Property, Plant & Equipment (Net of Dep.)', fmt(balanceSheet.nonCurrentAssets.ppeNet)],
      ['   Intangible Assets', fmt(balanceSheet.nonCurrentAssets.intangibles)],
      [{ content: 'Total Non-Current Assets', styles: { fontStyle: 'bold' } }, { content: fmt(balanceSheet.nonCurrentAssets.total), styles: { fontStyle: 'bold' } }],
      
      [{ content: 'Current Assets', colSpan: 2, styles: { fontStyle: 'bold' } }],
      ['   Inventory', fmt(balanceSheet.currentAssets.inventory)],
      ['   Trade Receivables (Accounts Receivable)', fmt(balanceSheet.currentAssets.tradeReceivables)],
      ['   Cash and Cash Equivalents', fmt(balanceSheet.currentAssets.cashAndEquivalents)],
      [{ content: 'Total Current Assets', styles: { fontStyle: 'bold' } }, { content: fmt(balanceSheet.currentAssets.total), styles: { fontStyle: 'bold' } }],
      
      [{ content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', fontSize: 9.5 } }, { content: fmt(balanceSheet.totalAssets), styles: { fontStyle: 'bold', fontSize: 9.5 } }],

      [{ content: 'EQUITY AND LIABILITIES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      [{ content: 'Equity', colSpan: 2, styles: { fontStyle: 'bold' } }],
      ['   Stated Capital / Owner\'s Equity', fmt(balanceSheet.equity.statedCapital)],
      ['   Retained Earnings (Rolled Forward)', fmt(balanceSheet.equity.retainedEarningsRolled)],
      [{ content: 'Total Equity', styles: { fontStyle: 'bold' } }, { content: fmt(balanceSheet.equity.total), styles: { fontStyle: 'bold' } }],

      [{ content: 'Non-Current Liabilities', colSpan: 2, styles: { fontStyle: 'bold' } }],
      ['   Long-Term Loans', fmt(balanceSheet.nonCurrentLiabilities.longTermLoans)],
      [{ content: 'Total Non-Current Liabilities', styles: { fontStyle: 'bold' } }, { content: fmt(balanceSheet.nonCurrentLiabilities.total), styles: { fontStyle: 'bold' } }],

      [{ content: 'Current Liabilities', colSpan: 2, styles: { fontStyle: 'bold' } }],
      ['   Trade Payables (Accounts Payable)', fmt(balanceSheet.currentLiabilities.tradePayables)],
      ['   Tax Payable', fmt(balanceSheet.currentLiabilities.taxPayable)],
      ['   Short-Term Borrowings', fmt(balanceSheet.currentLiabilities.shortTermBorrowings)],
      [{ content: 'Total Current Liabilities', styles: { fontStyle: 'bold' } }, { content: fmt(balanceSheet.currentLiabilities.total), styles: { fontStyle: 'bold' } }],

      [{ content: 'TOTAL EQUITY AND LIABILITIES', styles: { fontStyle: 'bold', fontSize: 9.5 } }, { content: fmt(balanceSheet.totalEquityAndLiabilities), styles: { fontStyle: 'bold', fontSize: 9.5 } }]
    ];

    runAutoTable(doc, {
      startY: 42,
      head: [['Classification', 'Amount (LKR)']],
      body: bsBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // Page 3: Statement of Cash Flows (LKAS 7)
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(cName.toUpperCase(), 14, 18);

    doc.setFontSize(12);
    doc.text('STATEMENT OF CASH FLOWS (INDIRECT METHOD)', 14, 26);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`For the Period: ${periodLabel || 'Current Period'}`, 14, 32);
    doc.text('Prepared in accordance with Sri Lanka Accounting Standards (SLFRS/LKAS 7)', 14, 37);

    const cf = cashFlow;
    const cfBody = [
      [{ content: 'Cash Flows from Operating Activities', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['Profit Before Tax', fmt(cf.operating.pbt)],
      ['Adjustments for: Depreciation & Amortisation', fmt(cf.operating.depreciation)],
      ['Adjustments for: Finance Costs', fmt(cf.operating.financeCosts)],
      [{ content: 'Operating Profit Before Working Capital Changes', styles: { fontStyle: 'bold' } }, { content: fmt(cf.operating.operatingProfitBeforeWC), styles: { fontStyle: 'bold' } }],
      ['(Increase)/Decrease in Trade Receivables', fmt(cf.operating.deltaReceivables)],
      ['(Increase)/Decrease in Inventory', fmt(cf.operating.deltaInventory)],
      ['Increase/(Decrease) in Trade Payables', fmt(cf.operating.deltaPayables)],
      [{ content: 'Cash Generated from Operations', styles: { fontStyle: 'bold' } }, { content: fmt(cf.operating.cashGeneratedFromOps), styles: { fontStyle: 'bold' } }],
      ['Income Tax Paid', fmtExpense(cf.operating.taxPaid)],
      [{ content: 'Net Cash from Operating Activities', styles: { fontStyle: 'bold' } }, { content: fmt(cf.operating.netCashOperating), styles: { fontStyle: 'bold' } }],

      [{ content: 'Cash Flows from Investing Activities', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['Purchase of Property, Plant & Equipment', fmtExpense(cf.investing.ppePurchase)],
      [{ content: 'Net Cash used in Investing Activities', styles: { fontStyle: 'bold' } }, { content: fmt(cf.investing.netCashInvesting), styles: { fontStyle: 'bold' } }],

      [{ content: 'Cash Flows from Financing Activities', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['Proceeds from Borrowings', fmt(cf.financing.loanProceeds)],
      ['Repayment of Borrowings', fmtExpense(cf.financing.loanRepayments)],
      ['Owner\'s Drawings / Dividends Paid', fmtExpense(cf.financing.drawingsPaid)],
      [{ content: 'Net Cash from/(used in) Financing Activities', styles: { fontStyle: 'bold' } }, { content: fmt(cf.financing.netCashFinancing), styles: { fontStyle: 'bold' } }],

      [{ content: 'NET INCREASE IN CASH & CASH EQUIVALENTS', styles: { fontStyle: 'bold' } }, { content: fmt(cf.netIncreaseInCash), styles: { fontStyle: 'bold' } }],
      ['Cash and Cash Equivalents at Beginning of Period', fmt(cf.cashAtBeginning)],
      [{ content: 'CASH AND CASH EQUIVALENTS AT END OF PERIOD', styles: { fontStyle: 'bold', fontSize: 9.5 } }, { content: fmt(cf.cashAtEndCalculated), styles: { fontStyle: 'bold', fontSize: 9.5 } }]
    ];

    runAutoTable(doc, {
      startY: 42,
      head: [['Cash Flow Item', 'Amount (LKR)']],
      body: cfBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const cleanFileName = `SLFRS_Statements_${(periodLabel || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    savePdfDoc(doc, cleanFileName);
  } catch (err) {
    console.error('Failed to generate SLFRS Statements PDF:', err);
  }
};

// Export Account Ledger Statement (T-Account History) PDF
export const exportAccountLedgerPDF = ({ account, lines = [], journalEntries = [], startDate, endDate }) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro Enterprise';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1', [99, 102, 241]);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName.toUpperCase(), 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`GENERAL LEDGER STATEMENT — ACCOUNT ${account?.code || ''}`, 14, 26);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Account Name: ${account?.name || 'N/A'} | Type: ${(account?.type || '').toUpperCase()} | Category: ${account?.statement_category || 'N/A'}`, 14, 32);
    doc.text(`Date Range: ${startDate || 'Beginning'} to ${endDate || 'Present'} | Generated: ${new Date().toLocaleDateString()}`, 14, 37);

    const entryMap = new Map((journalEntries || []).map(e => [e.id, e]));
    
    let totalDebit = 0;
    let totalCredit = 0;
    let runningNet = 0;

    const tableBody = lines.map(line => {
      const entry = entryMap.get(line.journalEntryId);
      const deb = Number(line.debit || 0);
      const cred = Number(line.credit || 0);
      totalDebit += deb;
      totalCredit += cred;

      if (account?.type === 'revenue' || account?.type === 'liability' || account?.type === 'equity') {
        runningNet += (cred - deb);
      } else {
        runningNet += (deb - cred);
      }

      return [
        entry?.date ? new Date(entry.date).toLocaleDateString() : '—',
        entry?.reference || '—',
        entry?.description || line.memo || 'Journal Entry',
        deb > 0 ? deb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
        cred > 0 ? cred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
        runningNet.toLocaleString('en-US', { minimumFractionDigits: 2 })
      ];
    });

    tableBody.push([
      { content: 'TOTALS / ENDING BALANCE', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: runningNet.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
    ]);

    runAutoTable(doc, {
      startY: 42,
      head: [['Date', 'Reference', 'Description / Particulars', 'Debit (LKR)', 'Credit (LKR)', 'Net Balance (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const cleanFileName = `General_Ledger_${account?.code || 'Account'}_Statement.pdf`;
    savePdfDoc(doc, cleanFileName);
  } catch (err) {
    console.error('Failed to export Account Ledger PDF:', err);
  }
};

// Export General Journal Voucher PDF
export const exportJournalVoucherPDF = ({ entry, lines = [], accounts = [] }) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro Enterprise';

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(companyName.toUpperCase(), 14, 18);

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`JOURNAL VOUCHER #${entry?.reference || 'JV-000'}`, 14, 27);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Voucher Date: ${entry?.date ? new Date(entry.date).toLocaleDateString() : '—'} | Posted By: ${entry?.createdBy || 'System'}`, 14, 33);
    doc.text(`Narration / Description: ${entry?.description || 'General Journal Entry'}`, 14, 38);

    const accMap = new Map((accounts || []).map(a => [a.id, a]));
    
    let totalDebit = 0;
    let totalCredit = 0;

    const tableBody = lines.map(l => {
      const acc = accMap.get(l.accountId) || accounts.find(a => a.code === l.accountId);
      const deb = Number(l.debit || 0);
      const cred = Number(l.credit || 0);
      totalDebit += deb;
      totalCredit += cred;

      return [
        acc ? `${acc.code} - ${acc.name}` : l.accountId,
        acc?.type?.toUpperCase() || '—',
        deb > 0 ? deb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
        cred > 0 ? cred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
      ];
    });

    tableBody.push([
      { content: 'TOTAL VOUCHER AMOUNT', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
    ]);

    runAutoTable(doc, {
      startY: 44,
      head: [['Account Description', 'Type', 'Debit (LKR)', 'Credit (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      styles: { fontSize: 8.5, cellPadding: 4 }
    });

    const cleanFileName = `Journal_Voucher_${(entry?.reference || 'Voucher').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    savePdfDoc(doc, cleanFileName);
  } catch (err) {
    console.error('Failed to export Journal Voucher PDF:', err);
  }
};

// Export Trial Balance PDF
export const exportTrialBalancePDF = ({ accounts = [], journalLines = [], journalEntries = [], asOfDate }) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro Enterprise';

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(companyName.toUpperCase(), 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('TRIAL BALANCE RECONCILIATION STATEMENT', 14, 26);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`As of Date: ${asOfDate || new Date().toLocaleDateString()} | Compliance: SLFRS / LKAS Financial Suite`, 14, 32);

    let sumDebit = 0;
    let sumCredit = 0;

    const entryMap = new Map((journalEntries || []).map(e => [e.id, e.date]));
    const filteredLines = journalLines.filter(line => {
      if (!asOfDate) return true;
      const d = entryMap.get(line.journalEntryId);
      return !d || d <= asOfDate;
    });

    const tableBody = accounts.map(acc => {
      const accLines = filteredLines.filter(l => l.accountId === acc.id || l.accountId === acc.code);
      let deb = accLines.reduce((s, l) => s + Number(l.debit || 0), 0);
      let cred = accLines.reduce((s, l) => s + Number(l.credit || 0), 0);

      let debitBal = 0;
      let creditBal = 0;

      if (acc.type === 'revenue' || acc.type === 'liability' || acc.type === 'equity') {
        const net = cred - deb;
        if (net >= 0) creditBal = net;
        else debitBal = Math.abs(net);
      } else {
        const net = deb - cred;
        if (net >= 0) debitBal = net;
        else creditBal = Math.abs(net);
      }

      sumDebit += debitBal;
      sumCredit += creditBal;

      return [
        acc.code,
        acc.name,
        acc.type?.toUpperCase() || 'ASSET',
        debitBal > 0 ? debitBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
        creditBal > 0 ? creditBal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'
      ];
    });

    tableBody.push([
      { content: 'TOTAL TRIAL BALANCE', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: sumDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: sumCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
    ]);

    runAutoTable(doc, {
      startY: 38,
      head: [['Code', 'Account Name', 'Type', 'Debit Balance (LKR)', 'Credit Balance (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const cleanFileName = `Trial_Balance_${(asOfDate || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    savePdfDoc(doc, cleanFileName);
  } catch (err) {
    console.error('Failed to export Trial Balance PDF:', err);
  }
};

// Official Purchase Order PDF Generator
export const generatePurchaseOrderPDF = (poData) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro';
    const companyAddress = savedConfig.companyAddress || '';
    const companyEmail = savedConfig.companyEmail || '';
    const companyPhone = savedConfig.companyPhone || '';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#059669', [5, 150, 105]);
    const textColor = [40, 40, 40];
    const lightGray = [248, 250, 252];
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Company Logo / Name ──────────────────────────────────────────────────
    if (savedConfig.receiptLogo) {
      try {
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 10, 32, 32);
      } catch (e) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 22);
      }
    } else {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 22);
    }

    // Company details below logo
    let companyY = 28;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    if (companyAddress) { doc.text(companyAddress, 14, companyY); companyY += 4.5; }
    if (companyEmail) { doc.text(`Email: ${companyEmail}`, 14, companyY); companyY += 4.5; }
    if (companyPhone) { doc.text(`Phone: ${companyPhone}`, 14, companyY); companyY += 4.5; }

    // ── Title (right side) ───────────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PURCHASE ORDER', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`#${poData.poNumber || 'PO-0001'}`, pageWidth - 14, 28, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Order Date: ${poData.date || new Date().toISOString().split('T')[0]}`, pageWidth - 14, 35, { align: 'right' });
    if (poData.expectedDelivery) {
      doc.text(`Expected Delivery: ${poData.expectedDelivery}`, pageWidth - 14, 40, { align: 'right' });
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    const sectionStartY = Math.max(companyY + 4, 48);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, sectionStartY, pageWidth - 14, sectionStartY);

    // ── Supplier Info & PO Status ────────────────────────────────────────────
    const infoY = sectionStartY + 8;

    // Left: Supplier
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, infoY - 4, 85, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ISSUED TO (SUPPLIER)', 16, infoY + 1);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(poData.supplierName || 'Supplier', 16, infoY + 12);

    // If supplier address/contact available
    let supplierDetailY = infoY + 17;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    if (poData.supplierContact) {
      doc.text(`Contact: ${poData.supplierContact}`, 16, supplierDetailY);
      supplierDetailY += 4.5;
    }
    if (poData.supplierPhone) {
      doc.text(`Phone: ${poData.supplierPhone}`, 16, supplierDetailY);
      supplierDetailY += 4.5;
    }
    if (poData.supplierEmail) {
      doc.text(`Email: ${poData.supplierEmail}`, 16, supplierDetailY);
      supplierDetailY += 4.5;
    }
    if (poData.supplierVatNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`VAT Reg No: ${poData.supplierVatNumber}`, 16, supplierDetailY);
      supplierDetailY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
    } else if (poData.isVatRegistered === false) {
      doc.text(`Tax Status: Non-VAT Registered`, 16, supplierDetailY);
      supplierDetailY += 4.5;
    }

    // Right: Status Badge
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(pageWidth - 99, infoY - 4, 85, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ORDER STATUS', pageWidth - 97, infoY + 1);

    const status = poData.status || 'Ordered';
    const statusColors = {
      'Ordered': [59, 130, 246],
      'Delivered': [16, 185, 129],
      'Received': [16, 185, 129],
      'Cancelled': [239, 68, 68],
      'Partial': [245, 158, 11]
    };
    const statusColor = statusColors[status] || [100, 116, 139];
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(status.toUpperCase(), pageWidth - 97, infoY + 12);

    // ── Line Items Table ─────────────────────────────────────────────────────
    const tableStartY = Math.max(supplierDetailY + 6, infoY + 28);

    const items = Array.isArray(poData.items) ? poData.items : [];
    const tableBody = items.map((item, i) => {
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unitCost) || 0;
      const lineTotal = qty * unitCost;
      return [
        String(i + 1),
        item.name || 'Item',
        String(qty),
        `LKR ${unitCost.toLocaleString()}`,
        `LKR ${lineTotal.toLocaleString()}`
      ];
    });

    // If no items, add a placeholder row
    if (tableBody.length === 0) {
      tableBody.push(['1', 'Purchase Items', '1', `LKR ${Number(poData.totalAmount || 0).toLocaleString()}`, `LKR ${Number(poData.totalAmount || 0).toLocaleString()}`]);
    }

    runAutoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Item Description', 'Qty', 'Unit Cost', 'Line Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 5
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 5,
        textColor: textColor
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 38 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      styles: { lineColor: [226, 232, 240], lineWidth: 0.3 }
    });

    // ── Financial Summary & Grand Total ──────────────────────────────────────
    const totalY = (doc.lastAutoTable?.finalY || tableStartY + 30) + 8;
    const itemsTotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)), 0);
    const subtotal = poData.subtotal != null ? Number(poData.subtotal) : itemsTotal;
    const applyVat = Boolean(poData.applyVat);
    const vatRate = Number(poData.vatRate != null ? poData.vatRate : 18);
    const vatAmount = poData.vatAmount != null ? Number(poData.vatAmount) : (applyVat ? Math.round(subtotal * (vatRate / 100)) : 0);
    const totalAmount = Number(poData.totalAmount) || (subtotal + vatAmount);

    if (applyVat) {
      // VAT Box (Multi-line breakdown)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(pageWidth - 110, totalY, 96, 36, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(pageWidth - 110, totalY, 96, 36, 3, 3, 'S');

      // Subtotal
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal:', pageWidth - 104, totalY + 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`LKR ${subtotal.toLocaleString()}`, pageWidth - 18, totalY + 8, { align: 'right' });

      // VAT Line
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`VAT (${vatRate}%):`, pageWidth - 104, totalY + 16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`+ LKR ${vatAmount.toLocaleString()}`, pageWidth - 18, totalY + 16, { align: 'right' });

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(pageWidth - 104, totalY + 20, pageWidth - 18, totalY + 20);

      // Grand Total
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Grand Total:', pageWidth - 104, totalY + 29);
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`LKR ${totalAmount.toLocaleString()}`, pageWidth - 18, totalY + 29, { align: 'right' });
    } else {
      // Non-VAT Total Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, totalY, pageWidth - 28, 22, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, totalY, pageWidth - 28, 22, 3, 3, 'S');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total Order Value (Non-VAT):', 20, totalY + 14);

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`LKR ${totalAmount.toLocaleString()}`, pageWidth - 20, totalY + 14, { align: 'right' });
    }

    // ── Notes / Terms ────────────────────────────────────────────────────────
    let notesY = totalY + (applyVat ? 44 : 32);
    if (poData.notes) {
      if (notesY + 20 > pageHeight - 40) { doc.addPage(); notesY = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Notes / Remarks:', 14, notesY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const splitNotes = doc.splitTextToSize(poData.notes, pageWidth - 28);
      doc.text(splitNotes, 14, notesY + 6);
      notesY += 6 + (splitNotes.length * 4.5);
    }

    // ── Authorisation Lines ──────────────────────────────────────────────────
    const sigY = Math.min(notesY + 15, pageHeight - 45);
    if (sigY > pageHeight - 60) { doc.addPage(); }
    const finalSigY = sigY > pageHeight - 60 ? 40 : sigY;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    // Left signature
    doc.line(14, finalSigY + 15, 85, finalSigY + 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', 14, finalSigY + 20);
    doc.text('Procurement Officer / Manager', 14, finalSigY + 24);

    // Right signature
    doc.line(pageWidth - 85, finalSigY + 15, pageWidth - 14, finalSigY + 15);
    doc.text('Approved By', pageWidth - 85, finalSigY + 20);
    doc.text('Management / Director', pageWidth - 85, finalSigY + 24);

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(160, 170, 185);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated purchase order. Official company stamp or signature required for validation.', 14, pageHeight - 12);
    doc.text(`Generated by ${companyName} Management System on ${new Date().toLocaleDateString()}`, 14, pageHeight - 8);

    // ── Save PDF ─────────────────────────────────────────────────────────────
    const safeFileName = `Purchase_Order_${(poData.poNumber || 'PO').replace(/[^a-zA-Z0-9-]/g, '_')}_${(poData.supplierName || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    savePdfDoc(doc, safeFileName);

  } catch (err) {
    console.error('Purchase Order PDF generation error:', err);
    alert(`Could not generate Purchase Order PDF: ${err.message || 'Unknown error'}`);
  }
};

// =========================================================================
// ENTERPRISE REPORT & DOCUMENT PDF GENERATOR SUITE (SLFRS / LKAS COMPLIANT)
// =========================================================================


// 1. STANDALONE PAYMENT RECEIPT PDF
export const generatePaymentReceiptPDF = (paymentData, invoiceData = {}, customerData = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const companyAddress = savedConfig.companyAddress || 'No 680/1B, Gonwala, Kelaniya';
    const companyPhone = savedConfig.companyPhone || '072 840 8880';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#10b981', [16, 185, 129]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Company Header / Logo
    if (savedConfig.receiptLogo) {
      try {
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 12, 30, 30);
      } catch (e) {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 24);
      }
    } else {
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 24);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(companyAddress, 14, 30);
    doc.text(`Email: ${companyEmail} | Hotline: ${companyPhone}`, 14, 35);

    // Title on Right
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth - 14, 22, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Receipt #: ${paymentData.receiptNumber || 'REC-' + (paymentData.id ? String(paymentData.id).slice(0, 6).toUpperCase() : '001')}`, pageWidth - 14, 30, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Payment Date: ${formatDatePretty(paymentData.paymentTimestamp || paymentData.date || new Date())}`, pageWidth - 14, 36, { align: 'right' });
    if (paymentData.invoiceNumber || invoiceData.invoiceNumber) {
      doc.text(`Invoice Ref: #${paymentData.invoiceNumber || invoiceData.invoiceNumber}`, pageWidth - 14, 41, { align: 'right' });
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 46, pageWidth - 14, 46);

    // Paid Stamp (Watermark)
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setFontSize(90);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID IN FULL', pageWidth / 2, 140, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();

    // Client Info Box
    const clientName = customerData.gymName || customerData.name || paymentData.customerName || invoiceData.prospectName || 'Valued Client';
    const clientContact = customerData.contactPerson || customerData.name || '';
    const clientPhone = customerData.phone || '';

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 52, 95, 26, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 52, 95, 26, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('RECEIVED FROM:', 18, 59);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(clientName, 18, 66);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${clientContact ? 'Attn: ' + clientContact : ''} ${clientPhone ? '| ' + clientPhone : ''}`, 18, 73);

    // Payment Meta Box on Right
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 95, 52, 81, 26, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(pageWidth - 95, 52, 81, 26, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PAYMENT DETAILS:', pageWidth - 91, 59);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`Method: ${paymentData.paymentMethod || paymentData.paymentType || 'Bank Transfer'}`, pageWidth - 91, 66);
    doc.text(`Ref / Chq #: ${paymentData.referenceNumber || paymentData.reference || 'N/A'}`, pageWidth - 91, 72);

    // Payment Breakdown Table
    const paymentAmount = Number(paymentData.amount || 0);
    const invoiceTotal = Number(invoiceData.amount || paymentAmount);
    const remainingBalance = paymentData.remainingBalance !== undefined ? Number(paymentData.remainingBalance) : Math.max(0, invoiceTotal - paymentAmount);

    const tableBody = [
      [
        invoiceData.invoiceNumber ? `Payment against Invoice #${invoiceData.invoiceNumber}` : 'Account Settlement Deposit',
        formatDatePretty(paymentData.paymentTimestamp || paymentData.date),
        paymentData.paymentMethod || 'Bank Transfer',
        formatLKR(paymentAmount)
      ]
    ];

    runAutoTable(doc, {
      startY: 86,
      head: [['Transaction Particulars', 'Payment Date', 'Settlement Channel', 'Amount Paid']],
      body: tableBody,
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9.5,
        cellPadding: 4
      },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 9, cellPadding: 4.5, textColor: [30, 41, 59] }
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 90, currentY, 76, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(pageWidth - 90, currentY, 76, 28, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Amount Credited:', pageWidth - 86, currentY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatLKR(paymentAmount), pageWidth - 18, currentY + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Remaining Due:', pageWidth - 86, currentY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(remainingBalance > 0 ? [239, 68, 68] : [100, 116, 139]);
    doc.text(formatLKR(remainingBalance), pageWidth - 18, currentY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Recorded By:', pageWidth - 86, currentY + 23);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(paymentData.recordedBy || 'Accounts Desk', pageWidth - 18, currentY + 23, { align: 'right' });

    // Official Notes & Signatures
    currentY += 40;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY, 80, currentY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Finance Signatory', 14, currentY + 5);
    doc.text(`${companyName} Cash Management`, 14, currentY + 9);

    applyPageHeaderFooter(doc, {
      title: 'Payment Receipt',
      companyConfig: savedConfig,
      primaryColor
    });

    const fileName = `Receipt_${(paymentData.receiptNumber || 'REC').replace(/[^a-zA-Z0-9-]/g, '_')}_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    savePdfDoc(doc, fileName);
    return true;
  } catch (err) {
    console.error('Failed to generate payment receipt PDF:', err);
    alert('Could not generate receipt PDF: ' + err.message);
    return false;
  }
};

// 2. CUSTOMER STATEMENT PDF (Complete Transaction Ledger)
export const generateCustomerStatementPDF = (customer, invoices = [], payments = [], quotes = []) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6', [59, 130, 246]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName, 14, 20);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STATEMENT OF ACCOUNT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Statement Date: ${formatDatePretty(new Date())}`, pageWidth - 14, 26, { align: 'right' });
    doc.text(`Account Code: ${customer.customerCode || customer.id || 'CUST-001'}`, pageWidth - 14, 31, { align: 'right' });

    // Client Details
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 38, pageWidth - 28, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 38, pageWidth - 28, 22, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(customer.gymName || customer.name || 'Valued Client', 20, 47);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Contact: ${customer.contactPerson || customer.name || '—'} | Mobile: ${customer.phone || '—'} | Email: ${customer.email || '—'}`, 20, 54);

    // Compute Transactions
    const custInvoices = invoices.filter(inv => inv.customerId === customer.id || inv.prospectName === customer.gymName);
    const custPayments = payments.filter(p => p.customerId === customer.id || custInvoices.some(inv => inv.id === p.documentId));

    let totalBilled = custInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    let totalPaid = custPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    let netBalance = Math.max(0, totalBilled - totalPaid);

    // Transactions Table
    const rows = [];
    custInvoices.forEach(inv => {
      rows.push([
        formatDatePretty(inv.date),
        `Invoice #${inv.invoiceNumber}`,
        'Invoice Issued',
        formatLKR(inv.amount),
        '—'
      ]);
    });
    custPayments.forEach(p => {
      rows.push([
        formatDatePretty(p.paymentTimestamp || p.date),
        `Receipt #${p.receiptNumber || 'REC'}`,
        `Payment (${p.paymentMethod || 'Bank Transfer'})`,
        '—',
        formatLKR(p.amount)
      ]);
    });

    // Sort by date
    rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    runAutoTable(doc, {
      startY: 68,
      head: [['Date', 'Reference #', 'Transaction Details', 'Debit (Billed)', 'Credit (Paid)']],
      body: rows.length > 0 ? rows : [['—', 'No transactions found', 'Account has no billing records', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      styles: { fontSize: 8.5, cellPadding: 3.5 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 85, finalY, 71, 26, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(pageWidth - 85, finalY, 71, 26, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Total Invoiced:', pageWidth - 80, finalY + 6);
    doc.text(formatLKR(totalBilled), pageWidth - 18, finalY + 6, { align: 'right' });

    doc.text('Total Payments:', pageWidth - 80, finalY + 13);
    doc.text(formatLKR(totalPaid), pageWidth - 18, finalY + 13, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(netBalance > 0 ? [239, 68, 68] : [16, 185, 129]);
    doc.text('Net Balance Due:', pageWidth - 80, finalY + 21);
    doc.text(formatLKR(netBalance), pageWidth - 18, finalY + 21, { align: 'right' });

    applyPageHeaderFooter(doc, {
      title: 'Customer Statement',
      companyConfig: savedConfig,
      primaryColor
    });

    savePdfDoc(doc, `Customer_Statement_${(customer.gymName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (err) {
    console.error('Customer statement error:', err);
    alert('Failed to generate statement: ' + err.message);
  }
};

// 3. DEBTOR / OUTSTANDING REPORT PDF
export const generateDebtorReportPDF = (debtorsList, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#f59e0b', [245, 158, 11]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTS RECEIVABLE & DEBTORS REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`As of Date: ${formatDatePretty(new Date())} | Scope: Outstanding Invoices > LKR 0.00`, pageWidth - 14, 26, { align: 'right' });

    let grandTotalDebt = 0;
    const tableBody = (debtorsList || []).map(row => {
      const remaining = Number(row.outstanding || row.remainingBalance || 0);
      grandTotalDebt += remaining;
      return [
        row.customerName || row.gymName || 'Client',
        `#${row.invoiceNumber || '—'}`,
        formatDatePretty(row.date),
        formatDatePretty(row.dueDate),
        formatLKR(row.amount || row.total),
        formatLKR(row.paidAmount || row.paid),
        formatLKR(remaining),
        row.daysOverdue !== undefined ? `${row.daysOverdue}d` : '—',
        row.status || 'Pending'
      ];
    });

    runAutoTable(doc, {
      startY: 36,
      head: [['Customer', 'Invoice #', 'Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Aging', 'Status']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', '—', '—', '—', 'No outstanding debtors', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
        7: { halign: 'center' }
      },
      styles: { fontSize: 7.5, cellPadding: 3 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL RECOVERABLE RECEIVABLES:', pageWidth - 80, finalY, { align: 'right' });
    doc.setTextColor(220, 38, 38);
    doc.text(formatLKR(grandTotalDebt), pageWidth - 14, finalY, { align: 'right' });

    applyPageHeaderFooter(doc, {
      title: 'Debtor Aging Report',
      companyConfig: savedConfig,
      primaryColor: [245, 158, 11]
    });

    savePdfDoc(doc, `Debtor_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Debtor report error:', err);
    alert('Failed to generate debtor report: ' + err.message);
  }
};

// 4. SALES REVENUE & PERFORMANCE REPORT PDF
export const generateSalesReportPDF = (reportData, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6', [59, 130, 246]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('COMPREHENSIVE SALES & REVENUE REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${options.periodLabel || 'All Time'} | Generated: ${formatDatePretty(new Date())}`, pageWidth - 14, 26, { align: 'right' });

    // Summary Metric Cards
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 34, pageWidth - 28, 26, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 34, pageWidth - 28, 26, 'S');

    const colWidth = (pageWidth - 28) / 4;
    const metrics = [
      { label: 'TOTAL INVOICED', val: formatLKR(reportData.totalInvoiced) },
      { label: 'TOTAL COLLECTED', val: formatLKR(reportData.totalCollected) },
      { label: 'OUTSTANDING DEBT', val: formatLKR(reportData.totalOutstanding) },
      { label: 'CONVERSION RATE', val: `${reportData.conversionRate || 0}%` }
    ];

    metrics.forEach((m, idx) => {
      const x = 14 + (idx * colWidth) + 8;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, x, 42);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(idx === 1 ? [16, 185, 129] : idx === 2 ? [239, 68, 68] : [15, 23, 42]);
      doc.text(m.val, x, 52);
    });

    // Invoices Breakdown Table
    const invoiceRows = (reportData.invoices || []).map(inv => [
      formatDatePretty(inv.date),
      `#${inv.invoiceNumber}`,
      inv.clientName || inv.prospectName || 'Valued Client',
      inv.quoteNumber ? `#${inv.quoteNumber}` : 'Direct',
      formatLKR(inv.amount),
      inv.status || 'Draft'
    ]);

    runAutoTable(doc, {
      startY: 68,
      head: [['Invoice Date', 'Invoice #', 'Customer / Business', 'Linked Quote', 'Invoiced Amount', 'Status']],
      body: invoiceRows.length > 0 ? invoiceRows : [['—', '—', 'No invoices in selected period', '—', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 4: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3.5 }
    });

    applyPageHeaderFooter(doc, {
      title: 'Sales Report',
      companyConfig: savedConfig,
      primaryColor
    });

    savePdfDoc(doc, `Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Sales report error:', err);
    alert('Failed to generate sales report: ' + err.message);
  }
};

// 5. PAYMENT TRANSACTIONS REPORT PDF
export const generatePaymentReportPDF = (paymentsList, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#10b981', [16, 185, 129]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PAYMENT COLLECTIONS AUDIT REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${formatDatePretty(new Date())} | Scope: Verified Cash & Bank Deposits`, pageWidth - 14, 26, { align: 'right' });

    let totalCollected = 0;
    const tableBody = (paymentsList || []).map(p => {
      const amt = Number(p.amount || 0);
      totalCollected += amt;
      return [
        formatDatePretty(p.paymentTimestamp || p.date),
        p.receiptNumber || `REC-${String(p.id || '').slice(0, 6)}`,
        p.customerName || 'Client',
        p.invoiceNumber ? `#${p.invoiceNumber}` : '—',
        p.paymentMethod || p.paymentType || 'Bank Transfer',
        p.referenceNumber || p.reference || '—',
        p.recordedBy || 'Staff',
        formatLKR(amt)
      ];
    });

    runAutoTable(doc, {
      startY: 36,
      head: [['Date', 'Receipt #', 'Customer', 'Invoice #', 'Payment Method', 'Reference', 'Recorded By', 'Amount']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', 'No payment records found', '—', '—', '—', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 7: { halign: 'right', fontStyle: 'bold' } },
      styles: { fontSize: 7.5, cellPadding: 3.5 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DEPOSITS COLLECTED:', pageWidth - 80, finalY, { align: 'right' });
    doc.setTextColor(16, 185, 129);
    doc.text(formatLKR(totalCollected), pageWidth - 14, finalY, { align: 'right' });

    applyPageHeaderFooter(doc, {
      title: 'Payment Collections Audit',
      companyConfig: savedConfig,
      primaryColor: [16, 185, 129]
    });

    savePdfDoc(doc, `Payments_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Payment report error:', err);
    alert('Failed to generate payment report: ' + err.message);
  }
};

// 6. RENEWALS & RECURRING PIPELINE REPORT PDF
export const generateRenewalReportPDF = (renewalsList, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#8b5cf6', [139, 92, 246]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 92, 246);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SUBSCRIPTION RENEWALS & PIPELINE REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`As of Date: ${formatDatePretty(new Date())} | Scope: Monthly, Bi-Annual & Annual Accounts`, pageWidth - 14, 26, { align: 'right' });

    let totalProjected = 0;
    const tableBody = (renewalsList || []).map(r => {
      const fee = Number(r.annualFee || r.amount || 0);
      totalProjected += fee;
      return [
        r.gymName || r.name || 'Client',
        r.contactPerson || '—',
        r.phone || '—',
        r.renewalFrequency || 'Annual',
        formatDatePretty(r.renewalDate),
        formatLKR(fee),
        r.renewalStatus || r.status || 'Active'
      ];
    });

    runAutoTable(doc, {
      startY: 36,
      head: [['Client Gym / Business', 'Contact Person', 'Phone', 'Frequency', 'Renewal Date', 'Recurring Fee', 'Status']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', 'No renewals found', '—', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 5: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3.5 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL PROJECTED RECURRING VALUE:', pageWidth - 80, finalY, { align: 'right' });
    doc.setTextColor(139, 92, 246);
    doc.text(formatLKR(totalProjected), pageWidth - 14, finalY, { align: 'right' });

    applyPageHeaderFooter(doc, {
      title: 'Renewal Report',
      companyConfig: savedConfig,
      primaryColor: [139, 92, 246]
    });

    savePdfDoc(doc, `Renewals_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Renewal report error:', err);
    alert('Failed to generate renewal report: ' + err.message);
  }
};

// 7. STAFF PERFORMANCE TRACKING REPORT PDF
export const generateStaffPerformanceReportPDF = (staffStats, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1', [99, 102, 241]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('STAFF SALES PERFORMANCE REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${formatDatePretty(new Date())} | Scope: Staff Quota & Conversion Metrics`, pageWidth - 14, 26, { align: 'right' });

    const tableBody = (staffStats || []).map(s => [
      s.name || 'Staff Member',
      s.role || 'Sales Rep',
      String(s.quotesCreated || 0),
      String(s.quotesAccepted || 0),
      String(s.quotesRejected || 0),
      `${s.conversionRate || 0}%`,
      formatLKR(s.totalInvoiced),
      formatLKR(s.totalCollected)
    ]);

    runAutoTable(doc, {
      startY: 36,
      head: [['Staff Name', 'Role', 'Quotes Created', 'Accepted', 'Rejected', 'Conversion %', 'Total Invoiced', 'Total Collected']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', 'No staff performance data available', '—', '—', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 7.5, cellPadding: 3.5 }
    });

    applyPageHeaderFooter(doc, {
      title: 'Staff Performance Report',
      companyConfig: savedConfig,
      primaryColor: [99, 102, 241]
    });

    savePdfDoc(doc, `Staff_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Staff report error:', err);
    alert('Failed to generate staff performance report: ' + err.message);
  }
};

// 8. LEAD SOURCE ACQUISITION REPORT PDF
export const generateLeadSourceReportPDF = (leadStats, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#ec4899', [236, 72, 153]);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(236, 72, 153);
    doc.text(companyName, 14, 20);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('LEAD SOURCE ATTRIBUTION & ROI REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${formatDatePretty(new Date())} | Scope: Marketing Channel Attribution`, pageWidth - 14, 26, { align: 'right' });

    let grandTotalRevenue = 0;
    const tableBody = (leadStats || []).map(s => {
      const rev = Number(s.revenue || 0);
      grandTotalRevenue += rev;
      return [
        s.source || 'Walk-in',
        String(s.prospectCount || 0),
        String(s.convertedCount || 0),
        `${s.conversionRate || 0}%`,
        formatLKR(rev)
      ];
    });

    runAutoTable(doc, {
      startY: 36,
      head: [['Marketing / Lead Source', 'Total Inquiries', 'Converted Customers', 'Conversion Rate', 'Revenue Generated']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', 'No lead attribution data available', '—', '—']],
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 8, cellPadding: 3.5 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL REVENUE FROM ALL SOURCES:', pageWidth - 80, finalY, { align: 'right' });
    doc.setTextColor(236, 72, 153);
    doc.text(formatLKR(grandTotalRevenue), pageWidth - 14, finalY, { align: 'right' });

    applyPageHeaderFooter(doc, {
      title: 'Lead Source Report',
      companyConfig: savedConfig,
      primaryColor: [236, 72, 153]
    });

    savePdfDoc(doc, `Lead_Source_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Lead source report error:', err);
    alert('Failed to generate lead source report: ' + err.message);
  }
};

// 7. MANUFACTURING WORK ORDER & TRAVELER SHEET PDF
export const generateWorkOrderPDF = (order, bom, options = {}) => {
  try {
    const doc = createPDFDoc();
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'Seynex Technology';
    const primaryColor = [14, 165, 233]; // Sky blue / cyan for manufacturing
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 165, 233);
    doc.text(companyName, 14, 18);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('MANUFACTURING WORK ORDER & TRAVELER SHEET', 14, 26);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Job Traveler • Production Run • Generated: ${formatDatePretty(new Date())}`, 14, 32);

    // Meta Badge / Right-side Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 80, 10, 66, 25, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`MO #: ${order.orderNumber || 'MO-NEW'}`, pageWidth - 76, 17);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Priority: ${order.priority || 'Normal'}`, pageWidth - 76, 23);
    doc.text(`Status: ${order.status || 'Planned'}`, pageWidth - 76, 29);

    // Order Info Grid (Two columns)
    const startY = 40;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Finished Product:`, 18, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${order.productName || 'N/A'} (SKU: ${order.productSku || '—'})`, 52, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Batch / Lot #:`, 18, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${order.batchNumber || 'BATCH-' + (order.id || '001')}`, 52, startY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Assigned Line:`, 18, startY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${order.assignedTo || 'Assembly Line 1'}`, 52, startY + 18);

    // Right side col
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Batch Quantity:`, pageWidth / 2 + 10, startY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 165, 233);
    doc.text(`${order.quantityToProduce || 1} units`, pageWidth / 2 + 42, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Planned Start:`, pageWidth / 2 + 10, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${formatDatePretty(order.startDate)}`, pageWidth / 2 + 42, startY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Due / Delivery:`, pageWidth / 2 + 10, startY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${formatDatePretty(order.dueDate)}`, pageWidth / 2 + 42, startY + 18);

    // Bill of Materials Components Table
    const components = bom?.components || order.components || [];
    const qty = Number(order.quantityToProduce || 1);
    const bomRows = components.map((c, idx) => {
      const totalReq = (Number(c.quantity || 0) * qty);
      const lineCost = totalReq * Number(c.unitCost || 0);
      return [
        String(idx + 1),
        c.materialName || 'Component',
        c.materialSku || '—',
        `${c.quantity} ${c.unit || 'pcs'}`,
        `${totalReq.toLocaleString()} ${c.unit || 'pcs'}`,
        formatLKR(c.unitCost || 0),
        formatLKR(lineCost),
        '[   ] Picked'
      ];
    });

    runAutoTable(doc, {
      startY: startY + 30,
      head: [['#', 'Component / Raw Material', 'SKU', 'Per Unit', 'Batch Total', 'Unit Cost', 'Ext Cost', 'Stock Pick']],
      body: bomRows.length > 0 ? bomRows : [['—', 'No BOM components configured', '—', '—', '—', '—', '—', '—']],
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] }
      },
      styles: { fontSize: 7.5, cellPadding: 2.8 }
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    // Routing / Production Stages Table
    const stages = [
      ['1. Material Staging & Issue', 'Warehouse Team', 'Verify all lot-numbered raw materials and staging weights', '[   ] Passed'],
      ['2. Fabrication / Blending', 'Line Operator', 'Mix/assemble as per formulation specification guide', '[   ] Completed'],
      ['3. QC Inspection & Sampling', 'Quality Officer', 'Dimensional, chemical, or operational tolerance validation', '[   ] Approved'],
      ['4. Finished Packaging & Lot Labelling', 'Packaging Unit', 'Apply batch sticker, seal packaging & transfer to finished goods stock', '[   ] Stocked']
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('OPERATION ROUTING & PRODUCTION MILESTONES', 14, currentY);

    runAutoTable(doc, {
      startY: currentY + 3,
      head: [['Operation Step', 'Department / Station', 'Standard Work Instruction', 'Sign-Off & Status']],
      body: stages,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46 },
        1: { cellWidth: 36 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 32 }
      },
      styles: { fontSize: 7.5, cellPadding: 3 }
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // Financial & Cost summary Box
    const totalMat = (bom?.totalCostPerUnit || order.unitCost || 0) * qty;
    const labor = (bom?.laborCost || 0) * qty;
    const overhead = (bom?.overheadCost || 0) * qty;
    const grandCost = totalMat + labor + overhead;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('STANDARD ESTIMATED BATCH COST:', 18, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`Raw Materials: ${formatLKR(totalMat)}  |  Direct Labor: ${formatLKR(labor)}  |  Factory Overhead: ${formatLKR(overhead)}`, 18, currentY + 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 165, 233);
    doc.text(`Total Standard Batch Cost: ${formatLKR(grandCost)}`, pageWidth - 20, currentY + 11, { align: 'right' });

    currentY += 28;

    // Signatures
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    
    // Line 1: Production Supervisor
    doc.line(18, currentY + 14, 75, currentY + 14);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Production Supervisor Signature', 18, currentY + 19);

    // Line 2: QA Inspector
    doc.line(85, currentY + 14, 140, currentY + 14);
    doc.text('Quality Assurance (QA) Inspector', 85, currentY + 19);

    // Line 3: Warehouse Receiver
    doc.line(150, currentY + 14, pageWidth - 18, currentY + 14);
    doc.text('Finished Goods Warehouse Receiver', 150, currentY + 19);

    applyPageHeaderFooter(doc, {
      title: `Work Order ${order.orderNumber}`,
      companyConfig: savedConfig,
      primaryColor: [14, 165, 233]
    });

    savePdfDoc(doc, `Work_Order_${order.orderNumber || 'MO'}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Work order PDF error:', err);
    alert('Failed to generate Work Order PDF: ' + err.message);
  }
};


