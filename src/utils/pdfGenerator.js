import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [59, 130, 246]; // Default blue
    };

    const primaryColor = hexToRgb(savedConfig.pdfColor || '#3b82f6');
    const textColor = [40, 40, 40];
    const lightGray = [240, 240, 240];
    const pageHeight = doc.internal.pageSize.getHeight();

    // Safe field reads — guard every potentially-undefined field
    const docNumber = (isInvoice ? documentData?.invoiceNumber : documentData?.quoteNumber) || 'N/A';
    const targetName = (isInvoice ? (documentData?.gymName || documentData?.prospectName) : (documentData?.prospectName || documentData?.gymName)) || 'Valued Client';
    const dateStr = documentData?.date ? new Date(documentData.date).toLocaleDateString() : '—';
    const dueDateStr = documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : '—';

    const itemsList = Array.isArray(items) && items.length > 0 ? items : (documentData?.items || []);
    const standardItems = itemsList.filter(i => !i.isDiscount);
    const discountItem = itemsList.find(i => i.isDiscount);
    const discountAmount = discountItem ? Math.abs(discountItem.price) : 0;

    const subTotal = standardItems.length > 0
      ? standardItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
      : Number(documentData?.amount || 0) + discountAmount;

    const totalAmount = subTotal - discountAmount;

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
    doc.text(`${(isInvoice || isReceipt) ? 'Invoice' : 'Quote'} #: ${docNumber}`, 196, 31, { align: 'right' });
    doc.text(`Date: ${dateStr}`, 196, 37, { align: 'right' });
    if (isInvoice || isReceipt) {
      doc.text(`Due Date: ${dueDateStr}`, 196, 43, { align: 'right' });
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

    // ── Bill To ───────────────────────────────────────────────────────────────
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, 50, 85, 8, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('BILL TO:', 16, 56);
    doc.setFont(undefined, 'normal');
    doc.text(targetName, 16, 66);

    // ── Line Items Table ──────────────────────────────────────────────────────
    let tableBody = [];
    if (standardItems.length > 0) {
      tableBody = standardItems.map(item => [
        item.name || 'Item',
        item.type || 'Service',
        `LKR ${Number(item.price || 0).toLocaleString()}`,
        String(item.quantity || 1),
        `LKR ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}`
      ]);
    } else {
      tableBody = [
        ['Software Package / Services', 'Package', `LKR ${subTotal.toLocaleString()}`, '1', `LKR ${subTotal.toLocaleString()}`]
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
    doc.text('Total Amount:', 140, finalY + 8, { align: 'right' });

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
    const safeFileName = `${docNumber}_${(targetName).replace(/[^a-z0-9]/gi, '_')}.pdf`;
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
    
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [59, 130, 246];
    };

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
    
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [59, 130, 246];
    };

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

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [99, 102, 241];
    };
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1');
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

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [99, 102, 241];
    };
    const primaryColor = hexToRgb(savedConfig.pdfColor || '#6366f1');
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
      if (isNaN(num)) return '—';
      return num < 0 ? `(${Math.abs(num).toLocaleString()})` : num.toLocaleString();
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
      ['Cost of Sales', `(${fmt(pnl.current.costOfSales)})`, `(${fmt(pnl.prior.costOfSales)})`],
      [{ content: 'Gross Profit', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.grossProfit), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.grossProfit), styles: { fontStyle: 'bold' } }],
      ['Other Income', fmt(pnl.current.otherIncome), fmt(pnl.prior.otherIncome)],
      ['Distribution Costs', `(${fmt(pnl.current.distributionCosts)})`, `(${fmt(pnl.prior.distributionCosts)})`],
      ['Administrative Expenses', `(${fmt(pnl.current.adminExpenses)})`, `(${fmt(pnl.prior.adminExpenses)})`],
      ['Other Expenses', `(${fmt(pnl.current.otherExpenses)})`, `(${fmt(pnl.prior.otherExpenses)})`],
      [{ content: 'Operating Profit', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.operatingProfit), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.operatingProfit), styles: { fontStyle: 'bold' } }],
      ['Finance Income', fmt(pnl.current.financeIncome), fmt(pnl.prior.financeIncome)],
      ['Finance Costs', `(${fmt(pnl.current.financeCosts)})`, `(${fmt(pnl.prior.financeCosts)})`],
      [{ content: 'Profit Before Tax', styles: { fontStyle: 'bold' } }, { content: fmt(pnl.current.profitBeforeTax), styles: { fontStyle: 'bold' } }, { content: fmt(pnl.prior.profitBeforeTax), styles: { fontStyle: 'bold' } }],
      ['Income Tax Expense', `(${fmt(pnl.current.taxExpense)})`, `(${fmt(pnl.prior.taxExpense)})`],
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
      ['Income Tax Paid', `(${fmt(cf.operating.taxPaid)})`],
      [{ content: 'Net Cash from Operating Activities', styles: { fontStyle: 'bold' } }, { content: fmt(cf.operating.netCashOperating), styles: { fontStyle: 'bold' } }],

      [{ content: 'Cash Flows from Investing Activities', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['Purchase of Property, Plant & Equipment', `(${fmt(cf.investing.ppePurchase)})`],
      [{ content: 'Net Cash used in Investing Activities', styles: { fontStyle: 'bold' } }, { content: fmt(cf.investing.netCashInvesting), styles: { fontStyle: 'bold' } }],

      [{ content: 'Cash Flows from Financing Activities', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 245] } }],
      ['Proceeds from Borrowings', fmt(cf.financing.loanProceeds)],
      ['Repayment of Borrowings', `(${fmt(cf.financing.loanRepayments)})`],
      ['Owner\'s Drawings / Dividends Paid', `(${fmt(cf.financing.drawingsPaid)})`],
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

    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  } catch (err) {
    console.error('Failed to generate SLFRS Statements PDF:', err);
  }
};
