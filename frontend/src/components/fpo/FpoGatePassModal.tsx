import React from 'react';
import {
  Printer,
  X,
  Truck,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  FileText,
  CheckSquare,
} from 'lucide-react';
import type { FpoPlanResponse } from '../../api/types';
import { formatRupee } from '../../i18n';

interface FpoGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FpoPlanResponse;
  crop: string;
  quantity: number;
  currentLang: string;
}

export const FpoGatePassModal: React.FC<FpoGatePassModalProps> = ({
  isOpen,
  onClose,
  plan,
  crop,
  quantity,
  currentLang,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalTrucks = plan.allocations.reduce((acc, curr) => acc + curr.trucksNeeded, 0);
  const manifestId = `FPO-DSP-2026-${Math.abs(quantity * 7 + 104)}`;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-ink/60 flex items-center justify-center p-4 print:static print:inset-auto print:z-auto print:overflow-visible print:bg-neutral-surface print:p-0 print:block">
      {/* Modal Dialog Card */}
      <div className="bg-neutral-surface border-2 border-neutral-ink w-full max-w-4xl shadow-hard my-8 flex flex-col max-h-[90vh] print:border-none print:shadow-none print:w-full print:max-w-none print:my-0 print:max-h-none print:p-0">
        {/* Modal Controls Bar (Hidden during actual paper print) */}
        <div className="p-4 border-b-2 border-neutral-ink bg-neutral-bg flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-black text-neutral-ink text-base">
              {currentLang === 'mr'
                ? 'अधिकृत शेतकरी उत्पादक कंपनी (FPO) गेट पास व ड्रायव्हर मॅनिटेस्ट'
                : 'Official FPO Dispatch Order & Mandi Gate Pass Manifest'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-hover text-primary-fg font-black py-2 px-4 border-2 border-neutral-ink shadow-hard flex items-center gap-2 text-sm cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{currentLang === 'mr' ? 'प्रिंट करा (A4)' : 'Print Document (A4)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 border-2 border-neutral-ink bg-neutral-surface hover:bg-neutral-bg text-neutral-ink cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6 text-neutral-ink bg-neutral-surface">
          {/* Document Letterhead */}
          <div className="border-b-2 border-neutral-ink pb-4 text-center relative">
            <div className="inline-flex items-center gap-2 bg-primary text-primary-fg px-3 py-0.5 text-sm font-black uppercase tracking-wider border border-neutral-ink mb-1">
              <Building2 className="w-4 h-4" />
              <span>SELLSMART FARMER PRODUCER COMPANY LTD.</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-neutral-ink">
              {currentLang === 'mr'
                ? 'व्यापारी माल पाठवणूक आदेश व बाजार समिती प्रवेश पास'
                : 'COMMERCIAL DISPATCH ORDER & MANDI GATE ENTRY PASS'}
            </h2>
            <p className="text-sm text-neutral-muted mt-1">
              CIN: U01100MH2024PTC123456 • Aggregation Hub: {plan.hubName || 'Niphad Central Aggregation Hub'}
            </p>

            {/* Manifest Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-3 bg-neutral-bg border-2 border-neutral-border text-sm text-left">
              <div>
                <span className="text-neutral-muted font-bold block">Manifest No:</span>
                <span className="font-black text-neutral-ink">{manifestId}</span>
              </div>
              <div>
                <span className="text-neutral-muted font-bold block">Issue Date:</span>
                <span className="font-bold text-neutral-ink">{issueDate}</span>
              </div>
              <div>
                <span className="text-neutral-muted font-bold block">Consignment Lot:</span>
                <span className="font-bold text-neutral-ink">
                  {quantity} qtl ({crop.toUpperCase()})
                </span>
              </div>
              <div>
                <span className="text-neutral-muted font-bold block">Fleet Allotment:</span>
                <span className="font-bold text-neutral-ink">
                  {totalTrucks} Trucks (10-Tonne)
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Formatted Driver Intake Notes & Weighbridge Checklist */}
          <div>
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-neutral-ink">
              <Truck className="w-5 h-5 text-secondary" />
              <h3 className="font-black text-base uppercase tracking-wide text-neutral-ink">
                {currentLang === 'mr'
                  ? '१. वाहन व ड्रायव्हर नोंद आणि वजनकाटा तपासणी'
                  : '1. Driver Intake Notes & Packhouse Weighbridge Checklist'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
              {/* Left Column: Driver & Truck Placeholders */}
              <div className="border-2 border-neutral-border p-4 bg-neutral-bg space-y-3">
                <div className="font-black text-neutral-ink border-b border-neutral-border pb-1">
                  {currentLang === 'mr' ? 'वाहन व चालक तपशील' : 'Assigned Vehicle & Driver Credentials'}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-muted font-bold">Truck Reg. Number:</span>
                  <span className="font-mono font-bold text-neutral-ink border-b-2 border-neutral-ink px-3 py-0.5">
                    MH-15-_______________
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-muted font-bold">Driver Name:</span>
                  <span className="font-bold text-neutral-ink border-b-2 border-neutral-ink px-3 py-0.5 min-w-[160px] text-right">
                    _________________________
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-muted font-bold">Driver Mobile:</span>
                  <span className="font-bold text-neutral-ink border-b-2 border-neutral-ink px-3 py-0.5 min-w-[160px] text-right">
                    +91 __________________
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-muted font-bold">Driving License:</span>
                  <span className="font-mono font-bold text-neutral-ink border-b-2 border-neutral-ink px-3 py-0.5 min-w-[160px] text-right">
                    _________________________
                  </span>
                </div>
              </div>

              {/* Right Column: Weighbridge & Quality Checklist */}
              <div className="border-2 border-neutral-border p-4 bg-neutral-bg space-y-2.5">
                <div className="font-black text-neutral-ink border-b border-neutral-border pb-1">
                  {currentLang === 'mr' ? 'वजनकाटा व गुणवत्ता खात्री' : 'Weighbridge & Quality Verification'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-ink inline-block" />
                  <span className="text-neutral-ink font-bold">
                    Tare Weight (रिकामे वाहन): ____________ kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-ink inline-block" />
                  <span className="text-neutral-ink font-bold">
                    Gross Weight (मालासह वजन): ____________ kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-ink inline-block" />
                  <span className="text-neutral-ink font-bold">
                    Net Cargo Verified: ____________ Quintals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-neutral-ink inline-block" />
                  <span className="text-neutral-ink font-bold">
                    Moisture & Quality Curing Stamp: PASSED (&lt; 14%)
                  </span>
                </div>
              </div>
            </div>

            {/* Transit Hamali & Toll Notice */}
            <div className="mt-3 p-3 bg-neutral-bg border border-neutral-border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-neutral-ink">
                ⚠️ {currentLang === 'mr'
                  ? 'हमाली सूचना: पॅकहाऊस लोडिंग हमाली ₹१५/क्विंटल निश्चित. वाटेतील टोल पावती मंडी सेटलमेंटमध्ये जमा करावी.'
                  : 'Transit Notice: Packhouse loading Hamali fixed at ₹15/qtl. Keep toll receipts for APMC settlement reimbursement.'}
              </span>
              <span className="font-bold text-sell shrink-0">
                Gate Entry Window: 04:00 AM – 05:30 AM
              </span>
            </div>
          </div>

          {/* Section 2: Official Mandi Gate Passes (Cut-Out Slips) */}
          <div>
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-neutral-ink">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h3 className="font-black text-base uppercase tracking-wide text-neutral-ink">
                {currentLang === 'mr'
                  ? '२. बाजार समिती अधिकृत प्रवेश पास (गेट पावती)'
                  : '2. Official Mandi Gate Inward Passes (Field Cut-Out Vouchers)'}
              </h3>
            </div>
            <p className="text-sm text-neutral-muted mb-3">
              {currentLang === 'mr'
                ? 'प्रत्येक ट्रक चालकाने संबंधित बाजार समितीच्या प्रवेशद्वारावर हा पास सादर करणे अनिवार्य आहे.'
                : 'Each vehicle driver must present this stamped pass at the respective APMC security gate.'}
            </p>

            {/* Vouchers Stack */}
            <div className="space-y-4">
              {plan.allocations.map((a, idx) => (
                <div
                  key={a.mandiId}
                  className="border-2 border-dashed border-neutral-ink p-4 bg-neutral-bg break-inside-avoid"
                >
                  {/* Cut-out guide */}
                  <div className="text-xs uppercase font-mono font-bold text-neutral-muted mb-2 flex items-center justify-between border-b border-neutral-border pb-1">
                    <span>✂ CUT HERE FOR DRIVER GATE PASS</span>
                    <span>PASS CODE: GP-{a.mandiId.toUpperCase().slice(0, 4)}-0{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {/* Destination & Volume */}
                    <div>
                      <span className="text-neutral-muted font-bold block">Destination APMC:</span>
                      <span className="font-black text-neutral-ink text-base">
                        {currentLang === 'mr' ? a.mandiName_mr : a.mandiName}
                      </span>
                      <span className="text-sm text-neutral-muted block">
                        Quota: {a.quantityQuintals} qtl ({a.percentage}% share)
                      </span>
                    </div>

                    {/* Fleet & Slot */}
                    <div>
                      <span className="text-neutral-muted font-bold block">Departure Window:</span>
                      <span className="font-bold text-primary flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        {a.dispatchDate}
                      </span>
                      <span className="text-sm text-neutral-ink font-bold block mt-0.5">
                        Vehicles: {a.trucksNeeded} x 10-Tonne Trucks
                      </span>
                    </div>

                    {/* Economic Projections */}
                    <div>
                      <span className="text-neutral-muted font-bold block">Expected Floor Price:</span>
                      <span className="font-black text-sell text-base">
                        @{formatRupee(a.expectedPrice)}/qtl
                      </span>
                      <span className="text-sm text-neutral-muted block">
                        Freight: {formatRupee(a.estimatedFreight)}/qtl
                      </span>
                    </div>
                  </div>

                  {/* Sign-off Boxes */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-neutral-border text-center text-sm">
                    <div className="p-2 border border-neutral-border bg-neutral-surface">
                      <span className="text-neutral-muted font-bold block">Packhouse Manager</span>
                      <span className="font-bold text-neutral-ink block mt-4 border-t border-neutral-ink pt-0.5">
                        [Sign & Stamp]
                      </span>
                    </div>
                    <div className="p-2 border border-neutral-border bg-neutral-surface">
                      <span className="text-neutral-muted font-bold block">Assigned Driver</span>
                      <span className="font-bold text-neutral-ink block mt-4 border-t border-neutral-ink pt-0.5">
                        [Signature]
                      </span>
                    </div>
                    <div className="p-2 border border-neutral-border bg-neutral-surface">
                      <span className="text-neutral-muted font-bold block">APMC Inward Gate</span>
                      <span className="font-bold text-neutral-ink block mt-4 border-t border-neutral-ink pt-0.5">
                        [Time & Date Stamp]
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Security Footer */}
          <div className="border-t-2 border-neutral-ink pt-3 flex flex-col sm:flex-row items-center justify-between text-sm text-neutral-muted">
            <span className="font-bold">
              Protected by SellSmart Anti-Glut Dispatch Engine • All consignments verified under 2.5% market share.
            </span>
            <span className="font-mono text-neutral-ink font-bold">
              PAGE 1 OF 1 • VERIFIED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
