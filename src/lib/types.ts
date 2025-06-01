
export type InventoryItem = {
  id: string;
  code: string; 
  name: string;
  quantity: number;
  stockMinimo: number;
  dailySales: number; 
  category?: string; 
  supplier?: string;
  unitPrice?: number;
  lastUpdated: string; 
};

export type NewInventoryItemFormValues = {
  categoryCodePrefix: string; 
  shelfCodePrefix: string; 
  name: string;
  quantity: string; 
  stockMinimo: string;
  dailySales: string;
  category?: string; 
  supplier?: string;
  unitPrice?: string;
};

export type EditInventoryItemFormValues = {
  id: string; 
  name: string;
  stockMinimo: string;
  dailySales: string;
  category?: string;
  supplier?: string;
  unitPrice?: string;
};

export type UpdateStockFormValues = {
  code: string; 
  quantityToAdd: string;
};

export type Supplier = {
  id: string;
  name: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  productos_suministrados?: string[];
  lastUpdated: string;
};

export type SupplierFormValues = {
  id?: string;
  name: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  productos_suministrados_string?: string;
};

export type User = {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'empleado' | 'inventory_manager';
  password?: string; 
  lastUpdated: string;
};

export type UserFormValues = {
  id?: string; 
  nombre: string;
  email: string;
  rol: 'admin' | 'empleado' | 'inventory_manager';
  password?: string;
  confirmPassword?: string;
};

export type LoginCredentials = {
  nombre: string;
  password?: string;
};

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string; 
  registrationDate: string; 
  lastUpdated: string; 
};

export type CustomerFormValues = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string;
};

// --- Sales Types ---
export type PaymentMethod = 'efectivo' | 'tarjeta';

export type SaleItem = {
  productId: string; 
  productCode: string;
  productName: string;
  quantity: number;
  unitPriceAtSale: number; // Price at the time of sale
  subtotal: number;
};

export type Sale = {
  id: string;
  saleNumber: string; // Auto-generated, e.g., V00001
  date: string; // ISO date string of sale
  customerId?: string; 
  customerName?: string; // Denormalized for quick display
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  userId: string; // ID of the user (empleado/admin) who made the sale
  sellerName?: string; // Denormalized name of the user who made the sale
  lastUpdated: string; // ISO date string
};

// For the "Create Sale" form
export type SaleItemFormValues = {
  productId: string;
  productCode: string; // For display
  productName: string; // For display
  quantity: string; // Input as string, converted to number
  unitPriceAtSale: number; // Fetched from product, stored at time of adding to sale
  availableStock: number; // To check against quantity input
};

export type CreateSaleFormValues = {
  customerId?: string; // Optional
  items: SaleItemFormValues[];
  paymentMethod: PaymentMethod;
};

// For the "Edit Sale" form (limited editing)
export type EditSaleFormValues = {
  saleId: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
};

// --- Audit Log Types ---
export type AuditLogEntry = {
  id: string;
  timestamp: string; // ISO date string
  actorUserId: string;
  actorName: string;
  actorRole: User['rol'] | 'Desconocido';
  actionType: string; // e.g., "CREATE_ITEM", "UPDATE_USER", "USER_LOGIN_SUCCESS"
  details: Record<string, any>; // Flexible object for action-specific details
};
