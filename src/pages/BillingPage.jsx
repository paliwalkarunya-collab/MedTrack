import InvoicePreviewModal from '../components/billing/InvoicePreviewModal';
import { useCallback, useMemo, useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { calculateRemainingStock, calculateSellingPricePerUnit } from '../utils/medicineCalculations';
import { CustomerDetailsCard } from '../components/billing/CustomerDetailsCard';
import { MedicineSearchPanel } from '../components/billing/MedicineSearchPanel';
import { BillingCart } from '../components/billing/BillingCart';
import { BillSummary } from '../components/billing/BillSummary';
import { allocateFifoBatches } from '../utils/fifoBatchUtils';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { generateInvoicePdf } from '../utils/invoiceUtils';

const emptyQuantity = { packs: '0', looseUnits: '0' };
const createBillNumber = (sequence) => `BILL-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;
const toNonNegativeNumber = (value) => Math.max(0, Number(value) || 0);

const createCartItem = (medicine, selectedQuantity) => {
  const packs = toNonNegativeNumber(selectedQuantity.packs);
  const looseUnits = toNonNegativeNumber(selectedQuantity.looseUnits);
  const pricePerUnit = calculateSellingPricePerUnit(medicine);
  const requestedUnits = packs * medicine.packaging.unitsPerPack + looseUnits;
  const batchUsed = allocateFifoBatches(medicine, requestedUnits).allocations;

  return {
    medicine,
    packs,
    looseUnits,
    pricePerUnit,
    batchUsed,
    lineTotal: packs * medicine.pricing.sellingPricePerPack + looseUnits * pricePerUnit,
  };
};

export const BillingPage = () => {
  const { inventory, deductStockForBill } = useInventory();
  const { createInvoice } = useBillingHistory();
  const [customer, setCustomer] = useState({ name: '', phone: '', doctor: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [quantity, setQuantity] = useState(emptyQuantity);
  const [cartItems, setCartItems] = useState([]);
  const [selectionError, setSelectionError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(emptyQuantity);
  const [billSequence, setBillSequence] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedMedicine = useMemo(
    () => inventory.find((medicine) => medicine.id === selectedMedicineId) || null,
    [inventory, selectedMedicineId]
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return inventory.filter((medicine) => [medicine.name, medicine.genericName, medicine.brandName, medicine.barcode, medicine.batchNumber]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query)))
      .slice(0, 8);
  }, [inventory, searchQuery]);

  const remainingStock = useMemo(
    () => selectedMedicine ? calculateRemainingStock(selectedMedicine, toNonNegativeNumber(quantity.packs), toNonNegativeNumber(quantity.looseUnits)) : null,
    [quantity, selectedMedicine]
  );
  const subtotal = useMemo(() => cartItems.reduce((total, item) => total + item.lineTotal, 0), [cartItems]);
  const totalItems = useMemo(() => cartItems.reduce((total, item) => total + item.packs + item.looseUnits, 0), [cartItems]);
  const cartHasInsufficientStock = useMemo(() => cartItems.some((item) => {
    const medicine = inventory.find((inventoryItem) => inventoryItem.id === item.medicine.id);
    return !medicine || !allocateFifoBatches(medicine, item.packs * medicine.packaging.unitsPerPack + item.looseUnits).isSufficient;
  }), [cartItems, inventory]);

  const validateQuantity = (medicine, selectedQuantity) => {
    const packs = Number(selectedQuantity.packs);
    const looseUnits = Number(selectedQuantity.looseUnits);
    if (packs < 0 || looseUnits < 0) return 'Quantities cannot be negative.';
    if (!packs && !looseUnits) return 'Enter at least one pack or loose unit.';
    if (!Number.isInteger(packs) || !Number.isInteger(looseUnits)) return 'Quantities must be whole numbers.';
    if (!allocateFifoBatches(medicine, packs * medicine.packaging.unitsPerPack + looseUnits).isSufficient) return 'No sellable stock available.';
    return '';
  };

  const handleSelectMedicine = useCallback((medicine) => {
    setSelectedMedicineId(medicine.id);
    setSearchQuery(medicine.name);
    setQuantity(emptyQuantity);
    setSelectionError('');
    setSuccessMessage('');
  }, []);

  const addScannedMedicine = useCallback((medicine) => {
    const currentItem = cartItems.find((item) => item.medicine.id === medicine.id);
    const defaultQuantity = medicine.sellingOptions.allowSellingByPack ? { packs: 1, looseUnits: 0 } : { packs: 0, looseUnits: 1 };
    const nextQuantity = {
      packs: (currentItem?.packs || 0) + defaultQuantity.packs,
      looseUnits: (currentItem?.looseUnits || 0) + defaultQuantity.looseUnits,
    };
    const error = validateQuantity(medicine, nextQuantity);
    if (error) { setSelectionError(error); return { message: error }; }
    const nextItem = createCartItem(medicine, nextQuantity);
    setCartItems((items) => currentItem ? items.map((item) => item.medicine.id === medicine.id ? nextItem : item) : [...items, nextItem]);
    setQuantity(emptyQuantity);
    setSelectionError('');
    setSuccessMessage('');
    return { message: `${medicine.name} found and added to the cart.` };
  }, [cartItems]);

  const handleBarcodeScan = useCallback((barcode) => {
    setSearchQuery(barcode);
    const medicine = inventory.find((item) => item.barcode === barcode);
    if (!medicine) {
      const message = `No medicine found with barcode ${barcode}`;
      console.info('[BarcodeScanner] Medicine not found.', { barcode });
      setSelectionError(message);
      return { message };
    }
    console.info('[BarcodeScanner] Medicine found.', { barcode, medicineId: medicine.id });
    setSelectedMedicineId(medicine.id);
    return addScannedMedicine(medicine);
  }, [addScannedMedicine, inventory]);

  const handleAddToCart = () => {
    if (!selectedMedicine) { setSelectionError('Select a medicine before adding it to the cart.'); return; }
    const error = validateQuantity(selectedMedicine, quantity);
    if (error) { setSelectionError(error); return; }
    const nextItem = createCartItem(selectedMedicine, quantity);
    setCartItems((items) => items.some((item) => item.medicine.id === selectedMedicine.id)
      ? items.map((item) => item.medicine.id === selectedMedicine.id ? nextItem : item)
      : [...items, nextItem]);
    setQuantity(emptyQuantity);
    setSelectionError('');
    setSuccessMessage('');
  };

  const handleSaveEdit = (medicineId) => {
    const medicine = inventory.find((item) => item.id === medicineId);
    const error = medicine ? validateQuantity(medicine, editQuantity) : 'Medicine is no longer available.';
    if (error) { setSelectionError(error); return; }
    const nextItem = createCartItem(medicine, editQuantity);
    setCartItems((items) => items.map((item) => item.medicine.id === medicineId ? nextItem : item));
    setEditingId(null);
    setSelectionError('');
  };

  const clearCart = () => { setCartItems([]); setEditingId(null); setSuccessMessage(''); setSelectionError(''); };
  const generateBill = async () => {
    if (!cartItems.length || cartHasInsufficientStock) return;
    const billItems = deductStockForBill(cartItems);
    const invoice = createInvoice({ billNumber: createBillNumber(billSequence), customer, paymentMethod, discount: 0, gst: 0, subtotal, grandTotal: subtotal, totalItems, items: billItems });
    setCurrentInvoice(invoice);
    setShowPreview(true);

    setSuccessMessage(
      `${invoice.invoiceId} generated successfully. Inventory was updated.`
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Billing</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create customer bills and update stock automatically.</p></div>
      <CustomerDetailsCard billNumber={createBillNumber(billSequence)} customer={customer} onChange={(event) => setCustomer((currentCustomer) => ({ ...currentCustomer, [event.target.name]: event.target.value }))} paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><MedicineSearchPanel searchQuery={searchQuery} onSearchChange={(value) => { setSearchQuery(value); setSuccessMessage(''); setSelectionError(''); }} onBarcodeScan={handleBarcodeScan} results={searchResults} selectedMedicine={selectedMedicine} quantity={quantity} remainingStock={remainingStock} onQuantityChange={(event) => setQuantity((currentQuantity) => ({ ...currentQuantity, [event.target.name]: event.target.value }))} onSelectMedicine={handleSelectMedicine} onAddToCart={handleAddToCart} error={selectionError} /><BillSummary subtotal={subtotal} totalItems={totalItems} hasItems={cartItems.length > 0 && !cartHasInsufficientStock} onGenerateBill={generateBill} onClearCart={clearCart} successMessage={successMessage} /></div>
      <BillingCart
        items={cartItems}
        editingId={editingId}
        editQuantity={editQuantity}
        onStartEdit={(item) => {
          setEditingId(item.medicine.id);
          setEditQuantity({
            packs: String(item.packs),
            looseUnits: String(item.looseUnits),
          });
          setSelectionError('');
        }}
        onEditQuantityChange={(event) =>
          setEditQuantity((currentQuantity) => ({
            ...currentQuantity,
            [event.target.name]: event.target.value,
          }))
        }
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onRemove={(medicineId) => {
          setCartItems((items) =>
            items.filter((item) => item.medicine.id !== medicineId)
          );
          if (editingId === medicineId) setEditingId(null);
        }}
      />

      <InvoicePreviewModal
        invoice={currentInvoice}
        isOpen={showPreview}
        onClose={async () => {
          if (currentInvoice) {
            await generateInvoicePdf(currentInvoice);

            setBillSequence((sequence) => sequence + 1);
            setCartItems([]);
            setEditingId(null);
            setCurrentInvoice(null);
          }

          setShowPreview(false);
        }}
      />

    </div>
  );

};
