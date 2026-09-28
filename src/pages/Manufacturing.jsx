import React, { useContext, useState, useMemo } from 'react';
import { 
  Factory, Layers, PlayCircle, CheckCircle2, Clock, AlertTriangle, 
  Plus, Search, Filter, Printer, Download, Eye, Edit, Trash2, X, 
  ArrowRight, ShieldCheck, Box, RefreshCw, ShoppingCart, TrendingUp,
  Cpu, Wrench, FileSpreadsheet, ChevronRight, AlertCircle, Sparkles,
  Zap, HelpCircle, Check, Info, ArrowUpRight
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import CustomSelect from '../components/CustomSelect';
import { generateWorkOrderPDF } from '../utils/pdfGenerator';

const Manufacturing = () => {
  const { 
    boms = [], 
    addBOM, 
    updateBOM, 
    deleteBOM,
    productionOrders = [], 
    addProductionOrder, 
    updateProductionOrderStatus, 
    completeProductionOrder, 
    deleteProductionOrder,
    inventory = [], 
    suppliers = [],
    addPurchaseOrder,
    confirmAction, 
    showNotification,
    formatCurrency,
    employees = []
  } = useContext(StoreContext) || {};

  // Dual-Mode Architecture: Simple Mode (streamlined / quick produce) vs Advanced ERP Mode
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('gym_mfg_view_mode') || 'simple';
    } catch (e) {
      return 'simple';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('gym_mfg_view_mode', mode);
    } catch (e) {}
  };

  const [showGuide, setShowGuide] = useState(false);

  // Simple Mode Quick Produce State
  const [quickBomId, setQuickBomId] = useState('');
  const [quickQty, setQuickQty] = useState(5);
  const [quickLine, setQuickLine] = useState('Assembly Line 1');
  const [quickNotes, setQuickNotes] = useState('');

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'boms' | 'mrp' | 'qc'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modals state
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState(null);

  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);

  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedOrderForQC, setSelectedOrderForQC] = useState(null);

  const [viewingOrder, setViewingOrder] = useState(null);

  // Form states
  const initialBOMState = {
    productName: '',
    productSku: '',
    outputUnit: 'Unit',
    batchYield: 1,
    laborType: 'hourly', // 'hourly' | 'piece_rate'
    laborHours: 0.5,
    laborRatePerHour: 800,
    pieceRatePerUnit: 450,
    assignedContractor: '',
    machineOverhead: 300,
    suggestedRetailPrice: 0,
    components: [
      { materialName: '', materialSku: '', quantity: 1, unit: 'pcs', unitCost: 0 }
    ]
  };
  const [bomForm, setBomForm] = useState(initialBOMState);

  const initialOrderState = {
    bomId: boms[0]?.id || '',
    productName: boms[0]?.productName || boms[0]?.name || '',
    productSku: boms[0]?.productSku || boms[0]?.code || '',
    quantityToProduce: 10,
    batchNumber: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'Normal',
    assignedTo: 'Assembly Line 1',
    notes: ''
  };
  const [orderForm, setOrderForm] = useState(initialOrderState);

  // QA Inspection Form
  const [qcForm, setQcForm] = useState({
    orderId: '',
    lotNumber: '',
    sampleSize: 10,
    passedUnits: 10,
    scrappedUnits: 0,
    inspector: 'Lead QC Officer',
    status: 'Passed',
    notes: 'All dimensional and batch tolerances within acceptable 99.8% sigma.'
  });

  // KPI Calculations
  const activeOrdersCount = productionOrders.filter(o => ['Planned', 'In Progress', 'Quality Check'].includes(o.status)).length;
  
  const totalWipValue = productionOrders
    .filter(o => ['Planned', 'In Progress', 'Quality Check'].includes(o.status))
    .reduce((sum, o) => {
      const bom = boms.find(b => b.id === o.bomId);
      const unitCost = Number(o.unitCost || o.costPerUnit || bom?.totalCostPerUnit || bom?.totalCost || 1000);
      const qty = Number(o.quantityToProduce || o.quantity || 1);
      return sum + (unitCost * qty);
    }, 0);

  const completedBatchesCount = productionOrders.filter(o => o.status === 'Completed').length;
  
  const totalUnitsProduced = productionOrders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + Number(o.quantityToProduce || o.quantity || 0), 0);

  // Filtered Production Orders
  const filteredOrders = productionOrders.filter(order => {
    const pName = order.productName || order.name || '';
    const oNum = order.orderNumber || '';
    const bNum = order.batchNumber || '';
    const matchesSearch = oNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bNum.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || (order.priority || 'Normal') === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Filtered BOMs
  const filteredBOMs = boms.filter(b => {
    const pName = b.productName || b.name || '';
    const pSku = b.productSku || b.code || '';
    return pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           pSku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate live cost for BOM form
  const computedMaterialCost = useMemo(() => {
    return bomForm.components.reduce((sum, c) => sum + ((Number(c.quantity) || 0) * (Number(c.unitCost) || 0)), 0);
  }, [bomForm.components]);

  const computedLaborCost = bomForm.laborType === 'piece_rate'
    ? Number(bomForm.pieceRatePerUnit || 0)
    : (Number(bomForm.laborHours || 0) * Number(bomForm.laborRatePerHour || 0));
  const computedTotalUnitCost = computedMaterialCost + computedLaborCost + Number(bomForm.machineOverhead || 0);

  // MRP Shortage Calculations
  // Summarizes total raw materials required across all active/planned orders vs. actual stock in inventory
  const mrpAnalysis = useMemo(() => {
    const requirements = {};

    productionOrders
      .filter(o => ['Planned', 'In Progress'].includes(o.status))
      .forEach(order => {
        const bom = boms.find(b => b.id === order.bomId);
        if (!bom || !bom.components) return;
        const batchQty = Number(order.quantityToProduce || 1);

        bom.components.forEach(comp => {
          const key = comp.materialSku || comp.materialName;
          if (!requirements[key]) {
            requirements[key] = {
              name: comp.materialName,
              sku: comp.materialSku,
              unit: comp.unit || 'pcs',
              unitCost: comp.unitCost || 0,
              requiredQty: 0,
              allocatedOrders: []
            };
          }
          requirements[key].requiredQty += (Number(comp.quantity || 0) * batchQty);
          if (!requirements[key].allocatedOrders.includes(order.orderNumber)) {
            requirements[key].allocatedOrders.push(order.orderNumber);
          }
        });
      });

    return Object.values(requirements).map(req => {
      // Find matching item in inventory
      const invItem = inventory.find(i => 
        (i.sku && req.sku && i.sku.toLowerCase() === req.sku.toLowerCase()) ||
        (i.name && req.name && i.name.toLowerCase() === req.name.toLowerCase())
      );
      const currentStock = Number(invItem?.stock || 0);
      const shortage = Math.max(0, req.requiredQty - currentStock);
      const status = shortage > 0 ? 'Shortage' : (currentStock - req.requiredQty <= 5 ? 'Low Safety' : 'Sufficient');

      return {
        ...req,
        currentStock,
        shortage,
        status,
        invId: invItem?.id
      };
    });
  }, [productionOrders, boms, inventory]);

  // Simple Mode Quick Produce Feasibility Calculations
  const activeQuickBom = useMemo(() => {
    if (!boms || boms.length === 0) return null;
    return boms.find(b => b.id === quickBomId) || boms[0];
  }, [boms, quickBomId]);

  const quickIngredientsCheck = useMemo(() => {
    if (!activeQuickBom || !activeQuickBom.components) return [];
    const qty = Number(quickQty) || 1;
    return activeQuickBom.components.map(comp => {
      const compName = comp.name || comp.materialName || 'Component';
      const compSku = comp.materialSku || comp.sku || '';
      const needed = (Number(comp.quantity) || 1) * qty;
      const invItem = inventory.find(i => 
        (compSku && i.sku && i.sku.toLowerCase() === compSku.toLowerCase()) ||
        (i.name && compName && i.name.toLowerCase() === compName.toLowerCase())
      );
      const available = Number(invItem?.stock || 0);
      const hasEnough = available >= needed;
      return {
        name: compName,
        sku: compSku,
        needed,
        available,
        unit: comp.unit || 'pcs',
        unitCost: Number(comp.unitCost || 0),
        hasEnough,
        shortage: Math.max(0, needed - available)
      };
    });
  }, [activeQuickBom, quickQty, inventory]);

  const quickHasAnyShortage = quickIngredientsCheck.some(c => !c.hasEnough);

  const handleQuickProduce = (autoStock = false) => {
    if (!activeQuickBom) {
      showNotification?.('Please choose or create a formulation recipe first.', 'error');
      return;
    }
    const qty = Number(quickQty) || 1;
    if (qty <= 0) {
      showNotification?.('Please enter a valid quantity of 1 or more.', 'error');
      return;
    }

    const lotNumber = `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMoId = `mo-${Date.now()}`;
    const targetName = activeQuickBom.productName || activeQuickBom.name || 'Manufactured Item';
    const unitCost = Number(activeQuickBom.totalCostPerUnit || activeQuickBom.totalCost || 0);

    const payload = {
      id: newMoId,
      bomId: activeQuickBom.id,
      productName: targetName,
      productSku: activeQuickBom.productSku || activeQuickBom.code || '',
      quantity: qty,
      quantityToProduce: qty,
      batchNumber: lotNumber,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: 'Normal',
      assignedTo: quickLine || 'Assembly Line 1',
      unitCost: unitCost,
      costPerUnit: unitCost,
      totalBatchCost: unitCost * qty,
      totalCost: unitCost * qty,
      materialCost: (Number(activeQuickBom.materialCostPerUnit) || unitCost * 0.7) * qty,
      laborCost: (Number(activeQuickBom.laborCost) || unitCost * 0.2) * qty,
      overheadCost: (Number(activeQuickBom.overheadCost || activeQuickBom.machineOverhead) || unitCost * 0.1) * qty,
      components: activeQuickBom.components || [],
      status: 'Planned',
      notes: quickNotes || (autoStock ? '1-Click Instant Produce & Stock' : 'Scheduled via Quick Produce')
    };

    if (autoStock) {
      confirmAction?.({
        title: `Instant Produce & Stock ${qty}x ${targetName}?`,
        message: `This action will immediately:
1. Consume needed raw materials from inventory.
2. Increment finished goods stock (+${qty} units of ${targetName}).
3. Record manufacturing cost vouchers in General Ledger.`,
        confirmText: 'Produce & Add to Stock',
        confirmVariant: 'primary',
        onConfirm: () => {
          addProductionOrder(payload);
          setTimeout(() => {
            completeProductionOrder(newMoId, { sampleSize: qty, passedUnits: qty });
          }, 150);
        }
      });
    } else {
      addProductionOrder(payload);
      showNotification?.(`Scheduled batch #${lotNumber} for ${qty}x ${targetName}!`, 'success');
    }
  };

  // Handlers for BOM
  const handleOpenNewBOM = () => {
    setEditingBOM(null);
    setBomForm(initialBOMState);
    setShowBOMModal(true);
  };

  const handleEditBOM = (bom) => {
    setEditingBOM(bom);
    setBomForm({
      productName: bom.productName,
      productSku: bom.productSku || '',
      outputUnit: bom.outputUnit || 'Unit',
      batchYield: bom.batchYield || 1,
      laborType: bom.laborType || 'hourly',
      laborHours: bom.laborHours || 0.5,
      laborRatePerHour: bom.laborRatePerHour || 800,
      pieceRatePerUnit: bom.pieceRatePerUnit || 450,
      assignedContractor: bom.assignedContractor || '',
      machineOverhead: bom.machineOverhead || 300,
      suggestedRetailPrice: bom.suggestedRetailPrice || 0,
      components: bom.components?.length ? [...bom.components] : [{ materialName: '', materialSku: '', quantity: 1, unit: 'pcs', unitCost: 0 }]
    });
    setShowBOMModal(true);
  };

  const handleSaveBOM = (e) => {
    e.preventDefault();
    if (!bomForm.productName.trim()) {
      showNotification?.('Please enter a finished product name', 'error');
      return;
    }
    if (bomForm.components.length === 0 || !bomForm.components[0].materialName) {
      showNotification?.('Please add at least one component to the formulation', 'error');
      return;
    }

    const payload = {
      ...bomForm,
      materialCostPerUnit: computedMaterialCost,
      laborCost: computedLaborCost,
      overheadCost: Number(bomForm.machineOverhead || 0),
      totalCostPerUnit: computedTotalUnitCost
    };

    if (editingBOM) {
      updateBOM(editingBOM.id, payload);
    } else {
      addBOM(payload);
    }
    setShowBOMModal(false);
  };

  const handleAddComponentRow = () => {
    setBomForm(prev => ({
      ...prev,
      components: [...prev.components, { materialName: '', materialSku: '', quantity: 1, unit: 'pcs', unitCost: 0 }]
    }));
  };

  const handleRemoveComponentRow = (idx) => {
    setBomForm(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx)
    }));
  };

  const handleComponentChange = (idx, field, value) => {
    setBomForm(prev => {
      const updated = [...prev.components];
      updated[idx] = { ...updated[idx], [field]: value };
      
      // Auto-fill from inventory selection if materialName changed
      if (field === 'materialName') {
        const matched = inventory.find(i => i.name.toLowerCase() === value.toLowerCase());
        if (matched) {
          updated[idx].materialSku = matched.sku || '';
          updated[idx].unitCost = matched.costPrice || matched.unitCost || 0;
          updated[idx].unit = matched.unit || 'pcs';
        }
      }
      return { ...prev, components: updated };
    });
  };

  // Handlers for Production Orders
  const handleOpenNewOrder = (prefilledBomId = null) => {
    const selectedBom = boms.find(b => b.id === (prefilledBomId || boms[0]?.id)) || boms[0];
    setEditingPO(null);
    setOrderForm({
      ...initialOrderState,
      bomId: selectedBom?.id || '',
      productName: selectedBom?.productName || selectedBom?.name || '',
      productSku: selectedBom?.productSku || selectedBom?.code || '',
      batchNumber: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setShowPOModal(true);
  };

  const handleOrderBomSelect = (selectedBomId) => {
    const selectedBom = boms.find(b => b.id === selectedBomId);
    if (selectedBom) {
      setOrderForm(prev => ({
        ...prev,
        bomId: selectedBom.id,
        productName: selectedBom.productName || selectedBom.name || '',
        productSku: selectedBom.productSku || selectedBom.code || ''
      }));
    }
  };

  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!orderForm.productName || !orderForm.bomId) {
      showNotification?.('Please select a BOM recipe formulation', 'error');
      return;
    }
    if (Number(orderForm.quantityToProduce) <= 0) {
      showNotification?.('Please enter a valid batch quantity to produce', 'error');
      return;
    }

    const bom = boms.find(b => b.id === orderForm.bomId);

    const payload = {
      ...orderForm,
      quantityToProduce: Number(orderForm.quantityToProduce),
      unitCost: bom?.totalCostPerUnit || 0,
      totalBatchCost: (bom?.totalCostPerUnit || 0) * Number(orderForm.quantityToProduce),
      components: bom?.components || []
    };

    addProductionOrder(payload);
    setShowPOModal(false);
  };

  // Trigger Complete & Stock
  const handleTriggerCompleteOrder = (order) => {
    confirmAction?.({
      title: `Finalize & Stock Batch ${order.orderNumber}?`,
      message: `Completing will automatically:
1. Deduct all consumed raw material inventory.
2. Increment finished stock by +${order.quantityToProduce} ${order.productName}.
3. Create double-entry GL voucher in Chart of Accounts.`,
      confirmText: 'Complete & Add Stock',
      confirmVariant: 'primary',
      onConfirm: () => {
        completeProductionOrder(order.id, order.quantityToProduce);
      }
    });
  };

  // 1-Click PO Generator from MRP Shortage
  const handleCreatePOFromShortage = (item) => {
    if (!addPurchaseOrder) {
      showNotification?.('Procurement module is required to generate POs.', 'error');
      return;
    }
    const defaultSupplier = suppliers[0];
    const orderQty = Math.max(item.shortage * 1.2, 10); // 20% safety buffer

    addPurchaseOrder({
      supplierId: defaultSupplier?.id || '',
      supplierName: defaultSupplier?.name || 'Local Raw Material Vendor',
      expectedDelivery: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: 'Ordered',
      notes: `Auto-generated from Manufacturing MRP for shortage on ${item.allocatedOrders.join(', ')}`,
      items: [
        {
          name: item.name,
          sku: item.sku,
          quantity: Math.ceil(orderQty),
          unitCost: item.unitCost || 100,
          totalCost: Math.ceil(orderQty) * (item.unitCost || 100)
        }
      ]
    });
    showNotification?.(`Purchase Order drafted for ${Math.ceil(orderQty)} ${item.unit} of ${item.name}!`, 'success');
  };

  // Print Job Sheet
  const handlePrintJobSheet = (order) => {
    const bom = boms.find(b => b.id === order.bomId);
    generateWorkOrderPDF(order, bom);
  };

  // QC inspection modal open
  const handleOpenQC = (order) => {
    setSelectedOrderForQC(order);
    setQcForm({
      orderId: order.id,
      lotNumber: order.batchNumber,
      sampleSize: Math.min(order.quantityToProduce, 10),
      passedUnits: Math.min(order.quantityToProduce, 10),
      scrappedUnits: 0,
      inspector: 'Lead QC Officer',
      status: 'Passed',
      notes: `Batch quality verified for ${order.productName}. No defects found.`
    });
    setShowQCModal(true);
  };

  const handleSaveQC = (e) => {
    e.preventDefault();
    if (selectedOrderForQC) {
      updateProductionOrderStatus(selectedOrderForQC.id, 'Completed');
      showNotification?.(`QC inspection approved for ${selectedOrderForQC.orderNumber}! Status updated.`, 'success');
    }
    setShowQCModal(false);
  };

  return (
    <div className="container-fluid" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Banner / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', 
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(2, 132, 199, 0.3))', 
              border: '1px solid rgba(14, 165, 233, 0.4)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Factory size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Manufacturing & Production ERP
                </h1>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                  background: viewMode === 'simple' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                  color: viewMode === 'simple' ? '#10b981' : '#0ea5e9',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  {viewMode === 'simple' ? <><Zap size={11} /> Simple Mode</> : <><Layers size={11} /> Advanced ERP</>}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {viewMode === 'simple'
                  ? 'Easily produce batches in 1 click, check raw material readiness, and track shopfloor assembly.'
                  : 'Formulate Bill of Materials (BOM), schedule job orders, track WIP material consumption, and automate finished goods inventory.'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Controls: Mode Switcher + Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Dual-Mode Segmented Pill */}
          <div style={{
            display: 'flex',
            background: 'var(--subtle-bg)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--panel-border)'
          }}>
            <button
              type="button"
              onClick={() => handleSetViewMode('simple')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '7px',
                border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                background: viewMode === 'simple' ? '#0284c7' : 'transparent',
                color: viewMode === 'simple' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={14} />
              <span>Simple Mode</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('advanced')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '7px',
                border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                background: viewMode === 'advanced' ? '#0284c7' : 'transparent',
                color: viewMode === 'advanced' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={14} />
              <span>Advanced ERP</span>
            </button>
          </div>

          {/* How It Works Guide Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.82rem',
              background: showGuide ? 'rgba(14, 165, 233, 0.15)' : 'var(--subtle-bg)',
              color: showGuide ? '#0ea5e9' : 'var(--text-secondary)',
              borderColor: showGuide ? '#0ea5e9' : 'var(--panel-border)'
            }}
          >
            <HelpCircle size={15} />
            <span>{showGuide ? 'Hide Guide' : 'How It Works'}</span>
          </button>

          <button 
            onClick={handleOpenNewBOM}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.82rem' }}
          >
            <Layers size={16} />
            <span>+ Recipe (BOM)</span>
          </button>
          <button 
            onClick={() => handleOpenNewOrder()}
            className="btn btn-primary"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              borderColor: '#0284c7'
            }}
          >
            <Plus size={16} />
            <span>+ New Batch</span>
          </button>
        </div>
      </div>

      {/* Visual 4-Step Interactive Pipeline Guide */}
      {showGuide && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.05))',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          borderRadius: '14px',
          padding: '1.25rem',
          marginBottom: '1.75rem',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0ea5e9' }}>
                <Sparkles size={18} /> How Manufacturing & Production Works (4-Step Pipeline)
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Follow this simple workflow to formulate recipes, check raw material readiness, build batches, and auto-stock inventory:
              </p>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="action-btn"
              style={{ color: 'var(--text-secondary)', padding: '4px' }}
              aria-label="Close guide"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
            {/* Step 1 */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>1</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Formulate Recipe (BOM)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                Define what raw components (e.g. 8m steel tube + 4 base flanges) are needed per unit, plus direct labor hours and machine overhead.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>2</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Stock Feasibility (MRP)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                The system checks raw inventory in real time. If any ingredient is short, MRP alerts you and lets you draft a supplier PO in 1 click!
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>3</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Track Shopfloor Assembly</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                Move batches through <em>Planned → Making → Inspection</em>. Generate barcode Job Traveler PDFs for shopfloor technicians.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>4</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Auto-Stock & Accounting</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                1 click automatically deducts raw parts, stocks finished items in inventory for sales, and creates double-entry GL journal vouchers!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.75rem' 
      }}>
        {/* Card 1: Active Work Orders */}
        <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Active Production Runs
            </span>
            <span style={{ 
              width: '32px', height: '32px', borderRadius: '8px', 
              background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <PlayCircle size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeOrdersCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0ea5e9', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>In Planned, Progress & Quality Inspection</span>
          </div>
        </div>

        {/* Card 2: WIP Value */}
        <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              WIP Valuation (Standard)
            </span>
            <span style={{ 
              width: '32px', height: '32px', borderRadius: '8px', 
              background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency ? formatCurrency(totalWipValue) : `LKR ${totalWipValue.toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Raw Materials & Labor in Production
          </div>
        </div>

        {/* Card 3: Completed Production Runs */}
        <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Batches Completed
            </span>
            <span style={{ 
              width: '32px', height: '32px', borderRadius: '8px', 
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {completedBatchesCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
            100% Quality & Stock Fulfilled
          </div>
        </div>

        {/* Card 4: Total Units Produced */}
        <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Finished Units Yielded
            </span>
            <span style={{ 
              width: '32px', height: '32px', borderRadius: '8px', 
              background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Box size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalUnitsProduced.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across all finished SKUs
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIMPLE MODE VIEW (QUICK PRODUCE & STREAMLINED PIPELINE) */}
      {/* ========================================================================= */}
      {viewMode === 'simple' && (
        <div>
          {/* Quick Produce Card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem', border: '1px solid rgba(14, 165, 233, 0.3)', background: 'linear-gradient(to bottom, rgba(14, 165, 233, 0.03), transparent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '30px', height: '30px', borderRadius: '8px', 
                    background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' 
                  }}>
                    <Zap size={18} />
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Quick Produce (1-Click Batch Assembly)
                  </h2>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                    Streamlined
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Pick a product recipe, enter how many units you want to build, review live material availability, and start production immediately.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewBOM}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Plus size={14} /> + New Product Recipe
              </button>
            </div>

            {/* Quick Produce Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* Product Recipe Selector */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>1. Product to Manufacture (BOM)</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{boms.length} Recipes</span>
                </label>
                <CustomSelect
                  value={activeQuickBom?.id || ''}
                  onChange={(val) => setQuickBomId(val)}
                  options={boms.map(b => ({
                    value: b.id,
                    label: `${b.productName || b.name} (Std: ${formatCurrency ? formatCurrency(b.totalCostPerUnit || b.totalCost || 0) : `LKR ${b.totalCostPerUnit || b.totalCost || 0}`})`
                  }))}
                  placeholder="Choose product recipe..."
                />
              </div>

              {/* Batch Quantity */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  2. Batch Quantity (Units)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    style={{ fontWeight: 700, fontSize: '1.1rem' }}
                  />
                  {/* Quick Quantity Presets */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 5, 10, 20].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuickQty(q)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: quickQty === q ? '#0284c7' : 'var(--subtle-bg)',
                          color: quickQty === q ? '#fff' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.78rem'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assembly Line */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  3. Assigned Workstation
                </label>
                <CustomSelect
                  value={quickLine}
                  onChange={(val) => setQuickLine(val)}
                  options={[
                    { value: 'Assembly Line 1', label: 'Assembly Line 1 (Fabrication)' },
                    { value: 'Assembly Line 2', label: 'Assembly Line 2 (Welding & Paint)' },
                    { value: 'Packaging Station', label: 'Packaging & Boxing Station' },
                    { value: 'Custom Workshop', label: 'Custom Build Workshop' }
                  ]}
                />
              </div>
            </div>

            {/* Live Recipe Ingredients & Feasibility Check */}
            {activeQuickBom && (
              <div style={{
                background: 'var(--subtle-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={16} color="#0ea5e9" />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      Live Raw Material Stock Readiness for {quickQty}x {activeQuickBom.productName || activeQuickBom.name}
                    </span>
                  </div>
                  {quickHasAnyShortage ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                      <AlertTriangle size={13} />
                      Raw Material Shortage Detected
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                      <CheckCircle2 size={13} />
                      All Ingredients Available in Stock
                    </span>
                  )}
                </div>

                {/* Materials badges / pill grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {quickIngredientsCheck.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: item.hasEnough ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.06)',
                        border: item.hasEnough ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        {item.hasEnough ? (
                          <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={12} /> Available
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <AlertTriangle size={12} /> Need +{item.shortage} {item.unit}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        <span>Required: <strong style={{ color: 'var(--text-primary)' }}>{item.needed} {item.unit}</strong></span>
                        <span>In Warehouse: <strong style={{ color: item.hasEnough ? 'var(--text-primary)' : '#ef4444' }}>{item.available} {item.unit}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Batch Value & Cost Summary */}
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--panel-border)',
                  flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span>Standard Unit Cost: <strong>{formatCurrency ? formatCurrency(activeQuickBom.totalCostPerUnit || activeQuickBom.totalCost || 0) : `LKR ${activeQuickBom.totalCostPerUnit || activeQuickBom.totalCost || 0}`}</strong></span>
                    <span>Estimated Batch Total ({quickQty} units): <strong style={{ color: '#0ea5e9' }}>{formatCurrency ? formatCurrency((activeQuickBom.totalCostPerUnit || activeQuickBom.totalCost || 0) * quickQty) : `LKR ${((activeQuickBom.totalCostPerUnit || activeQuickBom.totalCost || 0) * quickQty).toLocaleString()}`}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleQuickProduce(false)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '0.65rem 1.25rem' }}
              >
                <Clock size={16} />
                <span>Schedule Batch (Planned)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickProduce(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '0.65rem 1.4rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderColor: '#10b981',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Sparkles size={16} />
                <span>1-Click Instant Produce & Stock</span>
              </button>
            </div>
          </div>

          {/* Active Production Batches (Visual 4-Stage Stepper Cards) */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlayCircle size={20} color="#0ea5e9" />
                  <span>Active Production Batches ({activeOrdersCount})</span>
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Advance your manufacturing runs through Planned → Making → Inspection → Ready.
                </p>
              </div>
            </div>

            {productionOrders.filter(o => ['Planned', 'In Progress', 'Quality Check'].includes(o.status)).length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Box size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--text-secondary)' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Batches in Production</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.25rem' }}>
                  Use the Quick Produce card above to schedule or produce your first manufacturing run.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {productionOrders
                  .filter(o => ['Planned', 'In Progress', 'Quality Check'].includes(o.status))
                  .map(order => {
                    const isPlanned = order.status === 'Planned';
                    const isInProgress = order.status === 'In Progress';
                    const isQC = order.status === 'Quality Check';
                    const qty = Number(order.quantityToProduce || order.quantity || 1);

                    return (
                      <div 
                        key={order.id} 
                        className="card"
                        style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: isQC 
                            ? '1px solid rgba(139, 92, 246, 0.4)' 
                            : isInProgress 
                              ? '1px solid rgba(245, 158, 11, 0.4)' 
                              : '1px solid var(--border-color)',
                          boxShadow: 'var(--card-shadow)'
                        }}
                      >
                        <div>
                          {/* Card Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: '#0ea5e9', display: 'block', marginBottom: '2px' }}>
                                {order.orderNumber} • {order.batchNumber}
                              </span>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                {order.productName || order.name}
                              </h4>
                            </div>
                            <span style={{
                              padding: '3px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                              background: isPlanned ? 'rgba(14, 165, 233, 0.15)' : isInProgress ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                              color: isPlanned ? '#0ea5e9' : isInProgress ? '#f59e0b' : '#8b5cf6',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              {isPlanned ? <><Clock size={11} /> Planned</> : isInProgress ? <><Wrench size={11} /> In Assembly</> : <><ShieldCheck size={11} /> Inspection</>}
                            </span>
                          </div>

                          {/* Quantity & Station Meta */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--subtle-bg)', padding: '0.65rem 0.85rem', borderRadius: '8px',
                            marginBottom: '1rem', fontSize: '0.8rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Target Batch: </span>
                              <strong style={{ fontSize: '0.95rem', color: '#0ea5e9' }}>{qty} Units</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Line: </span>
                              <strong>{order.assignedTo || 'Assembly Line 1'}</strong>
                            </div>
                          </div>

                          {/* 4-Stage Visual Progress Stepper */}
                          <div style={{ margin: '1.25rem 0 1rem 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                              {/* Background Connecting Line */}
                              <div style={{
                                position: 'absolute', top: '13px', left: '16px', right: '16px', height: '2px',
                                background: 'var(--border-color)', zIndex: 0
                              }} />
                              
                              {/* Step 1: Planned */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '4px' }}>
                                <div style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  background: '#0ea5e9', color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.72rem',
                                  boxShadow: '0 0 0 3px var(--card-bg)'
                                }}>
                                  <Check size={14} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0ea5e9' }}>Planned</span>
                              </div>

                              {/* Step 2: Making */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '4px' }}>
                                <div style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  background: (isInProgress || isQC) ? '#f59e0b' : 'var(--subtle-bg)',
                                  color: (isInProgress || isQC) ? '#fff' : 'var(--text-secondary)',
                                  border: (isInProgress || isQC) ? 'none' : '1px solid var(--border-color)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.72rem',
                                  boxShadow: '0 0 0 3px var(--card-bg)'
                                }}>
                                  {isQC ? <Check size={14} /> : '2'}
                                </div>
                                <span style={{ 
                                  fontSize: '0.7rem', fontWeight: 700, 
                                  color: (isInProgress || isQC) ? '#f59e0b' : 'var(--text-secondary)' 
                                }}>
                                  Making
                                </span>
                              </div>

                              {/* Step 3: Checking */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '4px' }}>
                                <div style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  background: isQC ? '#8b5cf6' : 'var(--subtle-bg)',
                                  color: isQC ? '#fff' : 'var(--text-secondary)',
                                  border: isQC ? 'none' : '1px solid var(--border-color)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.72rem',
                                  boxShadow: '0 0 0 3px var(--card-bg)'
                                }}>
                                  3
                                </div>
                                <span style={{ 
                                  fontSize: '0.7rem', fontWeight: 700, 
                                  color: isQC ? '#8b5cf6' : 'var(--text-secondary)' 
                                }}>
                                  Checking
                                </span>
                              </div>

                              {/* Step 4: Ready & Stocked */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '4px' }}>
                                <div style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  background: 'var(--subtle-bg)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.72rem',
                                  boxShadow: '0 0 0 3px var(--card-bg)'
                                }}>
                                  4
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  Stocked
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {/* Next Step Primary Button */}
                          {isPlanned && (
                            <button
                              type="button"
                              onClick={() => updateProductionOrderStatus(order.id, 'In Progress')}
                              className="btn btn-primary"
                              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                            >
                              <PlayCircle size={16} />
                              <span>Start Making Batch</span>
                            </button>
                          )}

                          {isInProgress && (
                            <button
                              type="button"
                              onClick={() => handleOpenQC(order)}
                              className="btn btn-primary"
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700,
                                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                borderColor: '#8b5cf6'
                              }}
                            >
                              <ShieldCheck size={16} />
                              <span>Pass to Quality Inspection</span>
                            </button>
                          )}

                          {isQC && (
                            <button
                              type="button"
                              onClick={() => handleTriggerCompleteOrder(order)}
                              className="btn btn-primary"
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderColor: '#10b981'
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>Approve Quality & Add to Stock</span>
                            </button>
                          )}

                          {/* Secondary Quick Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setViewingOrder(order)}
                              className="btn btn-secondary"
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.76rem', padding: '5px' }}
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintJobSheet(order)}
                              className="btn btn-secondary"
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.76rem', padding: '5px' }}
                            >
                              <Printer size={13} />
                              <span>Job Sheet PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                confirmAction?.({
                                  title: `Cancel Work Order ${order.orderNumber}?`,
                                  message: 'Are you sure you want to delete this planned batch?',
                                  confirmText: 'Delete Order',
                                  confirmVariant: 'danger',
                                  onConfirm: () => deleteProductionOrder(order.id)
                                });
                              }}
                              className="action-btn"
                              style={{ color: '#ef4444', padding: '6px' }}
                              title="Delete Order"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Recently Completed Finished Batches */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>Recently Finished & Stocked Batches</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {completedBatchesCount} batches yielded
              </span>
            </div>

            {productionOrders.filter(o => o.status === 'Completed').length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                No completed batches yet. Use Quick Produce or complete an active batch to see history here.
              </p>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.65rem' }}>Batch Lot #</th>
                      <th style={{ padding: '0.65rem' }}>MO #</th>
                      <th style={{ padding: '0.65rem' }}>Product Name</th>
                      <th style={{ padding: '0.65rem', textAlign: 'center' }}>Units Added to Stock</th>
                      <th style={{ padding: '0.65rem' }}>Completion Date</th>
                      <th style={{ padding: '0.65rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.65rem', textAlign: 'right' }}>Job Sheet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionOrders
                      .filter(o => o.status === 'Completed')
                      .slice(0, 5)
                      .map(order => (
                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '0.65rem', fontWeight: 700, fontFamily: 'monospace', color: '#0ea5e9' }}>
                            {order.batchNumber}
                          </td>
                          <td style={{ padding: '0.65rem', fontWeight: 600 }}>
                            {order.orderNumber}
                          </td>
                          <td style={{ padding: '0.65rem', fontWeight: 600 }}>
                            {order.productName || order.name}
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                            +{(order.quantityToProduce || order.quantity || 1).toLocaleString()} units
                          </td>
                          <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>
                            {order.completedDate || order.dueDate || 'Recently'}
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <CheckCircle2 size={12} /> Stocked
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handlePrintJobSheet(order)}
                              className="action-btn"
                              style={{ padding: '4px 8px', color: '#0ea5e9', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Print PDF Traveler"
                            >
                              <Printer size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Teaser to Advanced ERP Mode */}
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--subtle-bg)',
            border: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 700 }}>
                  Need detailed Bill of Materials formulas, MRP Shortage matrix, or QC logs?
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Advanced ERP mode provides comprehensive formulation costing (labor + overheads), inventory shortage alerts, and supplier PO generation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSetViewMode('advanced')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <span>Switch to Advanced ERP</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED ERP MODE VIEW (DETAILED TABS & FORMULATIONS) */}
      {/* ========================================================================= */}
      {viewMode === 'advanced' && (
        <>
          {/* Tabs Navigation Bar */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-color)', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => { setActiveTab('orders'); setSearchTerm(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'orders' ? '#0ea5e9' : 'var(--text-secondary)',
            fontWeight: activeTab === 'orders' ? 700 : 500,
            fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <Factory size={17} />
          <span>Production Orders (MO)</span>
          <span style={{ 
            background: activeTab === 'orders' ? 'rgba(14, 165, 233, 0.15)' : 'var(--border-color)', 
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
            color: activeTab === 'orders' ? '#0ea5e9' : 'var(--text-secondary)'
          }}>
            {productionOrders.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('boms'); setSearchTerm(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'boms' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'boms' ? '#0ea5e9' : 'var(--text-secondary)',
            fontWeight: activeTab === 'boms' ? 700 : 500,
            fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <Layers size={17} />
          <span>Bill of Materials (BOM)</span>
          <span style={{ 
            background: activeTab === 'boms' ? 'rgba(14, 165, 233, 0.15)' : 'var(--border-color)', 
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
            color: activeTab === 'boms' ? '#0ea5e9' : 'var(--text-secondary)'
          }}>
            {boms.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('mrp'); setSearchTerm(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'mrp' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'mrp' ? '#0ea5e9' : 'var(--text-secondary)',
            fontWeight: activeTab === 'mrp' ? 700 : 500,
            fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <FileSpreadsheet size={17} />
          <span>MRP & Material Shortages</span>
          {mrpAnalysis.filter(m => m.shortage > 0).length > 0 && (
            <span style={{ 
              background: '#ef4444', color: '#fff', 
              padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700
            }}>
              {mrpAnalysis.filter(m => m.shortage > 0).length} Shortages
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('qc'); setSearchTerm(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'qc' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'qc' ? '#0ea5e9' : 'var(--text-secondary)',
            fontWeight: activeTab === 'qc' ? 700 : 500,
            fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={17} />
          <span>Quality Control & Lot Batches</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCTION ORDERS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                placeholder="Search by MO #, Product, or Batch / Lot..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: '160px' }}>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Planned', label: 'Planned' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Quality Check', label: 'Quality Check' },
                    { value: 'Completed', label: 'Completed' },
                    { value: 'Cancelled', label: 'Cancelled' }
                  ]}
                />
              </div>

              <div style={{ width: '150px' }}>
                <CustomSelect
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: 'All', label: 'All Priorities' },
                    { value: 'Urgent', label: 'Urgent' },
                    { value: 'High', label: 'High' },
                    { value: 'Normal', label: 'Normal' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>MO Number & Lot #</th>
                  <th style={{ padding: '0.75rem' }}>Target Product</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Batch Qty</th>
                  <th style={{ padding: '0.75rem' }}>Schedule (Start - Due)</th>
                  <th style={{ padding: '0.75rem' }}>Assigned Line</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Standard Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                      <Factory size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: 600 }}>No production orders found</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Click "+ New Production Run" to schedule an order.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const statusColorMap = {
                      'Planned': { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8' },
                      'In Progress': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
                      'Quality Check': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
                      'Completed': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
                      'Cancelled': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
                    };
                    const statusStyle = statusColorMap[order.status] || { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8' };

                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        {/* MO & Lot */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.orderNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {order.batchNumber}
                          </div>
                        </td>

                        {/* Product */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            SKU: {order.productSku || '—'}
                          </div>
                        </td>

                        {/* Batch Qty */}
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: 700, fontSize: '0.9rem', 
                            padding: '3px 8px', borderRadius: '6px',
                            background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9'
                          }}>
                            {order.quantityToProduce}
                          </span>
                        </td>

                        {/* Schedule */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                            <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
                            <span>{order.startDate || '—'} → <strong style={{ color: '#f59e0b' }}>{order.dueDate || '—'}</strong></span>
                          </div>
                        </td>

                        {/* Assigned Line */}
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Wrench size={13} style={{ color: 'var(--text-secondary)' }} />
                            <span>{order.assignedTo || 'Line 1'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: statusStyle.bg, color: statusStyle.text
                          }}>
                            {order.status}
                          </span>
                        </td>

                        {/* Cost */}
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency ? formatCurrency(order.totalBatchCost || 0) : `LKR ${(order.totalBatchCost || 0).toLocaleString()}`}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {/* Traveler Sheet PDF */}
                            <button
                              title="Print Job Traveler Sheet PDF"
                              onClick={() => handlePrintJobSheet(order)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 7px' }}
                            >
                              <Printer size={14} />
                            </button>

                            {/* View details */}
                            <button
                              title="View Order Details"
                              onClick={() => setViewingOrder(order)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 7px' }}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Workflow buttons */}
                            {order.status === 'Planned' && (
                              <button
                                title="Start Production"
                                onClick={() => updateProductionOrderStatus(order.id, 'In Progress')}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f59e0b', borderColor: '#f59e0b' }}
                              >
                                Start
                              </button>
                            )}

                            {order.status === 'In Progress' && (
                              <button
                                title="Move to Quality Check"
                                onClick={() => updateProductionOrderStatus(order.id, 'Quality Check')}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#a855f7', borderColor: '#a855f7' }}
                              >
                                Send to QC
                              </button>
                            )}

                            {order.status === 'Quality Check' && (
                              <button
                                title="Quality Inspection"
                                onClick={() => handleOpenQC(order)}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#8b5cf6', borderColor: '#8b5cf6' }}
                              >
                                Inspect
                              </button>
                            )}

                            {['In Progress', 'Quality Check'].includes(order.status) && (
                              <button
                                title="Finalize & Auto-Stock"
                                onClick={() => handleTriggerCompleteOrder(order)}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                              >
                                Complete
                              </button>
                            )}

                            {/* Delete order */}
                            {order.status !== 'Completed' && (
                              <button
                                title="Delete Order"
                                onClick={() => {
                                  confirmAction?.({
                                    title: `Delete Production Order ${order.orderNumber}?`,
                                    message: 'This will cancel and remove this production batch order.',
                                    confirmText: 'Delete Order',
                                    confirmVariant: 'danger',
                                    onConfirm: () => deleteProductionOrder(order.id)
                                  });
                                }}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '4px 7px', color: '#ef4444' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BILL OF MATERIALS (BOM) CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'boms' && (
        <div>
          {/* Header search & add */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                placeholder="Search formulations by Product name or SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
            <button 
              onClick={handleOpenNewBOM}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
            >
              <Plus size={18} />
              <span>+ New Formulation (BOM)</span>
            </button>
          </div>

          {/* BOM Cards Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', 
            gap: '1.25rem' 
          }}>
            {filteredBOMs.length === 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Layers size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h3 style={{ margin: 0, fontWeight: 700 }}>No Bill of Materials found</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Define your recipe formulations to track raw materials, direct labor, and standard unit costs.
                </p>
                <button 
                  onClick={handleOpenNewBOM}
                  className="btn btn-primary"
                  style={{ marginTop: '0.75rem' }}
                >
                  Create Your First BOM
                </button>
              </div>
            ) : (
              filteredBOMs.map(bom => {
                const margin = bom.suggestedRetailPrice && bom.totalCostPerUnit 
                  ? Math.round(((bom.suggestedRetailPrice - bom.totalCostPerUnit) / bom.suggestedRetailPrice) * 100)
                  : 0;

                return (
                  <div key={bom.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* BOM Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '6px', 
                              background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9',
                              fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace'
                            }}>
                              {bom.productSku || 'NO-SKU'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Yield: {bom.batchYield || 1} {bom.outputUnit || 'Unit'}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.35rem 0 0 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            {bom.productName}
                            {bom.laborType === 'piece_rate' && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                                Piece-Rate Outsourced
                              </span>
                            )}
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            onClick={() => handleEditBOM(bom)}
                            className="btn btn-sm btn-secondary"
                            title="Edit BOM"
                            style={{ padding: '4px 7px' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              confirmAction?.({
                                title: `Delete BOM Formulation for ${bom.productName}?`,
                                message: 'Are you sure you want to remove this formulation?',
                                confirmText: 'Delete BOM',
                                confirmVariant: 'danger',
                                onConfirm: () => deleteBOM(bom.id)
                              });
                            }}
                            className="btn btn-sm btn-secondary"
                            title="Delete BOM"
                            style={{ padding: '4px 7px', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Cost breakdown pill summary */}
                      <div style={{ 
                        background: 'var(--bg-secondary, rgba(255,255,255,0.03))', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Raw Materials Cost:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency ? formatCurrency(bom.materialCostPerUnit || 0) : `LKR ${bom.materialCostPerUnit}`}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Labor & Machine Overhead:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency ? formatCurrency((bom.laborCost || 0) + (bom.overheadCost || 0)) : `LKR ${(bom.laborCost || 0) + (bom.overheadCost || 0)}`}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                          <span style={{ color: '#0ea5e9' }}>Standard Unit Cost:</span>
                          <span style={{ color: '#0ea5e9' }}>{formatCurrency ? formatCurrency(bom.totalCostPerUnit || 0) : `LKR ${bom.totalCostPerUnit}`}</span>
                        </div>
                      </div>

                      {/* Components List */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Formulation Recipe ({bom.components?.length || 0} Materials):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
                          {bom.components?.map((c, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                              fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px',
                              background: 'var(--bg-primary, rgba(0,0,0,0.1))'
                            }}>
                              <span style={{ color: 'var(--text-primary)' }}>• {c.materialName}</span>
                              <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {c.quantity} {c.unit || 'pcs'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {bom.suggestedRetailPrice > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Margin: <strong style={{ color: margin > 25 ? '#10b981' : '#f59e0b' }}>{margin}%</strong>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenNewOrder(bom.id)}
                        className="btn btn-sm btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, background: '#0284c7', borderColor: '#0284c7' }}
                      >
                        <PlayCircle size={14} />
                        <span>Schedule Batch</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MRP & MATERIAL SHORTAGES ANALYZER */}
      {/* ========================================================================= */}
      {activeTab === 'mrp' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Material Requirements Planning (MRP) Matrix
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Real-time component breakdown of active production runs cross-referenced with on-hand inventory stock.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ 
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.15)', color: '#10b981'
              }}>
                {mrpAnalysis.filter(m => m.status === 'Sufficient').length} Sufficient
              </span>
              <span style={{ 
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'
              }}>
                {mrpAnalysis.filter(m => m.shortage > 0).length} Shortages
              </span>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Raw Material / Component</th>
                  <th style={{ padding: '0.75rem' }}>SKU</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Allocated in Orders</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Required</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>On-Hand Stock</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Stock Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Shortage</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Procurement Action</th>
                </tr>
              </thead>
              <tbody>
                {mrpAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={36} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: 600 }}>No active production material demands</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        All current inventory levels meet existing production commitments.
                      </div>
                    </td>
                  </tr>
                ) : (
                  mrpAnalysis.map((item, idx) => {
                    const isShortage = item.shortage > 0;
                    return (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        fontSize: '0.85rem',
                        background: isShortage ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                      }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {item.sku || '—'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--border-color)' }}>
                            {item.allocatedOrders.join(', ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                          {item.requiredQty.toLocaleString()} {item.unit}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: item.currentStock < item.requiredQty ? '#ef4444' : '#10b981' }}>
                          {item.currentStock.toLocaleString()} {item.unit}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            background: isShortage ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isShortage ? '#ef4444' : '#10b981'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: isShortage ? '#ef4444' : 'var(--text-secondary)' }}>
                          {isShortage ? `-${item.shortage.toLocaleString()} ${item.unit}` : 'None'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {isShortage ? (
                            <button
                              onClick={() => handleCreatePOFromShortage(item)}
                              className="btn btn-sm btn-primary"
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
                                background: '#ef4444', borderColor: '#ef4444', fontSize: '0.75rem', fontWeight: 600 
                              }}
                            >
                              <ShoppingCart size={13} />
                              <span>1-Click PO Draft</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle2 size={14} /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUALITY CONTROL & LOT BATCH LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'qc' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Batch Quality Control (QC) & Compliance Logs
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track lot traceability, sampling pass rates, scrap losses, and authorized supervisor releases.
              </p>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem' }}>Batch / Lot Number</th>
                  <th style={{ padding: '0.75rem' }}>MO Number</th>
                  <th style={{ padding: '0.75rem' }}>Product Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Batch Size</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>QA Status</th>
                  <th style={{ padding: '0.75rem' }}>Inspection Sign-off</th>
                  <th style={{ padding: '0.75rem' }}>Traceability Notes</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {productionOrders.map(order => {
                  const isCompleted = order.status === 'Completed';
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: '#0ea5e9' }}>
                        {order.batchNumber}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        {order.orderNumber}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {order.productName}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        {order.quantityToProduce} units
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: isCompleted ? '#10b981' : '#a855f7'
                        }}>
                          {isCompleted ? 'Passed & Released' : (order.status === 'Quality Check' ? 'Under Inspection' : 'Pending Run')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {isCompleted ? 'Lead QA Officer (Approved)' : 'Pending batch completion'}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.notes || 'Full standard formulation compliance.'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenQC(order)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Log Inspection
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BILL OF MATERIALS (BOM) FORM */}
      {/* ========================================================================= */}
      {showBOMModal && (
        <div className="app-modal-backdrop" onClick={() => setShowBOMModal(false)}>
          <div className="app-modal-dialog" style={{ maxWidth: '850px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-solid">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {editingBOM ? 'Edit Formulation (BOM)' : 'Create Bill of Materials (BOM)'}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Configure raw materials, component consumption, labor time, and standard manufacturing costs.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBOMModal(false)} 
                className="action-btn"
                style={{ background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '6px' }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBOM} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body-solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Product Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Finished Product Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Whey Protein Isolate 1kg"
                      value={bomForm.productName}
                      onChange={e => setBomForm({ ...bomForm, productName: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>SKU Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. WHEY-ISO-1KG"
                      value={bomForm.productSku}
                      onChange={e => setBomForm({ ...bomForm, productSku: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Batch Yield Unit</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1 Unit or 1 Bottle"
                      value={bomForm.outputUnit}
                      onChange={e => setBomForm({ ...bomForm, outputUnit: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Raw Materials Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem', margin: 0 }}>
                      Raw Materials & Components Formulation
                    </label>
                    <button 
                      type="button" 
                      onClick={handleAddComponentRow}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '4px 10px' }}
                    >
                      <Plus size={13} /> Add Material
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {bomForm.components.map((comp, idx) => (
                      <div key={idx} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 34px', 
                        gap: '0.5rem', 
                        alignItems: 'center',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--panel-border)',
                        padding: '0.6rem',
                        borderRadius: '8px'
                      }}>
                        {/* Name */}
                        <input 
                          type="text" 
                          placeholder="Material Name (e.g. Raw Cocoa Powder)"
                          value={comp.materialName || comp.name || ''}
                          onChange={e => handleComponentChange(idx, 'materialName', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                          required
                        />

                        {/* Qty */}
                        <input 
                          type="number" 
                          step="any"
                          placeholder="Qty per Unit"
                          value={comp.quantity}
                          onChange={e => handleComponentChange(idx, 'quantity', Number(e.target.value))}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                          required
                        />

                        {/* Unit */}
                        <input 
                          type="text" 
                          placeholder="Unit (kg, g, pcs)"
                          value={comp.unit}
                          onChange={e => handleComponentChange(idx, 'unit', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                        />

                        {/* Unit Cost */}
                        <input 
                          type="number" 
                          step="any"
                          placeholder="Unit Cost (LKR)"
                          value={comp.unitCost}
                          onChange={e => handleComponentChange(idx, 'unitCost', Number(e.target.value))}
                          className="form-input"
                          style={{ fontSize: '0.85rem' }}
                        />

                        {/* Remove Button */}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveComponentRow(idx)}
                          disabled={bomForm.components.length === 1}
                          className="action-btn"
                          style={{ color: '#ef4444', opacity: bomForm.components.length === 1 ? 0.3 : 1, padding: '6px' }}
                          title="Remove Material"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Labor Model Selection */}
                <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8rem', margin: 0 }}>
                      DIRECT LABOR COSTING STRUCTURE
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${bomForm.laborType !== 'piece_rate' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setBomForm(prev => ({ ...prev, laborType: 'hourly' }))}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        In-House Hourly Time
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${bomForm.laborType === 'piece_rate' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setBomForm(prev => ({ ...prev, laborType: 'piece_rate' }))}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Outsourced Piece-Rate (Per Unit)
                      </button>
                    </div>
                  </div>

                  {bomForm.laborType === 'piece_rate' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(99, 102, 241, 0.06)', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Outsourced Piece-Rate (LKR / Unit) *</label>
                        <input 
                          type="number" 
                          min="0"
                          value={bomForm.pieceRatePerUnit}
                          onChange={e => setBomForm({ ...bomForm, pieceRatePerUnit: Number(e.target.value) })}
                          className="form-input"
                          placeholder="e.g. 450"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Assigned Contractor / Specialist</label>
                        <CustomSelect
                          value={bomForm.assignedContractor || ''}
                          onChange={val => setBomForm({ ...bomForm, assignedContractor: val })}
                          options={[
                            { value: '', label: 'Any Qualified Outsourced Contractor' },
                            ...employees
                              .filter(e => e.compensationType === 'piece_rate' || e.employmentType === 'Piece-Rate' || e.employmentType === 'Outsourced')
                              .map(e => ({ value: e.name, label: `${e.name} (${e.designation})` }))
                          ]}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Machine & Plant Overhead (LKR)</label>
                        <input 
                          type="number" 
                          value={bomForm.machineOverhead}
                          onChange={e => setBomForm({ ...bomForm, machineOverhead: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Suggested Retail Price (LKR)</label>
                        <input 
                          type="number" 
                          value={bomForm.suggestedRetailPrice}
                          onChange={e => setBomForm({ ...bomForm, suggestedRetailPrice: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Direct Labor Time (Hours)</label>
                        <input 
                          type="number" 
                          step="0.05"
                          value={bomForm.laborHours}
                          onChange={e => setBomForm({ ...bomForm, laborHours: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Hourly Labor Rate (LKR)</label>
                        <input 
                          type="number" 
                          value={bomForm.laborRatePerHour}
                          onChange={e => setBomForm({ ...bomForm, laborRatePerHour: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Machine & Plant Overhead (LKR)</label>
                        <input 
                          type="number" 
                          value={bomForm.machineOverhead}
                          onChange={e => setBomForm({ ...bomForm, machineOverhead: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Suggested Retail Price (LKR)</label>
                        <input 
                          type="number" 
                          value={bomForm.suggestedRetailPrice}
                          onChange={e => setBomForm({ ...bomForm, suggestedRetailPrice: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost Summary Box */}
                <div style={{ 
                  background: 'rgba(14, 165, 233, 0.08)', 
                  border: '1px solid rgba(14, 165, 233, 0.25)', 
                  borderRadius: '10px', 
                  padding: '1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Raw Materials: <strong>LKR {computedMaterialCost.toFixed(2)}</strong> | Labor: <strong>LKR {computedLaborCost.toFixed(2)}</strong> | Overhead: <strong>LKR {Number(bomForm.machineOverhead || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0ea5e9', marginTop: '0.25rem' }}>
                      Calculated Standard Cost: LKR {computedTotalUnitCost.toFixed(2)} per unit
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-solid">
                <button type="button" onClick={() => setShowBOMModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                  {editingBOM ? 'Save Changes' : 'Save BOM Formulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW PRODUCTION ORDER MODAL */}
      {/* ========================================================================= */}
      {showPOModal && (
        <div className="app-modal-backdrop" onClick={() => setShowPOModal(false)}>
          <div className="app-modal-dialog" style={{ maxWidth: '650px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-solid">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Launch Production Run (Work Order)
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Create and schedule a new manufacturing batch order from a predefined BOM formulation.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPOModal(false)} 
                className="action-btn"
                style={{ background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '6px' }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body-solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Select BOM Recipe Formulation *</label>
                  <CustomSelect
                    value={orderForm.bomId}
                    onChange={handleOrderBomSelect}
                    options={boms.map(b => {
                      const bName = b.productName || b.name || 'Unnamed Product';
                      const bSku = b.productSku || b.code || '—';
                      const bCost = Number(b.totalCostPerUnit || b.totalCost || 0);
                      return {
                        value: b.id,
                        label: `${bName} (SKU: ${bSku}) — Standard Cost: LKR ${bCost.toLocaleString()}`
                      };
                    })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Quantity to Produce *</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={orderForm.quantityToProduce}
                      onChange={e => setOrderForm({ ...orderForm, quantityToProduce: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Batch / Lot Tracking # *</label>
                    <input 
                      type="text" 
                      required
                      value={orderForm.batchNumber}
                      onChange={e => setOrderForm({ ...orderForm, batchNumber: e.target.value })}
                      className="form-input"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Planned Start Date</label>
                    <input 
                      type="date" 
                      value={orderForm.startDate}
                      onChange={e => setOrderForm({ ...orderForm, startDate: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Target Due Date</label>
                    <input 
                      type="date" 
                      value={orderForm.dueDate}
                      onChange={e => setOrderForm({ ...orderForm, dueDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Priority Level</label>
                    <CustomSelect
                      value={orderForm.priority}
                      onChange={val => setOrderForm({ ...orderForm, priority: val })}
                      options={[
                        { value: 'Normal', label: 'Normal' },
                        { value: 'High', label: 'High' },
                        { value: 'Urgent', label: 'Urgent' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Assigned Line / Supervisor</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Production Line 2"
                      value={orderForm.assignedTo}
                      onChange={e => setOrderForm({ ...orderForm, assignedTo: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Production Instructions / Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="Special instructions, mixing temperature tolerances, packaging constraints..."
                    value={orderForm.notes}
                    onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer-solid">
                <button type="button" onClick={() => setShowPOModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                  Schedule Production Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUALITY CONTROL (QC) INSPECTION */}
      {/* ========================================================================= */}
      {showQCModal && selectedOrderForQC && (
        <div className="app-modal-backdrop" onClick={() => setShowQCModal(false)}>
          <div className="app-modal-dialog" style={{ maxWidth: '600px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-solid">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Quality Inspection & Batch Release
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedOrderForQC.orderNumber} • {selectedOrderForQC.productName || selectedOrderForQC.name} ({selectedOrderForQC.batchNumber})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQCModal(false)} 
                className="action-btn"
                style={{ background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '6px' }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQC} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body-solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Sample Inspected</label>
                    <input 
                      type="number" 
                      value={qcForm.sampleSize}
                      onChange={e => setQcForm({ ...qcForm, sampleSize: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Units Passed</label>
                    <input 
                      type="number" 
                      value={qcForm.passedUnits}
                      onChange={e => setQcForm({ ...qcForm, passedUnits: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Scrap / Defective</label>
                    <input 
                      type="number" 
                      value={qcForm.scrappedUnits}
                      onChange={e => setQcForm({ ...qcForm, scrappedUnits: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Compliance Verdict</label>
                  <CustomSelect
                    value={qcForm.status}
                    onChange={val => setQcForm({ ...qcForm, status: val })}
                    options={[
                      { value: 'Passed', label: 'Approved & Released to Stock' },
                      { value: 'Rework', label: 'Hold for Line Rework' },
                      { value: 'Scrapped', label: 'Rejected / Complete Scrap' }
                    ]}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Inspector Notes & Tolerance Audit</label>
                  <textarea 
                    rows={3}
                    value={qcForm.notes}
                    onChange={e => setQcForm({ ...qcForm, notes: e.target.value })}
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer-solid">
                <button type="button" onClick={() => setShowQCModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Sign & Release Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW PRODUCTION ORDER TRAVELER DETAILS */}
      {/* ========================================================================= */}
      {viewingOrder && (
        <div className="app-modal-backdrop" onClick={() => setViewingOrder(null)}>
          <div className="app-modal-dialog" style={{ maxWidth: '720px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-solid">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Work Order Details: {viewingOrder.orderNumber || 'MO'}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Batch #{viewingOrder.batchNumber || '—'} • Priority: <span style={{ fontWeight: 700, color: viewingOrder.priority === 'Urgent' ? '#ef4444' : viewingOrder.priority === 'High' ? '#f59e0b' : 'var(--text-primary)' }}>{viewingOrder.priority || 'Normal'}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingOrder(null)} 
                className="action-btn"
                style={{ background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '6px' }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Meta Grid */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
                background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.25rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Target Product:</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{viewingOrder.productName || viewingOrder.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {viewingOrder.productSku || viewingOrder.code || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Target Batch Quantity:</div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0ea5e9' }}>
                    {(viewingOrder.quantityToProduce || viewingOrder.quantity || 1).toLocaleString()} units
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Assigned Line / Station:</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{viewingOrder.assignedTo || viewingOrder.supervisor || viewingOrder.workstation || 'Assembly Line 1'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Production Status:</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{viewingOrder.status}</div>
                </div>
              </div>

              {/* Instructions */}
              {viewingOrder.notes && (
                <div style={{ 
                  background: 'var(--subtle-bg)', 
                  border: '1px solid var(--panel-border)', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  fontSize: '0.88rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Notes / Instructions:</strong> {viewingOrder.notes}
                </div>
              )}
            </div>

            <div className="modal-footer-solid">
              <button
                type="button"
                onClick={() => handlePrintJobSheet(viewingOrder)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                <Printer size={16} />
                <span>Print Job Traveler PDF</span>
              </button>

              <button type="button" onClick={() => setViewingOrder(null)} className="btn btn-primary" style={{ fontWeight: 600 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Manufacturing;
