import { usePharmacy } from '../hooks/pharmacyContext';

export const PharmacySelector = () => {
  const { currentPharmacy, accessiblePharmacies, selectPharmacy, isLoading } = usePharmacy();

  if (accessiblePharmacies.length <= 1) {
    return null;
  }

  const handleChange = async (e) => {
    await selectPharmacy(e.target.value);
    window.location.reload(); // Reload to refresh tenant-scoped data
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <label htmlFor="pharmacy-select" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Pharmacy:
      </label>
      <select
        id="pharmacy-select"
        value={currentPharmacy?.pharmacy_id || ''}
        onChange={handleChange}
        disabled={isLoading || accessiblePharmacies.length <= 1}
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
      >
        {accessiblePharmacies.map((pharmacy) => (
          <option key={pharmacy.pharmacy_id} value={pharmacy.pharmacy_id}>
            {pharmacy.pharmacy_name} ({pharmacy.role})
          </option>
        ))}
      </select>
    </div>
  );
};