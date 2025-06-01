
export type UnitType = 'countable' | 'measurable';

// SellingUnit type is removed as we revert to a single unit per product.

export type InventoryItem = {
  id: string;
  code: string;
  name: string; // Conceptual name, e.g., "Pintura Acrílica Azul"
  quantity: number; // Stock in a single defined unit
  unitPrice: number; // Price for the 'unitName'
  stockMinimo: number; // Minimum stock for the 'unitName'
  dailySales: number; // Average daily sales in the 'unitName'
  category?: string;
  supplier?: string;
  unitType: UnitType; // Type of the 'unitName'
  unitName: string; // Name of the single unit for stock, price, and sales (e.g., "litro", "pieza", "galón")
  lastUpdated: string;
};

export type NewInventoryItemFormValues = {
  categoryCodePrefix: string;
  shelfCodePrefix: string;
  name: string;
  quantity: string; // Stock in 'unitName'
  unitPrice: string; // Price for 'unitName'
  stockMinimo: string; // Minimum stock for 'unitName'
  dailySales: string; // In 'unitName'
  category?: string;
  supplier?: string;
  unitType: UnitType;
  unitName: string;
};

export type EditInventoryItemFormValues = {
  id: string;
  name: string;
  unitPrice: string;
  stockMinimo: string;
  dailySales: string; // In 'unitName'
  category?: string;
  supplier?: string;
  unitType: UnitType;
  unitName: string;
};

export type UpdateStockFormValues = {
  code: string;
  quantityToAdd: string; // Quantity to add in 'unitName'
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
  productId: string; // ID of the InventoryItem
  productCode: string;
  productName: string; // Name of the InventoryItem
  quantitySold: number; // How many of the product's unitName were sold
  unitNameAtSale: string; // The unitName of the product at the time of sale
  priceAtSale: number; // Price per unitName at the time of sale
  subtotal: number;
};

export type Sale = {
  id: string;
  saleNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  userId: string;
  sellerName?: string;
  lastUpdated: string;
};

// For the "Create Sale" form
export type SaleItemFormValues = {
  inventoryItemId: string; // The ID of the main InventoryItem
  productCode: string;
  productName: string;
  unitName: string; // Unit name of the product
  unitPrice: number; // Price per unit of the product
  quantityToSell: string; // Quantity of the product's unit (as string from input)
  availableStock: number; // Current stock of the product in its unitName
};

export type CreateSaleFormValues = {
  customerId?: string;
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
  timestamp: string;
  actorUserId: string;
  actorName: string;
  actorRole: User['rol'] | 'Desconocido';
  actionType: string;
  details: Record<string, any>;
};
