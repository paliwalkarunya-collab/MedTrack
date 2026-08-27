import { API_BASE_URL, API_ENDPOINTS } from './config';

let pharmacyId = null;

export const setPharmacyId = (id) => {
  pharmacyId = id;
};

export const getPharmacyId = () => pharmacyId;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('medtrack-access-token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (pharmacyId) {
    headers['X-Pharmacy-ID'] = pharmacyId;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const message = errorData.detail || errorData.message || `HTTP ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async patch(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Auth API
export const authApi = {
  register: (data) => api.post(API_ENDPOINTS.auth.register, data),
  login: (data) => api.post(API_ENDPOINTS.auth.login, data),
  getMe: () => api.get(API_ENDPOINTS.auth.me),
  getPharmacies: () => api.get(API_ENDPOINTS.auth.pharmacies),
  selectPharmacy: (pharmacyId) => api.post(API_ENDPOINTS.auth.selectPharmacy, { pharmacy_id: pharmacyId }),
  getCurrentPharmacy: () => api.get(API_ENDPOINTS.auth.currentPharmacy),
};

// Medicines API
export const medicinesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.medicines.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.medicines.create, data),
  get: (id) => api.get(API_ENDPOINTS.medicines.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.medicines.update(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.medicines.delete(id)),
};

// Categories API
export const categoriesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.categories.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.categories.create, data),
  get: (id) => api.get(API_ENDPOINTS.categories.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.categories.update(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.categories.delete(id)),
};

// Inventory Batches API
export const batchesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.batches.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.batches.create, data),
  get: (id) => api.get(API_ENDPOINTS.batches.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.batches.update(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.batches.delete(id)),
};

// Suppliers API
export const suppliersApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.suppliers.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.suppliers.create, data),
  get: (id) => api.get(API_ENDPOINTS.suppliers.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.suppliers.update(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.suppliers.delete(id)),
};

// Purchases API
export const purchasesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.purchases.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.purchases.create, data),
  get: (id) => api.get(API_ENDPOINTS.purchases.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.purchases.update(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.purchases.delete(id)),
  receive: (id) => api.post(API_ENDPOINTS.purchases.receive(id)),
};

// Invoices API
export const invoicesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.invoices.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.invoices.create, data),
  get: (id) => api.get(API_ENDPOINTS.invoices.get(id)),
  update: (id, data) => api.patch(API_ENDPOINTS.invoices.update(id), data),
  complete: (id) => api.post(API_ENDPOINTS.invoices.complete(id)),
  cancel: (id) => api.delete(API_ENDPOINTS.invoices.cancel(id)),
  createCustomer: (data) => api.post(API_ENDPOINTS.invoices.customers, data),
};

// Returns API
export const returnsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.returns.list}${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post(API_ENDPOINTS.returns.create, data),
  get: (id) => api.get(API_ENDPOINTS.returns.get(id)),
  complete: (id) => api.post(API_ENDPOINTS.returns.complete(id)),
  cancel: (id) => api.patch(API_ENDPOINTS.returns.cancel(id)),
  delete: (id) => api.delete(API_ENDPOINTS.returns.delete(id)),
};

// Settings API
export const settingsApi = {
  get: () => api.get(API_ENDPOINTS.settings.get),
  update: (data) => api.patch(API_ENDPOINTS.settings.update, data),
};

// Expiry API
export const expiryApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.expiry.list}${query ? `?${query}` : ''}`);
  },
  summary: () => api.get(API_ENDPOINTS.expiry.summary),
  expired: () => api.get(API_ENDPOINTS.expiry.expired),
  expiringSoon: () => api.get(API_ENDPOINTS.expiry.expiringSoon),
};

// Alerts API
export const alertsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.alerts.list}${query ? `?${query}` : ''}`);
  },
  summary: () => api.get(API_ENDPOINTS.alerts.summary),
  lowStock: () => api.get(API_ENDPOINTS.alerts.lowStock),
};

// Reports API
export const reportsApi = {
  sales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.sales}${query ? `?${query}` : ''}`);
  },
  salesSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.salesSummary}${query ? `?${query}` : ''}`);
  },
  purchases: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.purchases}${query ? `?${query}` : ''}`);
  },
  purchasesSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.purchasesSummary}${query ? `?${query}` : ''}`);
  },
  cogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.cogs}${query ? `?${query}` : ''}`);
  },
  cogsSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.cogsSummary}${query ? `?${query}` : ''}`);
  },
  profit: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.profit}${query ? `?${query}` : ''}`);
  },
  profitSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.profitSummary}${query ? `?${query}` : ''}`);
  },
  dashboardSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.dashboardSummary}${query ? `?${query}` : ''}`);
  },
  topMedicines: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.topMedicines}${query ? `?${query}` : ''}`);
  },
  topSuppliers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`${API_ENDPOINTS.reports.topSuppliers}${query ? `?${query}` : ''}`);
  },
};

export { ApiError };