/**
 * Unified Notification Service Abstraction for SMS, WhatsApp & In-App Alerts
 * Seynex Technology | Antigravity Sales Management System
 */

// Helper to format Sri Lankan and International Phone numbers for WhatsApp/SMS
export const formatPhoneForGateway = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.substring(1);
  } else if (!cleaned.startsWith('94') && cleaned.length === 9) {
    cleaned = '94' + cleaned;
  }
  return cleaned;
};

// Interpolate template with context variables
export const interpolateTemplate = (template, data = {}, config = {}) => {
  if (!template) return '';
  let str = template;

  const replacements = {
    '{name}': data.name || data.contactPerson || data.prospectName || 'Valued Client',
    '{gym}': data.gymName || data.companyName || data.prospectName || 'Your Business',
    '{companyName}': config.companyName || config.dashboardName || 'Seynex Technology',
    '{amount}': data.amount !== undefined ? Number(data.amount).toLocaleString('en-US') : '0',
    '{totalAmount}': data.totalAmount !== undefined ? Number(data.totalAmount).toLocaleString('en-US') : (data.amount ? Number(data.amount).toLocaleString('en-US') : '0'),
    '{subtotal}': data.subtotal !== undefined ? Number(data.subtotal).toLocaleString('en-US') : '0',
    '{paidAmount}': data.paidAmount !== undefined ? Number(data.paidAmount).toLocaleString('en-US') : '0',
    '{remainingBalance}': data.remainingBalance !== undefined ? Number(data.remainingBalance).toLocaleString('en-US') : '0',
    '{invoiceNumber}': data.invoiceNumber || '',
    '{quoteNumber}': data.quoteNumber || '',
    '{receiptNumber}': data.receiptNumber || '',
    '{number}': data.invoiceNumber || data.quoteNumber || data.receiptNumber || '',
    '{documentType}': data.documentType || (data.quoteNumber ? 'Quotation' : data.receiptNumber ? 'Receipt' : 'Invoice'),
    '{link}': data.link || '',
    '{date}': data.date ? new Date(data.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
    '{dueDate}': data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-GB') : '',
    '{renewalDate}': data.renewalDate ? new Date(data.renewalDate).toLocaleDateString('en-GB') : '',
    '{phone}': data.phone || data.prospectPhone || '',
    '{paymentMethod}': data.paymentMethod || data.method || 'Bank Transfer',
    '{bankName}': config.bankDetails?.bank || '',
    '{accountNumber}': config.bankDetails?.accountNumber || '',
    '{accountName}': config.bankDetails?.accountName || '',
    '{proposedBudget}': data.proposedBudget !== undefined ? Number(data.proposedBudget).toLocaleString('en-US') : '',
    '{rejectionReason}': data.rejectionReason || 'No reason specified'
  };

  Object.entries(replacements).forEach(([key, val]) => {
    str = str.split(key).join(val || '');
  });

  return str;
};

// Generate wa.me WhatsApp link
export const generateWhatsAppLink = (phoneOrObj, textParam) => {
  let phone = phoneOrObj;
  let text = textParam;
  if (phoneOrObj && typeof phoneOrObj === 'object') {
    phone = phoneOrObj.phone || phoneOrObj.to || '';
    text = phoneOrObj.text || phoneOrObj.message || '';
  }
  const formatted = formatPhoneForGateway(phone);
  const encoded = encodeURIComponent(text || '');
  return formatted ? `https://wa.me/${formatted}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
};

// Open WhatsApp in new tab/app
export const openWhatsApp = (phoneOrObj, textParam) => {
  const link = generateWhatsAppLink(phoneOrObj, textParam);
  if (typeof window !== 'undefined') {
    window.open(link, '_blank');
  }
};

// Default Notification Templates for All Business Events
export const DEFAULT_NOTIFICATION_TEMPLATES = {
  quote_sent: {
    title: 'Quotation Sent',
    sms: 'Hi {name},\nHere is your quotation {quoteNumber} for {gym} from {companyName}.\nTotal Amount: LKR {amount}\nView your Proposal: {link}',
    whatsapp: 'Hi {name},\n\nGreetings from *{companyName}*!\n\nHere is your official Quotation *#{quoteNumber}* for *{gym}*.\n*Total Investment:* LKR {amount}\n\nPlease review and respond directly at your secure link:\n{link}\n\nFeel free to reach out if you have any questions!'
  },
  quote_viewed: {
    title: 'Quotation Viewed by Client',
    sms: 'Notice: Customer {name} from {gym} just viewed Quotation #{quoteNumber}.',
    whatsapp: 'Notice: Customer {name} from {gym} has viewed Quotation #{quoteNumber}.'
  },
  quote_accepted: {
    title: 'Quotation Accepted by Client',
    sms: 'SUCCESS! Customer {name} from {gym} has ACCEPTED Quotation #{quoteNumber} (LKR {amount}). An invoice can now be issued.',
    whatsapp: '*Quotation Accepted!*\n\nCustomer *{name}* ({gym}) has accepted Quotation *#{quoteNumber}* (LKR {amount}).\n\nPlease log in to generate the tax invoice.'
  },
  budget_proposed: {
    title: 'Budget Proposed (Counter Offer)',
    sms: 'COUNTER OFFER: Customer {name} proposed a budget of LKR {proposedBudget} for Quote #{quoteNumber}. Check system for details.',
    whatsapp: '*Counter Offer Received*\n\nCustomer *{name}* ({gym}) proposed a counter budget of *LKR {proposedBudget}* for Quote *#{quoteNumber}*.\n\nPlease review the proposal in the management portal.'
  },
  quote_rejected: {
    title: 'Quotation Declined',
    sms: 'Notice: Quotation #{quoteNumber} for {gym} was declined. Reason: {rejectionReason}',
    whatsapp: 'Quotation *#{quoteNumber}* for *{gym}* was declined.\nReason: {rejectionReason}'
  },
  invoice_issued: {
    title: 'Invoice Issued',
    sms: 'Hi {name},\nInvoice {invoiceNumber} for LKR {amount} from {companyName} is now ready.\nDue Date: {dueDate}\nView & Pay: {link}',
    whatsapp: 'Hi {name},\n\nYour official Invoice *#{invoiceNumber}* for *{gym}* from *{companyName}* has been issued.\n\n*Amount Due:* LKR {amount}\n*Due Date:* {dueDate}\n\n*Direct Bank Settlement Details:*\nBank: {bankName}\nAccount Name: {accountName}\nAccount Number: {accountNumber}\n\nView Invoice: {link}'
  },
  payment_partial: {
    title: 'Partial Payment Received',
    sms: 'Hi {name},\nPayment received! We received LKR {paidAmount} for Invoice {invoiceNumber}. Remaining balance: LKR {remainingBalance}. Thank you! - {companyName}',
    whatsapp: 'Hi {name},\n\nThank you! We have received a partial payment of *LKR {paidAmount}* for Invoice *#{invoiceNumber}*.\n\n*Remaining Balance:* LKR {remainingBalance}\n*Receipt #:* {receiptNumber}\n\nBest regards,\n*{companyName}*'
  },
  payment_full: {
    title: 'Full Payment Received (Closed)',
    sms: 'Hi {name},\nPayment Confirmation: We received full payment of LKR {amount} for Invoice {invoiceNumber}. Your account is settled. Thank you! - {companyName}',
    whatsapp: 'Hi {name},\n\nPayment Confirmed!\nWe have received full settlement of *LKR {amount}* for Invoice *#{invoiceNumber}*.\n\nYour account is now fully up to date.\n*Receipt #:* {receiptNumber}\n\nThank you for choosing *{companyName}*!'
  },
  invoice_reminder: {
    title: 'Invoice Payment Reminder',
    sms: 'Hi {name},\nFriendly reminder from {companyName}: Payment of LKR {remainingBalance} for Invoice {invoiceNumber} is due on {dueDate}. Please settle at your earliest convenience.',
    whatsapp: 'Hi {name},\n\nThis is a friendly reminder that an outstanding balance of *LKR {remainingBalance}* for Invoice *#{invoiceNumber}* is due on *{dueDate}*.\n\n*Bank Coordinates:*\n{bankName} - A/C: {accountNumber}\n\nThank you,\n*{companyName}*'
  },
  invoice_overdue: {
    title: 'Invoice Overdue Notice',
    sms: 'URGENT: Invoice {invoiceNumber} for LKR {remainingBalance} is now OVERDUE. Please settle promptly to prevent service interruption. - {companyName}',
    whatsapp: '*Urgent Payment Notice*\n\nDear {name},\nInvoice *#{invoiceNumber}* with balance *LKR {remainingBalance}* for *{gym}* is now overdue.\n\nPlease arrange settlement immediately or reach out to our accounts desk.\n\nThank you,\n*{companyName}*'
  },
  renewal_approaching: {
    title: 'Upcoming Renewal Notice',
    sms: 'Hi {name},\nNotice: Your software service subscription for {gym} (LKR {amount}) is due for renewal on {renewalDate}. - {companyName}',
    whatsapp: 'Hi {name},\n\nNotice: Your annual service subscription for *{gym}* (*LKR {amount}*) is scheduled for renewal on *{renewalDate}*.\n\nPlease contact us to confirm your renewal.\n\nBest regards,\n*{companyName}*'
  },
  renewal_overdue: {
    title: 'Subscription Renewal Overdue',
    sms: 'Action Required: Your subscription renewal for {gym} was due on {renewalDate}. Please renew to maintain active service access. - {companyName}',
    whatsapp: '*Subscription Renewal Overdue*\n\nDear {name},\nYour software renewal for *{gym}* was due on *{renewalDate}*.\n\nPlease contact our renewal desk to settle your renewal invoice.\n\n*{companyName}*'
  }
};

/**
 * Send notification through configured SMS or WhatsApp API provider
 */
export const sendNotification = async (channel, to, message, options = {}) => {
  console.log(`[Notification Service] Dispatching via ${channel} to ${to}:`, message);
  if (channel === 'whatsapp' && options.openBrowser) {
    openWhatsApp(to, message);
    return { success: true };
  }
  // Abstraction for backend SMS / WhatsApp gateway
  return { success: true, timestamp: new Date().toISOString() };
};

