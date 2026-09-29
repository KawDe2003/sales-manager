import React, { useState, useContext, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Zap, ShoppingCart, Plus, Minus, Trash2, Printer, 
  CheckCircle, Search, User, CreditCard, DollarSign, 
  X, Check, ArrowRight, Package, Sparkles, Building2,
  Clock, AlertCircle, Phone, MapPin, Receipt, Share2,
  ArrowLeft
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const HAIR_PIN_PRESETS = [
  { id: 'hp-1', name: 'Classic Black Bobby Pins (2-Inch)', unit: 'Pkt', price: 250, category: 'Bobby Pins', desc: 'Gloss black enamel, ball tips (30 pcs/pkt)' },
  { id: 'hp-2', name: 'Golden Wave Hair Grips (Carded)', unit: 'Card', price: 320, category: 'Wave Grips', desc: 'Firm wave grip 12-pin card' },
  { id: 'hp-3', name: 'Salon Jumbo U-Pins (100 pcs Box)', unit: 'Box', price: 450, category: 'U-Pins', desc: 'Heavy duty bridal bun pins' },
  { id: 'hp-4', name: 'Classic Snap Clips (1 Dozen Card)', unit: 'Dozen', price: 380, category: 'Snap Clips', desc: 'Black & assorted colors' },
  { id: 'hp-5', name: 'Kids Pastel Hair Clips (12-Card)', unit: 'Card', price: 420, category: 'Kids Clips', desc: 'Hanging display card with floral motifs' },
  { id: 'hp-6', name: 'Fancy Pearl & Crystal Hair Pins (Set 6)', unit: 'Set', price: 850, category: 'Fancy & Bridal', desc: 'Handcrafted floral wire pins' },
  { id: 'hp-7', name: 'Wholesale Bobby Pins (1 Gross / 144 pcs)', unit: 'Gross', price: 720, category: 'Wholesale Packs', desc: '12 dozen trade master pack' },
  { id: 'hp-8', name: 'Master Carton Bobby Pins (50 Gross)', unit: 'Carton', price: 34000, category: 'Wholesale Packs', desc: '7,200 pins bulk wholesale carton' },
  { id: 'hp-9', name: 'Brown / Blonde Bobby Pins (2-Inch)', unit: 'Pkt', price: 280, category: 'Bobby Pins', desc: 'Color matched hair styling pins' },
  { id: 'hp-10', name: 'Mini Black Hair Grips (1.5-Inch)', unit: 'Pkt', price: 220, category: 'Bobby Pins', desc: 'Fine hair & kids bobby pins' },
  { id: 'hp-11', name: 'U-Pins Bridal Golden (50 pcs)', unit: 'Pkt', price: 380, category: 'U-Pins', desc: 'Bridal bun golden hair pins' },
  { id: 'hp-12', name: 'Black Matte Snap Hair Clips (Large)', unit: 'Card', price: 350, category: 'Snap Clips', desc: 'Matte coated 6-piece card' }
];

const QuickSaleModal = ({ isOpen, onClose }) => {
  const { 
    customers = [], 
    inventory = [], 
    addInvoice, 
    addCustomer,
    recordEnhancedPayment,
    smsConfig = {},
    theme = 'dark',
    showNotification,
    syncAllToCloud
  } = useContext(StoreContext) || {};

  const isDark = theme !== 'light';

  // Responsive mobile screen detection
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mobileTab, setMobileTab] = useState('items'); // 'items' | 'checkout'

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Sale Items in Cart
  const [cart, setCart] = useState([]);
  
  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState('walk-in'); // 'walk-in' | customer.id | 'new'
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Credit' | 'Bank'
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Search & Filtering products
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Success / Receipt View
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setMobileTab('items');
    } else {
      document.body.style.overflow = '';
      setCompletedInvoice(null);
      setCart([]);
      setProductSearch('');
      setSelectedCustomerId('walk-in');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Hair pin products: Hair Pin presets + any inventory items that are hair pin related
  const availableProducts = useMemo(() => {
    // Start with hair pin presets as top items
    const list = [...HAIR_PIN_PRESETS];

    // Filter existing inventory to only include hair pin / salon / accessory items
    // (exclude unrelated hardware like Face ID machines, gym equipment, etc.)
    const isUnwantedHardware = (name, cat, type) => {
      const text = `${name || ''} ${cat || ''} ${type || ''}`.toLowerCase();
      const hardwareWords = ['zkteco', 'face id', 'turnstile', 'biometric', 'access control', 'treadmill', 'dumbbell', 'barbell', 'gym'];
      return hardwareWords.some(w => text.includes(w));
    };

    inventory.forEach((item) => {
      if (isUnwantedHardware(item.name, item.category, item.type)) {
        return; // Skip hardware
      }
      const alreadyInPresets = list.some(p => p.name.toLowerCase() === (item.name || '').toLowerCase());
      if (!alreadyInPresets) {
        list.push({
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          unit: item.unit || item.outputUnit || 'Pkt',
          category: item.category || item.type || 'Hair Pins',
          desc: item.description || ''
        });
      }
    });

    return list;
  }, [inventory]);

  const categories = useMemo(() => {
    const cats = new Set(['All']);
    availableProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    return availableProducts.filter(p => {
      const q = productSearch.toLowerCase();
      const matchesSearch = !productSearch || 
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.desc && p.desc.toLowerCase().includes(q));
      
      const matchesCat = selectedCategory === 'All' || 
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      
      return matchesSearch && matchesCat;
    });
  }, [availableProducts, productSearch, selectedCategory]);

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id || item.name === product.name);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id || item.name === product.name)
            ? { ...item, qty: item.qty + 1, amount: (item.qty + 1) * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id || `cart-${Date.now()}`,
          name: product.name,
          unit: product.unit || 'Pkt',
          qty: 1,
          unitPrice: Number(product.price) || 0,
          amount: Number(product.price) || 0
        }
      ];
    });
  };

  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = Math.max(1, updated[index].qty + delta);
      updated[index] = {
        ...updated[index],
        qty: newQty,
        amount: newQty * updated[index].unitPrice
      };
      return updated;
    });
  };

  const setCartItemQtyDirect = (index, val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setCart(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        qty: num,
        amount: num * updated[index].unitPrice
      };
      return updated;
    });
  };

  const setCartItemPriceDirect = (index, val) => {
    const price = Math.max(0, parseFloat(val) || 0);
    setCart(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unitPrice: price,
        amount: updated[index].qty * price
      };
      return updated;
    });
  };

  const setCartItemUnitDirect = (index, unit) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unit: unit
      };
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    const discounted = subtotal - (Number(discountAmount) || 0);
    return Math.max(0, discounted);
  }, [subtotal, discountAmount]);

  const totalCartQty = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
  }, [cart]);

  // Selected customer info
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') {
      return { id: 'walk-in', name: 'Walk-in / Cash Counter', phone: '-', tag: 'Retail Cash' };
    }
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Handle Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showNotification?.('Please add at least one hair pin item to the bill.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let custId = selectedCustomerId;
      let custName = 'Walk-in Cash Customer';
      let custPhone = '';

      if (selectedCustomerId === 'new') {
        if (!newCustomerName.trim()) {
          showNotification?.('Please enter the customer / shop name.', 'error');
          setIsSubmitting(false);
          return;
        }
        const createdCustomer = {
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || '077 000 0000',
          gymName: newCustomerCity.trim() ? `${newCustomerName.trim()} (${newCustomerCity.trim()})` : newCustomerName.trim(),
          email: `${newCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@hairpins.lk`,
          status: 'Active',
          tag: 'Wholesale / Shop',
          purchaseDate: new Date().toISOString().split('T')[0]
        };
        addCustomer?.(createdCustomer);
        custId = createdCustomer.id || `c-${Date.now()}`;
        custName = createdCustomer.name;
        custPhone = createdCustomer.phone;
      } else if (selectedCustomerId !== 'walk-in' && activeCustomer) {
        custName = activeCustomer.name;
        custPhone = activeCustomer.phone || '';
      }

      const isCash = paymentMethod === 'Cash' || paymentMethod === 'Bank';
      const prefix = smsConfig.invoicePrefix || 'INV-';
      const nextNum = parseInt(smsConfig.nextInvoiceNumber || 1001);
      const invoiceNumber = `${prefix}${nextNum}`;
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];

      const invoiceData = {
        invoiceNumber,
        date: todayDate,
        dueDate: isCash ? todayDate : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        customerId: custId,
        prospectName: custName,
        customerName: custName,
        customerPhone: custPhone,
        amount: grandTotal,
        subtotal: subtotal,
        discount: Number(discountAmount) || 0,
        status: isCash ? 'Paid' : 'Sent',
        paidAmount: isCash ? grandTotal : 0,
        remainingBalance: isCash ? 0 : grandTotal,
        items: cart.map(i => ({
          name: i.name,
          unit: i.unit,
          qty: i.qty,
          unitPrice: i.unitPrice,
          amount: i.amount
        })),
        notes: notes || `Quick Hair Pin Sale (${paymentMethod})`,
        paymentMethod: paymentMethod,
        paidAt: isCash ? nowIso : null,
        payments: isCash ? [{
          id: `p-${Date.now()}`,
          amount: grandTotal,
          method: paymentMethod,
          date: todayDate,
          timestamp: nowIso
        }] : []
      };

      addInvoice?.(invoiceData);

      // Record payment for cash / bank
      if (isCash && recordEnhancedPayment) {
        try {
          recordEnhancedPayment({
            customerId: custId,
            documentId: invoiceData.id,
            amount: grandTotal,
            method: paymentMethod,
            notes: `Quick Sale #${invoiceNumber}`
          });
        } catch (e) {
          console.warn('[Quick Sale Payment Record]', e);
        }
      }

      setCompletedInvoice(invoiceData);
      showNotification?.(`Hair Pin Bill #${invoiceNumber} completed successfully!`, 'success');
      
      // Auto cloud sync
      setTimeout(() => {
        syncAllToCloud?.();
      }, 500);

    } catch (err) {
      console.error('[Quick Sale Error]', err);
      showNotification?.('Failed to save sale. Please check details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Print
  const handlePrintReceipt = () => {
    window.print();
  };

  // WhatsApp Bill Share (Direct for wholesale buyers in Pettah, Kandy, etc.)
  const handleShareWhatsApp = () => {
    if (!completedInvoice) return;
    const phone = completedInvoice.customerPhone?.replace(/[^0-9]/g, '') || '';
    const formattedPhone = phone.startsWith('0') ? '94' + phone.slice(1) : phone;
    const itemList = completedInvoice.items.map(i => `• ${i.name} - ${i.qty} ${i.unit} @ LKR ${i.unitPrice} = LKR ${i.amount.toLocaleString()}`).join('\n');
    const text = encodeURIComponent(
      `*INVOICE #${completedInvoice.invoiceNumber}*\n` +
      `*${smsConfig.companyName || 'Royal Hair Pin Industries'}*\n` +
      `Date: ${completedInvoice.date}\n` +
      `Customer: ${completedInvoice.customerName}\n\n` +
      `*Items:*\n${itemList}\n\n` +
      `*NET TOTAL: LKR ${completedInvoice.amount.toLocaleString()}*` +
      `\nPayment: ${completedInvoice.paymentMethod} (${completedInvoice.status})\n\n` +
      `Thank you for your business!`
    );
    const url = formattedPhone ? `https://wa.me/${formattedPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="modal-overlay"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        inset: 0,
        zIndex: 999999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: isMobile ? '0' : '16px',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '980px',
          maxWidth: '100%',
          height: isMobile ? '100dvh' : '90vh',
          maxHeight: isMobile ? '100dvh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          borderRadius: isMobile ? '0' : '20px',
          background: isDark ? '#0b1016' : '#ffffff',
          boxShadow: isDark 
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.2)' 
            : '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 30px rgba(217, 119, 6, 0.1)',
          border: isMobile ? 'none' : (isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(217, 119, 6, 0.25)'),
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1000000
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: isMobile ? '12px 16px' : '16px 24px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
          background: isDark 
            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(11, 16, 22, 0.95) 100%)' 
            : 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(255, 255, 255, 0.95) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: isMobile ? '34px' : '40px', 
              height: isMobile ? '34px' : '40px', 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
            }}>
              <Zap size={isMobile ? 18 : 22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  ⚡ Quick Hair Pin Billing
                </h2>
                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.25)', color: isDark ? '#fbbf24' : '#b45309', fontWeight: 800 }}>
                  EASY
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                {smsConfig.companyName || 'Royal Hair Pin Industries'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* MOBILE NAVIGATION TABS (When screen is narrow) */}
        {isMobile && !completedInvoice && (
          <div style={{
            display: 'flex',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(241, 245, 249, 0.8)',
            padding: '4px 8px',
            gap: '6px',
            flexShrink: 0
          }}>
            <button
              onClick={() => setMobileTab('items')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: mobileTab === 'items' ? 'var(--accent-primary)' : 'transparent',
                color: mobileTab === 'items' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Package size={15} /> 1. Pick Hair Pins
            </button>
            <button
              onClick={() => setMobileTab('checkout')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: mobileTab === 'checkout' ? '#10b981' : 'transparent',
                color: mobileTab === 'checkout' ? '#ffffff' : 'var(--text-secondary)',
                position: 'relative'
              }}
            >
              <ShoppingCart size={15} /> 2. Bill & Pay
              {cart.length > 0 && (
                <span style={{
                  background: mobileTab === 'checkout' ? '#ffffff' : '#f59e0b',
                  color: mobileTab === 'checkout' ? '#10b981' : '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {totalCartQty}
                </span>
              )}
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        {completedInvoice ? (
          /* RECEIPT / SUCCESS CONFIRMATION VIEW */
          <div style={{ padding: '24px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '12px', boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              Sale Completed Successfully!
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px', textAlign: 'center' }}>
              Invoice <strong style={{ color: 'var(--accent-primary)' }}>#{completedInvoice.invoiceNumber}</strong> saved. Stock deducted.
            </p>

            {/* PRINTABLE RECEIPT CARD */}
            <div 
              id="quick-sale-printable-receipt"
              style={{
                width: '100%',
                maxWidth: '440px',
                padding: '20px',
                borderRadius: '12px',
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.12)',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--panel-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {smsConfig.companyName || 'Royal Hair Pin Industries'}
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {smsConfig.companyAddress || 'Kelaniya, Sri Lanka'} | {smsConfig.companyPhone || '072 840 8880'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                  INVOICE #{completedInvoice.invoiceNumber}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <span>Date: {completedInvoice.date}</span>
                <span>Customer: <strong>{completedInvoice.prospectName}</strong></span>
              </div>

              <table style={{ width: '100%', fontSize: '0.78rem', marginBottom: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0' }}>Item</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedInvoice.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed var(--panel-border)' }}>
                      <td style={{ padding: '5px 0', color: 'var(--text-primary)' }}>{it.name}</td>
                      <td style={{ padding: '5px 0', textAlign: 'center' }}>{it.qty} {it.unit}</td>
                      <td style={{ padding: '5px 0', textAlign: 'right' }}>{it.unitPrice}</td>
                      <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700 }}>LKR {it.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px', fontSize: '0.82rem' }}>
                {completedInvoice.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', marginBottom: '4px' }}>
                    <span>Discount:</span>
                    <span>- LKR {completedInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  <span>NET TOTAL:</span>
                  <span>LKR {completedInvoice.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>Payment Method:</span>
                  <strong style={{ color: completedInvoice.status === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                    {completedInvoice.paymentMethod} ({completedInvoice.status})
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap justify-center">
              <button 
                onClick={handleShareWhatsApp}
                className="btn"
                style={{ 
                  padding: '10px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#ffffff',
                  border: 'none', borderRadius: '8px', fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)', cursor: 'pointer'
                }}
              >
                <Share2 size={16} /> 📱 WhatsApp Bill
              </button>
              <button 
                onClick={handlePrintReceipt}
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button 
                onClick={() => {
                  setCompletedInvoice(null);
                  setCart([]);
                  setSelectedCustomerId('walk-in');
                  setMobileTab('items');
                }}
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.88rem' }}
              >
                ⚡ New Sale
              </button>
              <button 
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.88rem' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* MAIN BILLING WORKSPACE */
          <div style={{ 
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
            flexDirection: 'column',
            flex: 1, 
            minHeight: 0, 
            overflow: 'hidden' 
          }}>
            
            {/* COLUMN 1: HAIR PIN PRODUCT SELECTOR (Always on desktop, conditional on mobile) */}
            {(!isMobile || mobileTab === 'items') && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                borderRight: (!isMobile) ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)') : 'none',
                background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(241, 245, 249, 0.5)',
                padding: isMobile ? '12px' : '18px',
                overflow: 'hidden',
                minHeight: 0,
                flex: 1
              }}>
                {/* Search & Categories Bar */}
                <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search Bobby pins, U-pins, snap clips..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
                    />
                    {productSearch && (
                      <button 
                        onClick={() => setProductSearch('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {categories.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          minHeight: '30px',
                          background: selectedCategory === cat 
                            ? 'var(--accent-primary)' 
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'),
                          color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product List / Cards (Spacious, zero overlap, large tap targets) */}
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    flex: 1,
                    minHeight: 0,
                    paddingBottom: '8px'
                  }}
                >
                  {filteredProducts.map((prod, idx) => {
                    const inCart = cart.find(c => c.id === prod.id || c.name === prod.name);
                    return (
                      <div
                        key={prod.id || idx}
                        onClick={() => addToCart(prod)}
                        style={{
                          padding: isMobile ? '12px 14px' : '14px 16px',
                          borderRadius: '14px',
                          background: inCart 
                            ? (isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb')
                            : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'),
                          border: inCart 
                            ? '2px solid #f59e0b' 
                            : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.1)'),
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: inCart
                            ? '0 4px 16px rgba(245, 158, 11, 0.2)'
                            : (isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)'),
                          position: 'relative',
                          transition: 'all 0.18s ease',
                          flexShrink: 0,
                          minHeight: 'fit-content'
                        }}
                      >
                        {/* Header: Name & Cart Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {prod.name}
                            </div>
                            {prod.desc && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                                {prod.desc}
                              </div>
                            )}
                          </div>
                          {inCart && (
                            <div style={{
                              background: '#f59e0b', color: '#ffffff', fontSize: '0.72rem',
                              fontWeight: 900, padding: '3px 8px', borderRadius: '12px',
                              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px',
                              flexShrink: 0
                            }}>
                              <Check size={12} strokeWidth={3} /> {inCart.qty} in bill
                            </div>
                          )}
                        </div>

                        {/* Middle: Unit indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                            background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            color: isDark ? '#34d399' : '#059669', border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            📦 Unit: {prod.unit || 'Pkt'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {prod.category}
                          </span>
                        </div>

                        {/* Bottom Row: Price & Action Steppers */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: isDark ? '1px dashed rgba(255, 255, 255, 0.08)' : '1px dashed rgba(15, 23, 42, 0.1)'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Price</div>
                            <div style={{ fontSize: '1.18rem', fontWeight: 900, color: isDark ? '#34d399' : '#059669', fontFamily: 'var(--font-mono, monospace)' }}>
                              LKR {Number(prod.price || 0).toLocaleString()}
                            </div>
                          </div>

                          {inCart ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = cart.findIndex(c => c.id === inCart.id || c.name === inCart.name);
                                  if (idx !== -1) updateCartQty(idx, -1);
                                }}
                                style={{
                                  width: '36px', height: '36px', borderRadius: '8px',
                                  background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', color: 'var(--text-primary)'
                                }}
                                title="Decrease"
                              >
                                <Minus size={15} />
                              </button>
                              <span style={{ fontSize: '1rem', fontWeight: 900, minWidth: '28px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                {inCart.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = cart.findIndex(c => c.id === inCart.id || c.name === inCart.name);
                                  if (idx !== -1) updateCartQty(idx, 1);
                                }}
                                style={{
                                  width: '36px', height: '36px', borderRadius: '8px',
                                  background: '#f59e0b', border: 'none',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', color: '#ffffff',
                                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                                }}
                                title="Increase"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
                              style={{
                                padding: '9px 18px',
                                minHeight: '38px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 10px rgba(13, 148, 136, 0.3)'
                              }}
                            >
                              <Plus size={16} strokeWidth={2.5} /> Add to Bill
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Floating Bottom Bar to Go to Bill */}
                {isMobile && cart.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    flexShrink: 0,
                    zIndex: 10
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.95, fontWeight: 700 }}>
                        {totalCartQty} {totalCartQty === 1 ? 'Item' : 'Items'} Selected
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
                        LKR {grandTotal.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileTab('checkout')}
                      style={{
                        background: '#ffffff',
                        color: '#059669',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
                      }}
                    >
                      <span>Review Bill</span> <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* COLUMN 2: CUSTOMER, CART ITEMS & CHECKOUT (Always on desktop, conditional on mobile) */}
            {(!isMobile || mobileTab === 'checkout') && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                padding: isMobile ? '12px' : '18px', 
                minHeight: 0, 
                overflowY: 'auto',
                flex: 1 
              }}>

                {/* Mobile Back Button to Items */}
                {isMobile && (
                  <button
                    onClick={() => setMobileTab('items')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '4px 0 10px 0'
                    }}
                  >
                    <ArrowLeft size={16} /> ← Add / Select More Hair Pins
                  </button>
                )}
                
                {/* 1. Customer Selection */}
                <div style={{ marginBottom: '14px', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. Customer / Wholesale Buyer</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                      {selectedCustomerId === 'walk-in' ? 'Walk-in Cash' : (activeCustomer?.name || 'New')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => setSelectedCustomerId('walk-in')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: selectedCustomerId === 'walk-in' ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                        background: selectedCustomerId === 'walk-in' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: selectedCustomerId === 'walk-in' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      🏪 Counter Cash
                    </button>
                    <button
                      onClick={() => setSelectedCustomerId('new')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: selectedCustomerId === 'new' ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                        background: selectedCustomerId === 'new' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: selectedCustomerId === 'new' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      + New Shop / Buyer
                    </button>
                  </div>

                  {/* Pick Existing Customer */}
                  {selectedCustomerId !== 'new' && (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="form-input"
                      style={{ height: '36px', fontSize: '0.8rem', width: '100%' }}
                    >
                      <option value="walk-in">-- Counter / Walk-in Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.gymName} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Inline New Customer Fields */}
                  {selectedCustomerId === 'new' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Shop or Buyer Name *"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.8rem' }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="form-input"
                          style={{ height: '34px', fontSize: '0.8rem' }}
                        />
                        <input
                          type="text"
                          placeholder="City / Market (Pettah)"
                          value={newCustomerCity}
                          onChange={(e) => setNewCustomerCity(e.target.value)}
                          className="form-input"
                          style={{ height: '34px', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Order Cart Items */}
                <div style={{ flex: 1, minHeight: '120px', overflowY: 'auto', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. Hair Pin Items ({cart.length})</span>
                    {cart.length > 0 && (
                      <button 
                        onClick={() => setCart([])}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div style={{
                      padding: '24px 14px', textAlign: 'center', borderRadius: '10px',
                      border: '1px dashed var(--panel-border)', color: 'var(--text-muted)', fontSize: '0.82rem'
                    }}>
                      No hair pins in bill yet.<br />
                      {isMobile ? (
                        <button
                          onClick={() => setMobileTab('items')}
                          style={{
                            marginTop: '8px',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          + Tap here to Pick Hair Pins
                        </button>
                      ) : (
                        'Click tiles on the left to add.'
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cart.map((item, idx) => (
                        <div 
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.03)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            
                            {/* Unit Selector & Price */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <select
                                value={item.unit}
                                onChange={(e) => setCartItemUnitDirect(idx, e.target.value)}
                                style={{
                                  height: '22px', fontSize: '0.68rem', borderRadius: '4px',
                                  background: isDark ? '#1a222d' : '#f1f5f9', border: '1px solid var(--panel-border)',
                                  color: 'var(--text-secondary)', padding: '0 4px', fontWeight: 700
                                }}
                              >
                                <option value="Pkt">Pkt</option>
                                <option value="Dozen">Dozen</option>
                                <option value="Gross">Gross (144)</option>
                                <option value="Card">Card</option>
                                <option value="Box">Box</option>
                                <option value="Carton">Carton</option>
                              </select>
                              
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@</span>
                              
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => setCartItemPriceDirect(idx, e.target.value)}
                                style={{
                                  width: '58px', height: '22px', fontSize: '0.72rem', borderRadius: '4px',
                                  background: 'transparent', border: '1px solid var(--panel-border)',
                                  color: 'var(--text-primary)', padding: '0 4px', fontWeight: 700
                                }}
                              />
                            </div>
                          </div>

                          {/* Qty Stepper */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateCartQty(idx, -1)}
                              style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-primary)'
                              }}
                            >
                              <Minus size={11} />
                            </button>
                            
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => setCartItemQtyDirect(idx, e.target.value)}
                              style={{
                                width: '36px', height: '24px', textAlign: 'center', fontSize: '0.8rem',
                                fontWeight: 800, borderRadius: '4px', border: '1px solid var(--panel-border)',
                                background: 'transparent', color: 'var(--text-primary)'
                              }}
                            />

                            <button
                              onClick={() => updateCartQty(idx, 1)}
                              style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-primary)'
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          {/* Line Total & Remove */}
                          <div style={{ textAlign: 'right', minWidth: '60px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                              LKR {item.amount.toLocaleString()}
                            </div>
                            <button
                              onClick={() => removeFromCart(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '1px', marginTop: '1px' }}
                              title="Remove item"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Payment Method & Grand Total Card */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.04)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.1)',
                  marginBottom: '12px',
                  flexShrink: 0
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Payment Mode:</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaymentMethod('Cash')}
                        style={{
                          flex: 1, minHeight: '40px', padding: '6px 8px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          background: paymentMethod === 'Cash' ? '#10b981' : (isDark ? '#1a222d' : '#e2e8f0'),
                          color: paymentMethod === 'Cash' ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: paymentMethod === 'Cash' ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none'
                        }}
                      >
                        💵 Cash
                      </button>
                      <button
                        onClick={() => setPaymentMethod('Credit')}
                        style={{
                          flex: 1, minHeight: '40px', padding: '6px 8px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          background: paymentMethod === 'Credit' ? '#f59e0b' : (isDark ? '#1a222d' : '#e2e8f0'),
                          color: paymentMethod === 'Credit' ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: paymentMethod === 'Credit' ? '0 2px 10px rgba(245, 158, 11, 0.35)' : 'none'
                        }}
                        title="Add to Customer Udhar / Debtor Ledger"
                      >
                        💳 Credit (Udhar)
                      </button>
                      <button
                        onClick={() => setPaymentMethod('Bank')}
                        style={{
                          flex: 1, minHeight: '40px', padding: '6px 8px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          background: paymentMethod === 'Bank' ? '#3b82f6' : (isDark ? '#1a222d' : '#e2e8f0'),
                          color: paymentMethod === 'Bank' ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: paymentMethod === 'Bank' ? '0 2px 10px rgba(59, 130, 246, 0.35)' : 'none'
                        }}
                      >
                        🏦 Bank
                      </button>
                    </div>
                  </div>

                  {/* Subtotal & Discount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <span>LKR {subtotal.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>Discount (LKR):</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      style={{
                        width: '85px', height: '26px', textAlign: 'right', fontSize: '0.8rem',
                        borderRadius: '6px', border: '1px solid var(--panel-border)',
                        background: 'transparent', color: 'var(--danger)', fontWeight: 700
                      }}
                    />
                  </div>

                  {/* Grand Total */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: '8px', borderTop: '1px solid var(--panel-border)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Net Payable</div>
                      <div style={{ fontSize: '0.7rem', color: paymentMethod === 'Credit' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                        {paymentMethod === 'Credit' ? 'Pending (Added to Debtor Ledger)' : 'Paid in Full (Cash)'}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                      LKR {grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 4. Complete Action Button */}
                <button
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || isSubmitting}
                  className="btn btn-primary"
                  style={{
                    minHeight: '52px',
                    width: '100%',
                    fontSize: '1.02rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                    cursor: (cart.length === 0 || isSubmitting) ? 'not-allowed' : 'pointer',
                    opacity: (cart.length === 0 || isSubmitting) ? 0.6 : 1,
                    flexShrink: 0,
                    marginTop: 'auto'
                  }}
                >
                  <Check size={20} strokeWidth={3} />
                  <span>{isSubmitting ? 'Recording Sale...' : `Complete Sale (LKR ${grandTotal.toLocaleString()})`}</span>
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default QuickSaleModal;
