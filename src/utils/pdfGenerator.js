import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper for converting hex color code to RGB array
const hexToRgb = (hex, defaultRgb = [59, 130, 246]) => {
  if (!hex) return defaultRgb;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : defaultRgb;
};

// Generic PDF Generator for both Invoices and Quotations
export const generateDocumentPDF = (type, documentData, items) => {
  try {
    const doc = new jsPDF();

    // Load company config from localStorage
    const savedConfig = JSON.parse(localStorage.getItem('gym_sms_config') || '{}');
    const companyName = savedConfig.companyName || 'GymSales Pro';
    const companyAddress = savedConfig.companyAddress || 'Seynex Technologies';
    const companyEmail = savedConfig.companyEmail || 'seynextech@gmail.com';
    const companyPhone = savedConfig.companyPhone || '';

    // Normalise type string
    const isInvoice = type?.toLowerCase().includes('invoice');
    const isReceipt = type?.toLowerCase().includes('receipt');
    const docTitle = isReceipt ? 'PAYMENT RECEIPT' : isInvoice ? 'INVOICE' : 'QUOTATION';

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6');
    const textColor = [40, 40, 40];
    const lightGray = [240, 240, 240];
    const pageHeight = doc.internal.pageSize.getHeight();

    // Safe field reads — guard every potentially-undefined field
    const isReceiptDoc = isReceipt;
    const docNumber = isReceiptDoc
      ? (documentData?.receiptNumber || documentData?.referenceNumber || documentData?.invoiceNumber || 'REC-001')
      : (isInvoice ? documentData?.invoiceNumber : documentData?.quoteNumber) || 'N/A';
    const targetName = (isInvoice ? (documentData?.gymName || documentData?.prospectName) : (documentData?.prospectName || documentData?.gymName)) || 'Valued Client';
    const dateStr = documentData?.date ? new Date(documentData.date).toLocaleDateString() : '—';
    const dueDateStr = documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : '—';

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

    const totalAmount = isReceiptDoc
      ? Number(documentData?.amountPaidNow ?? documentData?.amount ?? (subTotal - discountAmount))
      : (subTotal - discountAmount);

    // Add company logo if available (priority logic)
    if (savedConfig.receiptLogo) {
      try {
        // We use receiptLogo as the general company logo for all documents
        doc.addImage(savedConfig.receiptLogo, 'PNG', 14, 12, 32, 32);
      } catch (e) {
        console.warn('Logo rendering failed:', e);
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 14, 22);
      }
    } else {
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(companyName, 14, 22);
    }


    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(companyAddress, 14, 28);
    doc.text(`Email: ${companyEmail}`, 14, 33);
    if (companyPhone) doc.text(`Phone: ${companyPhone}`, 14, 38);

    // Doc Type Title (right side)
    doc.setFontSize(24);
    doc.setTextColor(20, 20, 20);
    doc.text(docTitle, 196, 22, { align: 'right' });

    // Doc meta (right side)
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${isReceiptDoc ? 'Receipt' : isInvoice ? 'Invoice' : 'Quote'} #: ${docNumber}`, 196, 31, { align: 'right' });
    doc.text(`Date: ${dateStr}`, 196, 37, { align: 'right' });
    if (isInvoice) {
      doc.text(`Due Date: ${dueDateStr}`, 196, 43, { align: 'right' });
    } else if (isReceiptDoc) {
      if (documentData?.invoiceNumber) {
        doc.text(`Invoice Ref: #${documentData.invoiceNumber}`, 196, 43, { align: 'right' });
      }
      if (documentData?.method || documentData?.paymentMethod) {
        doc.text(`Payment: ${documentData.method || documentData.paymentMethod}`, 196, 49, { align: 'right' });
      }
    }

    // PAID Watermark for Invoices marked as Paid or Receipts
    if (isReceipt || (isInvoice && documentData?.status === 'Paid')) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.setFontSize(100);
      doc.setTextColor(22, 197, 94); // Success green
      doc.setFont(undefined, 'bold');
      doc.text('PAID', 105, 150, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
    }

    // ── Bill To / Received From ─────────────────────────────────────────────
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, 50, 85, 8, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(isReceiptDoc ? 'RECEIVED FROM:' : 'BILL TO:', 16, 56);
    doc.setFont(undefined, 'normal');
    doc.text(targetName, 16, 66);

    // ── Line Items Table ──────────────────────────────────────────────────────
    let tableBody = [];
    if (standardItems.length > 0) {
      tableBody = standardItems.map(item => [
        item.name || 'Item',
        item.type || 'Service',
        `LKR ${getItemPrice(item).toLocaleString()}`,
        String(getItemQty(item)),
        `LKR ${getItemTotal(item).toLocaleString()}`
      ]);
    } else {
      tableBody = [
        [isReceiptDoc ? 'Payment Credit for Account Services' : 'Software Package / Services', 'Package', `LKR ${subTotal.toLocaleString()}`, '1', `LKR ${subTotal.toLocaleString()}`]
      ];
    }

    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Type', 'Unit Price', 'Qty', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 10, textColor }
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    let finalY = (doc.lastAutoTable?.finalY || 120) + 10;

    if (discountAmount > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Subtotal:', 140, finalY + 8, { align: 'right' });
      doc.text(`LKR ${subTotal.toLocaleString()}`, 196, finalY + 8, { align: 'right' });
      
      finalY += 6;
      doc.setTextColor(220, 38, 38);
      doc.text('Discount:', 140, finalY + 8, { align: 'right' });
      doc.text(`- LKR ${discountAmount.toLocaleString()}`, 196, finalY + 8, { align: 'right' });
      finalY += 6;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(isReceiptDoc ? 'Total Paid:' : 'Total Amount:', 140, finalY + 8, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`LKR ${totalAmount.toLocaleString()}`, 196, finalY + 8, { align: 'right' });

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

      autoTable(doc, {
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

    // Default Notes & Footer
    const footerMsg = isReceipt 
      ? 'This is a computer generated receipt. No signature required.' 
      : (savedConfig.pdfFooterText || (isInvoice ? 'Thank you for your business.' : 'Valid for 30 days.'));

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(footerMsg, 14, pageHeight - 20);

    if (savedConfig.pdfNotes) {
      doc.setFontSize(7);
      doc.text(savedConfig.pdfNotes, 14, pageHeight - 14);
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const safeDocPrefix = isReceiptDoc ? 'Receipt' : isInvoice ? 'Invoice' : 'Quote';
    const safeFileName = `${safeDocPrefix}_${docNumber}_${(targetName).replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(safeFileName);

  } catch (err) {
    console.error('PDF generation error details:', err.message, err.stack);
    alert(`Could not generate PDF: ${err.message || 'Unknown error'}. Please check the console.`);
  }
};

// Stock Report Generator
export const generateStockReportPDF = (inventoryItems) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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
    doc.text('Professional Stock Report - Generated by GymSales Management System', 14, pageHeight - 15);

    doc.save(`Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (err) {
    console.error('Stock Report error:', err);
    alert('Failed to generate report. Check console.');
  }
};

// Accounting Summary Report Generator
export const generateAccountingReportPDF = (data) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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

    doc.save(`Accounting_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Accounting Report error:', err);
  }
};

// Formal Corporate Profit & Loss Statement (P&L) PDF Generator
export const generatePnLReportPDF = (pnlData) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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
    doc.text('This Profit & Loss Statement is automatically generated by GymSales Pro Management System.', 105, finalY, { align: 'center' });

    doc.save(`PnL_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('PnL PDF error:', err);
  }
};

// Print Formal Corporate Profit & Loss Statement (P&L) Document
export const printPnLReportPDF = (pnlData) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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
    doc.text('This Profit & Loss Statement is automatically generated by GymSales Pro Management System.', 105, finalY, { align: 'center' });

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
    const doc = new jsPDF();
    const primaryColor = [30, 41, 59]; // Slate 800

    const cName = companyName || 'GymSales Pro Enterprise';
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

    autoTable(doc, {
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

    autoTable(doc, {
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

    autoTable(doc, {
      startY: 42,
      head: [['Cash Flow Item', 'Amount (LKR)']],
      body: cfBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const cleanFileName = `SLFRS_Statements_${(periodLabel || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(cleanFileName);
  } catch (err) {
    console.error('Failed to generate SLFRS Statements PDF:', err);
  }
};

// Export Account Ledger Statement (T-Account History) PDF
export const exportAccountLedgerPDF = ({ account, lines = [], journalEntries = [], startDate, endDate }) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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
    doc.save(cleanFileName);
  } catch (err) {
    console.error('Failed to export Account Ledger PDF:', err);
  }
};

// Export General Journal Voucher PDF
export const exportJournalVoucherPDF = ({ entry, lines = [], accounts = [] }) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
      startY: 44,
      head: [['Account Description', 'Type', 'Debit (LKR)', 'Credit (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      styles: { fontSize: 8.5, cellPadding: 4 }
    });

    const cleanFileName = `Journal_Voucher_${(entry?.reference || 'Voucher').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(cleanFileName);
  } catch (err) {
    console.error('Failed to export Journal Voucher PDF:', err);
  }
};

// Export Trial Balance PDF
export const exportTrialBalancePDF = ({ accounts = [], journalLines = [], journalEntries = [], asOfDate }) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
      startY: 38,
      head: [['Code', 'Account Name', 'Type', 'Debit Balance (LKR)', 'Credit Balance (LKR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const cleanFileName = `Trial_Balance_${(asOfDate || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(cleanFileName);
  } catch (err) {
    console.error('Failed to export Trial Balance PDF:', err);
  }
};

// Official Purchase Order PDF Generator
export const generatePurchaseOrderPDF = (poData) => {
  try {
    const doc = new jsPDF();
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

    autoTable(doc, {
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

    // ── Grand Total ──────────────────────────────────────────────────────────
    const totalY = (doc.lastAutoTable?.finalY || tableStartY + 30) + 8;
    const totalAmount = Number(poData.totalAmount) || items.reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)), 0);

    // Total box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, totalY, pageWidth - 28, 20, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, totalY, pageWidth - 28, 20, 3, 3, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Total Purchase Order Value:', 20, totalY + 13);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`LKR ${totalAmount.toLocaleString()}`, pageWidth - 20, totalY + 13, { align: 'right' });

    // ── Notes / Terms ────────────────────────────────────────────────────────
    let notesY = totalY + 32;
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
    doc.save(safeFileName);

  } catch (err) {
    console.error('Purchase Order PDF generation error:', err);
    alert(`Could not generate Purchase Order PDF: ${err.message || 'Unknown error'}`);
  }
};
