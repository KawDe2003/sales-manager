import React from 'react';
import { HelpCircle, Mail, Phone, MessageCircle, BookOpen, FileText, ShieldCheck, Zap, ChevronRight } from 'lucide-react';

const faqs = [
  {
    q: 'How do I create a quotation?',
    a: 'Go to Proposals & Quotes → click "New Quotation". Fill in the client name, phone, add line items from inventory, and save. You can then share the quote via WhatsApp or SMS.',
  },
  {
    q: 'How do I convert a quote to an invoice?',
    a: 'After a quotation is marked as "Accepted", a green "Create Invoice" button appears on the quote card. Clicking it auto-generates an invoice and links it to the customer.',
  },
  {
    q: 'Can I edit a sent quotation or invoice?',
    a: 'No — once a document is sent to a client, it is locked to protect data integrity. You will see a 🔒 lock icon instead of the Edit button. To make changes, create a new document.',
  },
  {
    q: 'How does the Auto-Renewal Engine work?',
    a: 'In the Invoices page, click "Run Auto-Renewal". It automatically generates monthly recurring invoices for all active customers and sends SMS/WhatsApp renewal notifications.',
  },
  {
    q: 'How do I record a payment?',
    a: 'Go to Payments → click "Record Payment". Select the linked invoice, enter the amount, and save. The invoice balance due is automatically reduced.',
  },
  {
    q: 'How do I share a document with a client?',
    a: 'Each quotation and invoice has a unique shareable link. Click the 👁 Eye icon to preview, the 🔗 Link icon to copy the URL, or the WhatsApp icon to send it directly.',
  },
  {
    q: 'What is the client portal?',
    a: 'The shared document link opens a mobile-friendly secure page for your client. They can view the quotation or invoice, submit a counter offer, and download a PDF — no login required.',
  },
];

const HelpCenter = () => {
  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '60px' }}>
      <div className="page-hero">
        <div>
          <h1 className="h1 mb-2">Help Center</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>
            Guides, FAQs, and support contacts for Seynex Enterprise.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { icon: <BookOpen size={22} color="#6366f1" />, title: 'User Guide', desc: 'Step-by-step instructions for every module', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
          { icon: <FileText size={22} color="#10b981" />, title: 'Quotes & Invoices', desc: 'Creating, sending, locking, and converting documents', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { icon: <ShieldCheck size={22} color="#38bdf8" />, title: 'Security & Access', desc: 'Roles, permissions, and data protection', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
          { icon: <Zap size={22} color="#f59e0b" />, title: 'Automation', desc: 'Auto-renewal engine, SMS triggers, recurring invoices', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
        ].map(({ icon, title, desc, bg, border }) => (
          <div key={title} className="glass-panel hover-lift" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start', border: `1px solid ${border}`, background: bg }}>
            <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <HelpCircle size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Frequently Asked Questions
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} last={i === faqs.length - 1} />
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <MessageCircle size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Contact Support
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { icon: <Mail size={18} color="#6366f1" />, label: 'Email', value: 'seynextech@gmail.com', href: 'mailto:seynextech@gmail.com' },
            { icon: <Phone size={18} color="#10b981" />, label: 'Hotline', value: '072 840 8880', href: 'tel:+94728408880' },
            { icon: <MessageCircle size={18} color="#22c55e" />, label: 'WhatsApp', value: 'Chat with us', href: 'https://wa.me/94728408880' },
          ].map(({ icon, label, value, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px 18px', borderRadius: '12px',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--panel-border)',
                textDecoration: 'none', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
            >
              {icon}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              </div>
              <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const FaqItem = ({ q, a, last }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--panel-border)', paddingBottom: last ? 0 : '0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', gap: '12px',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{q}</span>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingBottom: '16px', paddingRight: '24px' }}>
          {a}
        </div>
      )}
    </div>
  );
};

export default HelpCenter;
