
'use client';

import { z } from 'zod';
import type { UnitType } from './types'; // Import UnitType

// SellingUnitClientSchema is removed.

// Schema for validating data for a NEW inventory item (client-side, Zod resolver)
export const NewInventoryItemClientSchema = z.object({
  categoryCodePrefix: z.string().min(1, "Debes seleccionar un código de categoría."),
  shelfCodePrefix: z.string()
    .min(2, "El código de estante debe tener 2 caracteres.")
    .max(2, "El código de estante debe tener 2 caracteres.")
    .regex(/^[a-zA-Z0-9]{2}$/, "El código de estante debe ser alfanumérico de 2 caracteres."),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  quantity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'La cantidad debe ser un número no negativo.'}),
  unitPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'El precio unitario debe ser un número no negativo.' }),
  stockMinimo: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'Las existencias mínimas deben ser un número no negativo.'}),
  dailySales: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'Las ventas diarias deben ser un número no negativo.'}),
  category: z.string().optional(),
  supplier: z.string().optional(),
  unitType: z.enum(['countable', 'measurable'], { required_error: "Debes seleccionar un tipo de unidad."}),
  unitName: z.string().min(1, "El nombre de la unidad es obligatorio (ej: pieza, galón, metro)."),
});

const CODE_REGEX = /^\d{2}-[a-zA-Z0-9]{2}-\d{5}$/;
const CODE_ERROR_MESSAGE = "El código debe tener el formato CC-SS-NNNNN (ej: 01-A1-00001)";

// Schema for validating data for UPDATING STOCK of an existing item (client-side, Zod resolver)
export const UpdateStockClientSchema = z.object({
  code: z.string().regex(CODE_REGEX, CODE_ERROR_MESSAGE).min(1, "El código del artículo es requerido."),
  quantityToAdd: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: 'La cantidad a añadir debe ser un número positivo.'}),
});

// Schema for EDITING details of an existing inventory item (client-side)
export const EditInventoryItemClientSchema = z.object({
  id: z.string().min(1, "ID del artículo es requerido para la edición."),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  unitPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'El precio unitario debe ser un número no negativo.' }),
  stockMinimo: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'Las existencias mínimas deben ser un número no negativo.'}),
  dailySales: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'Las ventas diarias deben ser un número no negativo.'}),
  category: z.string().optional(),
  supplier: z.string().optional(),
  unitType: z.enum(['countable', 'measurable'], { required_error: "Debes seleccionar un tipo de unidad."}),
  unitName: z.string().min(1, "El nombre de la unidad es obligatorio (ej: pieza, galón, metro)."),
});


// Schema for User creation and editing
export const UserFormClientSchema = z.object({
  id: z.string().optional(), // Present when editing
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  rol: z.enum(['admin', 'empleado', 'inventory_manager'], { required_error: 'Debes seleccionar un rol.' }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
})
.refine(data => {
  // If password is provided, confirmPassword must match
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"], // Set error on confirmPassword field
})
.refine(data => {
  // If it's a new user (no id) and no password provided, it's an error
  if (!data.id && !data.password) {
    return false;
  }
  return true;
}, {
  message: "La contraseña es obligatoria para nuevos usuarios.",
  path: ["password"],
});

// Schema for Supplier creation and editing
export const SupplierClientSchema = z.object({
  id: z.string().optional(), // Present when editing
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }).optional().or(z.literal('')),
  contacto: z.string().optional().or(z.literal('')),
  productos_suministrados_string: z.string().optional().describe('Lista de productos separados por comas.'),
});

// Schema for Customer creation and editing
export const CustomerClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "El nombre del cliente es obligatorio (mín. 2 caracteres)." }),
  email: z.string().email({ message: "Introduce un email válido." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  ruc: z.string().optional().or(z.literal('')),
});

// Client-side Zod schema for SaleItem in the form
export const SaleItemClientFormSchema = z.object({
  inventoryItemId: z.string().min(1, "ID de artículo de inventario es requerido."),
  productCode: z.string(),
  productName: z.string(),
  unitName: z.string(),
  unitPrice: z.number().min(0),
  quantityToSell: z.string().refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "La cantidad debe ser un número positivo."),
  availableStock: z.number().min(0),
}).refine(data => {
  const quantityToSellNum = parseFloat(data.quantityToSell);
  return quantityToSellNum <= data.availableStock;
}, {
  message: "La cantidad solicitada excede el stock disponible.",
  path: ["quantityToSell"],
});

// Client-side Zod schema for the CreateSale form
export const CreateSaleClientFormSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemClientFormSchema).min(1, "Debe añadir al menos un artículo a la venta."),
  paymentMethod: z.enum(['efectivo', 'tarjeta'], { required_error: "Debe seleccionar un método de pago." }),
});


// Schema for editing a sale (limited)
export const EditSaleClientSchema = z.object({
  saleId: z.string().min(1, "ID de venta es requerido."),
  customerId: z.string().optional(), // Can be empty for "Consumidor Final"
  paymentMethod: z.enum(['efectivo', 'tarjeta'], { required_error: "Debe seleccionar un método de pago." }),
});
