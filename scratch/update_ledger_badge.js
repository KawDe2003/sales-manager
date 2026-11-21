const fs = require('fs');
const filePath = 'src/pages/Ledger.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `              {/* VOUCHER BALANCE STATUS BADGE */}
              <div style={{ 
                padding: '16px 20px', 
                borderRadius: '16px', 
                background: voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)',
                border: \`1px solid \${voucherTotals.isBalanced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}\`,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {voucherTotals.isBalanced ? (
                    <CheckCircle2 size={22} style={{ color: '#34d399' }} />
                  ) : (
                    <AlertTriangle size={22} style={{ color: '#fb7185' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: voucherTotals.isBalanced ? '#34d399' : '#fb7185' }}>
                      {voucherTotals.isBalanced ? 'Voucher is Perfectly Balanced' : 'Unbalanced Journal Voucher'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                      Total Debits: LKR {voucherTotals.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Total Credits: LKR {voucherTotals.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {!voucherTotals.isBalanced && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fb7185', fontSize: '0.9rem' }}>
                    Diff: LKR {Math.abs(voucherTotals.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>`;

const replacement = `              {/* VOUCHER BALANCE STATUS BADGE */}
              <div style={{ 
                padding: '16px 20px', 
                borderRadius: '16px', 
                background: voucherTotals.isBalanced 
                  ? 'rgba(16, 185, 129, 0.14)' 
                  : voucherTotals.isUnbalanced 
                    ? 'rgba(244, 63, 94, 0.14)' 
                    : 'rgba(148, 163, 184, 0.08)',
                border: \`1px solid \${
                  voucherTotals.isBalanced 
                    ? 'rgba(16, 185, 129, 0.35)' 
                    : voucherTotals.isUnbalanced 
                      ? 'rgba(244, 63, 94, 0.35)' 
                      : 'rgba(148, 163, 184, 0.2)'
                }\`,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {voucherTotals.isBalanced ? (
                    <CheckCircle2 size={22} style={{ color: '#34d399' }} />
                  ) : voucherTotals.isUnbalanced ? (
                    <AlertTriangle size={22} style={{ color: '#fb7185' }} />
                  ) : (
                    <Layers size={22} style={{ color: '#94a3b8' }} />
                  )}
                  <div>
                    <div style={{ 
                      fontWeight: 900, 
                      fontSize: '0.9rem', 
                      color: voucherTotals.isBalanced 
                        ? '#34d399' 
                        : voucherTotals.isUnbalanced 
                          ? '#fb7185' 
                          : '#94a3b8' 
                    }}>
                      {voucherTotals.isBalanced 
                        ? 'Voucher is Perfectly Balanced' 
                        : voucherTotals.isUnbalanced 
                          ? 'Unbalanced Journal Voucher' 
                          : 'Draft Journal Lines (Minimum 2 Balanced Lines Required)'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Total Debits: <strong style={{ color: '#ffffff' }}>LKR {voucherTotals.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                      <span>Total Credits: <strong style={{ color: '#ffffff' }}>LKR {voucherTotals.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                      <span>Diff: <strong style={{ color: voucherTotals.isUnbalanced ? '#fb7185' : '#34d399' }}>LKR {Math.abs(voucherTotals.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                </div>

                {voucherTotals.isUnbalanced && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fb7185', fontSize: '0.9rem' }}>
                    Diff: LKR {Math.abs(voucherTotals.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>`;

const normC = content.replace(/\r\n/g, '\n');
const normT = target.replace(/\r\n/g, '\n');
const normR = replacement.replace(/\r\n/g, '\n');

if (normC.includes(normT)) {
  fs.writeFileSync(filePath, normC.replace(normT, normR), 'utf8');
  console.log('SUCCESSFUL_REPLACEMENT');
} else {
  console.log('TARGET_NOT_FOUND');
}
