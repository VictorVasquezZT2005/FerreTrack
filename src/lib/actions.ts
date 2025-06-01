
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import {
  addInventoryItem as dbAddInventoryItem,
  getInventory as dbGetInventory,
  updateItemQuantity as dbUpdateItemQuantity,
  deleteInventoryItem as dbDeleteInventoryItem,
  increaseItemQuantityByCode as dbIncreaseItemQuantityByCode,
  updateInventoryItemDetails as dbUpdateInventoryItemDetails,
  getSuppliers as dbGetSuppliers,
  addSupplier as dbAddSupplier,
  updateSupplier as dbUpdateSupplier,
  deleteSupplier as dbDeleteSupplier,
  getUsers as dbGetUsers,
  addUser as dbAddUser,
  updateUser as dbUpdateUser,
  deleteUser as dbDeleteUser,
  authenticateUser as dbAuthenticateUser,
  getCustomers as dbGetCustomers,
  addCustomer as dbAddCustomer,
  updateCustomer as dbUpdateCustomer,
  deleteCustomer as dbDeleteCustomer,
  addSale as dbAddSale,
  getInventoryItemById as dbGetInventoryItemById,
  getSales as dbGetSales,
  getSaleById as dbGetSaleById,
  getUserById as dbGetUserById,
  deleteSaleAndRestoreStock as dbDeleteSaleAndRestoreStock,
  updateSaleDetails as dbUpdateSaleDetails,
  addAuditLogInternal, // For internal use by logAuditAction
  getAuditLogs as dbGetAuditLogs, // For fetching logs
} from './store';
import type { AuditLogEntry, InventoryItem, NewInventoryItemFormValues, UpdateStockFormValues, Supplier, SupplierFormValues, User, UserFormValues, LoginCredentials, EditInventoryItemFormValues, Customer, CustomerFormValues, CreateSaleFormValues, SaleItemFormValues, Sale, SaleItem, PaymentMethod, EditSaleFormValues } from './types';


const NO_CUSTOMER_SELECTED_VALUE = "__NO_CUSTOMER__"; // Matches the value used in client-side Selects

// --- Audit Log Actions ---
export async function logAuditAction(
  actorUserId: string,
  actionType: string,
  details: Record<string, any> = {}
) {
  let actorName = 'Usuario Desconocido';
  let actorRole: User['rol'] | 'Desconocido' = 'Desconocido';

  if (ObjectId.isValid(actorUserId)) {
    try {
      const actor = await dbGetUserById(actorUserId);
      if (actor) {
        actorName = actor.nombre;
        actorRole = actor.rol;
      } else {
        console.warn(`[logAuditAction] Actor user not found for ID: ${actorUserId}. Logging with default actor info.`);
      }
    } catch (fetchError) {
      console.error(`[logAuditAction] Error fetching actor details for ID ${actorUserId}:`, fetchError);
      // Proceed with default actor info
    }
  } else {
     console.warn(`[logAuditAction] Invalid actorUserId format: ${actorUserId}. Audit log entry will use default actor info.`);
  }

  const logEntryData: Omit<AuditLogEntry, 'id'> = {
    timestamp: new Date().toISOString(),
    actorUserId,
    actorName,
    actorRole,
    actionType,
    details,
  };

  console.log('[logAuditAction] Attempting to log audit entry:', JSON.stringify(logEntryData, null, 2));
  try {
    await addAuditLogInternal(logEntryData);
  } catch (error) {
    console.error('[logAuditAction] Failed to create audit log entry via addAuditLogInternal:', error);
    // We don't want a logging failure to break the primary action, so we just log the error here.
  }
}

export async function fetchAuditLogsAction(): Promise<{ success: boolean; logs?: AuditLogEntry[]; error?: string }> {
  try {
    const logs = await dbGetAuditLogs();
    return { success: true, logs };
  } catch (error: any) {
    console.error("Error fetching audit logs (action layer):", error);
    return { success: false, error: "No se pudo cargar la bitácora debido a un error interno del servidor." };
  }
}


// --- Inventory Schemas and Actions ---
const NewInventoryItemServerSchema = z.object({
  categoryCodePrefix: z.string().length(2, "El código de categoría debe tener 2 dígitos."),
  shelfCodePrefix: z.string().length(2, "El código de estante debe tener 2 caracteres.").regex(/^[a-zA-Z0-9]{2}$/, "El código de estante debe ser alfanumérico de 2 caracteres."),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  quantity: z.coerce.number().int().min(0, "La cantidad inicial debe ser un entero no negativo."),
  stockMinimo: z.coerce.number().int().min(0, "Las existencias mínimas deben ser un entero no negativo."),
  dailySales: z.coerce.number().min(0, "Las ventas diarias deben ser un número no negativo."),
  supplier: z.string().optional().transform(val => val === '' ? undefined : val),
  unitPrice: z.coerce.number().min(0, "El precio unitario debe ser un número no negativo.").optional().nullable().transform(val => val === null ? undefined : val),
});

const EditInventoryItemServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  stockMinimo: z.coerce.number().int().min(0, "Las existencias mínimas deben ser un entero no negativo."),
  dailySales: z.coerce.number().min(0, "Las ventas diarias deben ser un número no negativo."),
  category: z.string().optional().transform(val => val === '' ? undefined : val),
  supplier: z.string().optional().transform(val => val === '' ? undefined : val),
  unitPrice: z.coerce.number().min(0, "El precio unitario debe ser un número no negativo.").optional().nullable().transform(val => val === null ? undefined : val),
});

const CODE_REGEX_FOR_UPDATE_SERVER = /^\d{2}-[a-zA-Z0-9]{2}-\d{5}$/;
const CODE_ERROR_MESSAGE_FOR_UPDATE_SERVER = "El código debe tener el formato CC-SS-NNNNN (ej: 01-A1-00001)";

const UpdateStockServerSchema = z.object({
  code: z.string().regex(CODE_REGEX_FOR_UPDATE_SERVER, CODE_ERROR_MESSAGE_FOR_UPDATE_SERVER).min(1, "El código del artículo es requerido."),
  quantityToAdd: z.coerce.number().int().gt(0, "La cantidad a añadir debe ser un entero positivo."),
});

export async function fetchInventoryItems(
  sortField?: keyof InventoryItem,
  sortOrder?: 'asc' | 'desc',
  filterQuery?: string
): Promise<InventoryItem[]> {
  return dbGetInventory(sortField, sortOrder, filterQuery);
}

export async function fetchInventoryItemsForSaleAction(): Promise<Pick<InventoryItem, 'id' | 'name' | 'code' | 'quantity' | 'unitPrice'>[]> {
  const items = await dbGetInventory('name', 'asc');
  return items.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

export async function addNewInventoryItemAction(
  formData: Omit<NewInventoryItemFormValues, 'category'>,
  actorUserId: string
) {
  const validatedFields = NewInventoryItemServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const itemDataForDb = { ...validatedFields.data };
  
  try {
    const result = await dbAddInventoryItem(itemDataForDb);

    if (result.error) {
        if (result.error.includes("ya existe")) {
             return { success: false, error: result.error, fieldErrors: { categoryCodePrefix: ["Este código (combinación CC-SS-NNNNN) ya existe."], shelfCodePrefix: ["Este código (combinación CC-SS-NNNNN) ya existe."] }};
        }
        return { success: false, error: result.error };
    }
    if (result.item) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'CREATE_ITEM', {
        itemId: result.item.id,
        itemName: result.item.name,
        itemCode: result.item.code,
        initialQuantity: result.item.quantity,
      });
      return { success: true, item: result.item };
    }
    return { success: false, error: "Error desconocido al añadir el artículo." };
  } catch (error: any) {
    console.error("Error añadiendo artículo de inventario:", error);
    return { success: false, error: error.message || "Error al añadir el artículo al inventario." };
  }
}

export async function updateInventoryItemDetailsAction(
  itemId: string,
  formData: EditInventoryItemFormValues,
  actorUserId: string
) {
  const validatedFields = EditInventoryItemServerSchema.omit({id: true}).safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para editar el artículo.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const itemDetailsToUpdate = {
    name: validatedFields.data.name,
    stockMinimo: validatedFields.data.stockMinimo,
    dailySales: validatedFields.data.dailySales,
    category: validatedFields.data.category,
    supplier: validatedFields.data.supplier,
    unitPrice: validatedFields.data.unitPrice,
  };

  try {
    const originalItem = await dbGetInventoryItemById(itemId); // Get original for logging
    if (!originalItem) {
        return { success: false, error: "Artículo original no encontrado para la bitácora." };
    }
    const updatedItem = await dbUpdateInventoryItemDetails(itemId, itemDetailsToUpdate);
    if (updatedItem) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'UPDATE_ITEM_DETAILS', {
        itemId: updatedItem.id,
        itemName: updatedItem.name,
        itemCode: updatedItem.code,
        changes: formData, // Log what was attempted to change
        originalName: originalItem.name
      });
      return { success: true, item: updatedItem };
    } else {
      return { success: false, error: "Artículo no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    console.error("Error actualizando detalles del artículo:", error);
    return { success: false, error: error.message || "Error al actualizar los detalles del artículo." };
  }
}

export async function increaseStockByCodeAction(
  formData: UpdateStockFormValues,
  actorUserId: string
) {
  const validatedFields = UpdateStockServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { code, quantityToAdd } = validatedFields.data;

  try {
    const originalItem = await dbGetInventory().then(items => items.find(i => i.code === code)); // For logging
    const updatedItem = await dbIncreaseItemQuantityByCode(code, quantityToAdd);
    if (updatedItem) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'INCREASE_STOCK', {
        itemCode: updatedItem.code,
        itemName: updatedItem.name,
        quantityAdded: quantityToAdd,
        newQuantity: updatedItem.quantity,
        originalQuantity: originalItem?.quantity,
      });
      return { success: true, item: updatedItem };
    } else {
      return {
        success: false,
        error: `No se encontró ningún artículo con el código "${code}".`,
        fieldErrors: { code: [`No se encontró ningún artículo con el código "${code}".`] }
      };
    }
  } catch (error: any) {
    console.error("Error actualizando cantidad por código:", error);
    return { success: false, error: error.message || "Error al actualizar la cantidad del artículo." };
  }
}

export async function updateInventoryItemQuantityAction(
  itemId: string,
  newQuantity: number,
  actorUserId: string // Added for audit logging
) {
  if (typeof newQuantity !== 'number' || newQuantity < 0) {
    return { success: false, error: "Cantidad inválida." };
  }
  try {
    const originalItem = await dbGetInventoryItemById(itemId);
    const updatedItem = await dbUpdateItemQuantity(itemId, newQuantity);
    if (updatedItem && originalItem) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'UPDATE_ITEM_QUANTITY', {
        itemId: updatedItem.id,
        itemName: updatedItem.name,
        itemCode: updatedItem.code,
        newQuantity: updatedItem.quantity,
        oldQuantity: originalItem.quantity,
      });
      return { success: true, item: updatedItem };
    }
    return { success: false, error: "Artículo no encontrado o no se pudo obtener información original." };
  } catch (error: any) {
    console.error("Error actualizando cantidad:", error);
    return { success: false, error: error.message || "Error al actualizar la cantidad del artículo." };
  }
}

export async function deleteInventoryItemAction(
  itemId: string,
  itemName: string, // Added for audit logging
  itemCode: string, // Added for audit logging
  actorUserId: string // Added for audit logging
) {
  try {
    const success = await dbDeleteInventoryItem(itemId);
    if (success) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'DELETE_ITEM', {
        itemId,
        itemName,
        itemCode,
      });
      return { success: true };
    }
    return { success: false, error: "No se pudo eliminar el artículo o no fue encontrado." };
  } catch (error: any) {
    console.error("Error eliminando artículo de inventario:", error);
    return { success: false, error: error.message || "Error al eliminar el artículo del inventario." };
  }
}

// --- Supplier Schemas and Actions ---
const SupplierServerSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor debe tener al menos 2 caracteres."),
  telefono: z.string().optional().transform(val => val === '' ? undefined : val),
  email: z.string().email("Email inválido.").optional().transform(val => val === '' ? undefined : val),
  contacto: z.string().optional().transform(val => val === '' ? undefined : val),
  productos_suministrados_string: z.string().optional().transform(val => val === '' ? undefined : val),
});

export async function fetchSuppliersAction(): Promise<Supplier[]> {
  return dbGetSuppliers();
}

export async function addNewSupplierAction(
  formData: SupplierFormValues,
  actorUserId: string
) {
  const validatedFields = SupplierServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para el proveedor",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { productos_suministrados_string, ...restOfData } = validatedFields.data;
  const productos_suministrados = productos_suministrados_string
    ? productos_suministrados_string.split(',').map(s => s.trim()).filter(s => s !== '')
    : [];

  try {
    const newSupplier = await dbAddSupplier({ ...restOfData, productos_suministrados });
    revalidatePath('/suppliers');
    await logAuditAction(actorUserId, 'CREATE_SUPPLIER', {
      supplierId: newSupplier.id,
      supplierName: newSupplier.name,
    });
    return { success: true, supplier: newSupplier };
  } catch (error: any) {
    console.error("Error añadiendo proveedor:", error);
    return { success: false, error: error.message || "Error al añadir el proveedor." };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  formData: SupplierFormValues,
  actorUserId: string
) {
  const validatedFields = SupplierServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para actualizar el proveedor.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { productos_suministrados_string, ...restOfData } = validatedFields.data;
  const productos_suministrados = productos_suministrados_string
    ? productos_suministrados_string.split(',').map(s => s.trim()).filter(s => s !== '')
    : [];

  try {
    const updatedSupplier = await dbUpdateSupplier(supplierId, { ...restOfData, productos_suministrados });
    if (updatedSupplier) {
      revalidatePath('/suppliers');
      await logAuditAction(actorUserId, 'UPDATE_SUPPLIER', {
        supplierId: updatedSupplier.id,
        supplierName: updatedSupplier.name,
        changes: formData
      });
      return { success: true, supplier: updatedSupplier };
    } else {
      return { success: false, error: "Proveedor no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    console.error("Error actualizando proveedor:", error);
    return { success: false, error: error.message || "Error al actualizar el proveedor." };
  }
}

export async function deleteSupplierAction(
  supplierId: string,
  supplierName: string, // Added for audit logging
  actorUserId: string // Added for audit logging
) {
  try {
    const success = await dbDeleteSupplier(supplierId);
    if (success) {
      revalidatePath('/suppliers');
      await logAuditAction(actorUserId, 'DELETE_SUPPLIER', {
        supplierId,
        supplierName,
      });
      return { success: true };
    }
    return { success: false, error: "No se pudo eliminar el proveedor o no fue encontrado." };
  } catch (error: any) {
    console.error("Error eliminando proveedor:", error);
    return { success: false, error: error.message || "Error al eliminar el proveedor." };
  }
}

// --- User Schemas and Actions ---
const UserServerSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Email de usuario inválido."),
  rol: z.enum(['admin', 'empleado', 'inventory_manager'], { required_error: 'Debes seleccionar un rol.' }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(),
});

export async function fetchUsersAction(): Promise<Omit<User, 'password'>[]> {
  return dbGetUsers();
}

export async function addNewUserAction(
  formData: UserFormValues,
  actorUserId: string
) {
  const AddUserServerSchema = UserServerSchema.extend({
    password: z.string().min(6, "La contraseña es obligatoria y debe tener al menos 6 caracteres."),
  }).omit({id: true});

  const validatedFields = AddUserServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para el usuario",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const dataToSave: Omit<User, 'id' | 'lastUpdated'> = {
        nombre: validatedFields.data.nombre,
        email: validatedFields.data.email,
        rol: validatedFields.data.rol,
        password: validatedFields.data.password!,
    };
    const result = await dbAddUser(dataToSave);
    if (result.error) {
        return { success: false, error: result.error };
    }
    if (result.user) {
        revalidatePath('/users');
        await logAuditAction(actorUserId, 'CREATE_USER', {
          createdUserId: result.user.id,
          createdUserName: result.user.nombre,
          createdUserEmail: result.user.email,
          createdUserRole: result.user.rol,
        });
        return { success: true, user: result.user };
    }
    return { success: false, error: "Error desconocido al añadir el usuario." };

  } catch (error: any) {
    console.error("Error añadiendo usuario:", error);
    if (error.message === "El nombre de usuario o email ya está en uso.") {
        return { success: false, error: error.message };
    }
    return { success: false, error: "Error al añadir el usuario." };
  }
}

export async function updateUserAction(
  userIdToUpdate: string,
  formData: UserFormValues,
  actorUserId: string
) {
  const EditUserServerSchema = UserServerSchema.omit({id: true});
  const validatedFields = EditUserServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para actualizar el usuario",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { password, ...dataToUpdate } = validatedFields.data;
  const updatePayload: Partial<Omit<User, 'id' | 'lastUpdated' | 'password'>> & { password?: string } = dataToUpdate;

  if (password && password.trim() !== '') {
    updatePayload.password = password;
  }

  try {
    const updatedUser = await dbUpdateUser(userIdToUpdate, updatePayload);
    if (updatedUser) {
      revalidatePath('/users');
      await logAuditAction(actorUserId, 'UPDATE_USER', {
        updatedUserId: updatedUser.id,
        updatedUserName: updatedUser.nombre,
        changes: { email: updatedUser.email, rol: updatedUser.rol, passwordChanged: !!updatePayload.password }
      });
      return { success: true, user: updatedUser };
    } else {
      return { success: false, error: "Usuario no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    console.error("Error actualizando usuario:", error);
     if (error.message === "El nombre de usuario o email ya está en uso por otro usuario.") {
        return { success: false, error: error.message };
    }
    return { success: false, error: error.message || "Error al actualizar el usuario." };
  }
}

export async function deleteUserAction(
  userIdToDelete: string,
  userNameToDelete: string, // Added for audit logging
  actorUserId: string // Added for audit logging
) {
  try {
    const success = await dbDeleteUser(userIdToDelete);
    if (success) {
      revalidatePath('/users');
      await logAuditAction(actorUserId, 'DELETE_USER', {
        deletedUserId: userIdToDelete,
        deletedUserName: userNameToDelete,
      });
      return { success: true };
    }
    return { success: false, error: "No se pudo eliminar el usuario o no fue encontrado." };
  } catch (error: any) {
    console.error("Error eliminando usuario:", error);
    return { success: false, error: error.message || "Error al eliminar el usuario." };
  }
}

// --- Auth Actions ---
const LoginCredentialsSchema = z.object({
  nombre: z.string().min(1, "Por favor, introduce tu nombre de usuario."),
  password: z.string().min(1, "La contraseña no puede estar vacía."),
});

export async function loginUserAction(credentials: LoginCredentials): Promise<{ success: boolean; user?: Omit<User, 'password'>; error?: string; fieldErrors?: z.ZodFormattedError<LoginCredentials, string>["_errors"] | Record<string, string[]> }> {
  const validatedFields = LoginCredentialsSchema.safeParse(credentials);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación de credenciales.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await dbAuthenticateUser(validatedFields.data);
    if (user) {
      await logAuditAction(user.id, 'USER_LOGIN_SUCCESS', { username: user.nombre });
      return { success: true, user };
    } else {
      // Cannot log actor if login fails and we don't know who it is
      console.warn(`Login attempt failed for username: ${credentials.nombre}`);
      return { success: false, error: "Nombre de usuario o contraseña incorrectos. Por favor, inténtalo de nuevo." };
    }
  } catch (error: any) {
    const errorMessage = String(error.message || '');
     if (errorMessage.includes('querySrv ENOTFOUND') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('SSL routines') || 
        errorMessage.includes('tls') ||
        errorMessage.includes('certificate') ||
        errorMessage.includes('AuthenticationFailed') 
       ) {
        console.error('[loginUserAction] Error de Conexión/Autenticación con MongoDB Atlas:', errorMessage);
        return {
            success: false,
            error: `Error de Conexión/Autenticación con la Base de Datos. Por favor, verifica tu MONGODB_URI en .env.local y la configuración de "Network Access" en Atlas. (Detalle: ${errorMessage})`
        };
    }
    console.error("[loginUserAction] Error de Inicio de Sesión (no relacionado con conexión/autenticación de URI):", errorMessage);
    return {
        success: false,
        error: `Error de Inicio de Sesión. (Detalle: ${errorMessage || 'Error desconocido. Revisa la consola del servidor.'})`
    };
  }
}

// --- Customer Actions ---
const CustomerServerSchema = z.object({
  name: z.string().min(2, "El nombre del cliente es obligatorio."),
  email: z.string().email("Email inválido.").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  ruc: z.string().optional().or(z.literal('')),
});

export async function fetchCustomersAction(): Promise<Customer[]> {
  return dbGetCustomers();
}

export async function addNewCustomerAction(
  formData: CustomerFormValues,
  actorUserId: string
) {
  const validatedFields = CustomerServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación para el cliente.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  try {
    const newCustomer = await dbAddCustomer(validatedFields.data);
    revalidatePath('/customers');
    await logAuditAction(actorUserId, 'CREATE_CUSTOMER', {
      customerId: newCustomer.id,
      customerName: newCustomer.name,
    });
    return { success: true, customer: newCustomer };
  } catch (error: any) {
    console.error("Error añadiendo cliente:", error);
    return { success: false, error: error.message || "Error al añadir el cliente." };
  }
}

export async function updateCustomerAction(
  customerId: string,
  formData: CustomerFormValues,
  actorUserId: string
) {
  const validatedFields = CustomerServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación para actualizar el cliente.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  try {
    const updatedCustomer = await dbUpdateCustomer(customerId, validatedFields.data);
    if (updatedCustomer) {
      revalidatePath('/customers');
      await logAuditAction(actorUserId, 'UPDATE_CUSTOMER', {
        customerId: updatedCustomer.id,
        customerName: updatedCustomer.name,
        changes: formData
      });
      return { success: true, customer: updatedCustomer };
    }
    return { success: false, error: "Cliente no encontrado o no se pudo actualizar." };
  } catch (error: any) {
    console.error("Error actualizando cliente:", error);
    return { success: false, error: error.message || "Error al actualizar el cliente." };
  }
}

export async function deleteCustomerAction(
  customerId: string,
  customerName: string, // Added for audit logging
  actorUserId: string // Added for audit logging
) {
  try {
    const success = await dbDeleteCustomer(customerId);
    if (success) {
      revalidatePath('/customers');
      await logAuditAction(actorUserId, 'DELETE_CUSTOMER', {
        customerId,
        customerName,
      });
      return { success: true };
    }
    return { success: false, error: "No se pudo eliminar el cliente o no fue encontrado." };
  } catch (error: any) {
    console.error("Error eliminando cliente:", error);
    return { success: false, error: error.message || "Error al eliminar el cliente." };
  }
}

// --- Sales Actions ---
const SaleItemServerSchema = z.object({
  productId: z.string().min(1, "ID de producto es requerido."),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().int().gt(0, "La cantidad debe ser un entero positivo."),
  unitPriceAtSale: z.coerce.number().min(0, "El precio unitario debe ser no negativo."),
});

const CreateSaleServerSchema = z.object({
  customerId: z.string().optional().transform(val => val === '' ? undefined : val),
  items: z.array(SaleItemServerSchema).min(1, "La venta debe tener al menos un artículo."),
  paymentMethod: z.enum(['efectivo', 'tarjeta'], { required_error: "Debe seleccionar un método de pago." }),
});

export async function createSaleAction(
  actorUserId: string, // Renamed from userId for consistency
  formData: CreateSaleFormValues
): Promise<{ success: boolean; sale?: Sale; error?: string; stockError?: string, fieldErrors?: any }> {
  const validatedFields = CreateSaleServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación de la venta en el servidor.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { customerId: formCustomerId, items: formItems, paymentMethod } = validatedFields.data;

  let customerName: string | undefined;
  let actualCustomerId: string | undefined = formCustomerId;

  if (formCustomerId && formCustomerId !== NO_CUSTOMER_SELECTED_VALUE) {
    const customers = await dbGetCustomers(); 
    const customer = customers.find(c => c.id === formCustomerId);
    customerName = customer?.name;
  } else {
    actualCustomerId = undefined; 
    customerName = undefined; // Or "Consumidor Final" if you want to log that explicitly
  }


  const saleItems: SaleItem[] = formItems.map(item => ({
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceAtSale: item.unitPriceAtSale,
    subtotal: item.quantity * item.unitPriceAtSale,
  }));

  const totalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);

  const saleDataToSave: Omit<Sale, 'id' | 'saleNumber' | 'lastUpdated' | 'sellerName'> & { userId: string } = {
    date: new Date().toISOString(),
    customerId: actualCustomerId,
    customerName, // This will be undefined if it's a "Consumidor Final"
    items: saleItems,
    totalAmount,
    paymentMethod,
    userId: actorUserId, // Use actorUserId here
  };

  try {
    const result = await dbAddSale(saleDataToSave);
    if (result.sale) {
      revalidatePath('/inventory');
      revalidatePath('/sales');
      revalidatePath(`/sales/${result.sale.id}`);
      await logAuditAction(actorUserId, 'CREATE_SALE', {
        saleId: result.sale.id,
        saleNumber: result.sale.saleNumber,
        totalAmount: result.sale.totalAmount,
        itemCount: result.sale.items.length,
        paymentMethod: result.sale.paymentMethod,
        customerId: result.sale.customerId,
        customerName: result.sale.customerName
      });
      return { success: true, sale: result.sale };
    } else if (result.stockError) {
      return { success: false, stockError: result.stockError };
    } else {
      return { success: false, error: result.error || "Error desconocido al crear la venta." };
    }
  } catch (error: any) {
    console.error("Error creando la venta:", error);
    return { success: false, error: error.message || "Error al crear la venta." };
  }
}

export async function fetchSalesAction(): Promise<Sale[]> {
  return dbGetSales();
}

export async function fetchSaleByIdAction(saleId: string): Promise<Sale | null> {
  const sale = await dbGetSaleById(saleId);
  if (sale && !sale.sellerName && sale.userId) {
    try {
      const user = await dbGetUserById(sale.userId); 
      if (user) {
        sale.sellerName = user.nombre;
      }
    } catch (error) {
      console.error(`Error fetching seller name for sale ${saleId}:`, error);
    }
  }
  return sale;
}

export async function deleteSaleAction(
  saleId: string,
  saleNumber: string, // Added for audit logging
  actorUserId: string // Added for audit logging
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await dbDeleteSaleAndRestoreStock(saleId);
    if (result.success) {
      revalidatePath('/sales');
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'DELETE_SALE', {
        saleId,
        saleNumber,
        stockRestored: true,
      });
      return { success: true };
    }
    return { success: false, error: result.error || "No se pudo eliminar la venta." };
  } catch (error: any) {
    console.error("Error eliminando la venta:", error);
    return { success: false, error: error.message || "Error al eliminar la venta." };
  }
}


const EditSaleServerSchema = z.object({
  saleId: z.string().min(1),
  customerId: z.string().optional(),
  paymentMethod: z.enum(['efectivo', 'tarjeta']),
});

export async function updateSaleAction(
  formData: EditSaleFormValues,
  actorUserId: string // Added for audit logging
): Promise<{ success: boolean; sale?: Sale; error?: string; fieldErrors?: any }> {
  const validatedFields = EditSaleServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación para editar la venta.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { saleId, customerId: formCustomerId, paymentMethod } = validatedFields.data;

  let customerName: string | undefined;
  let actualCustomerId: string | undefined = formCustomerId;

  if (formCustomerId && formCustomerId !== NO_CUSTOMER_SELECTED_VALUE) {
     const customers = await dbGetCustomers();
     const customer = customers.find(c => c.id === formCustomerId);
     customerName = customer?.name;
  } else {
     actualCustomerId = undefined; 
     customerName = undefined; // Or "Consumidor Final"
  }

  try {
    const originalSale = await dbGetSaleById(saleId); // For logging changes
    const updatedSale = await dbUpdateSaleDetails(saleId, {
      customerId: actualCustomerId,
      customerName: customerName,
      paymentMethod: paymentMethod,
    });

    if (updatedSale && originalSale) {
      revalidatePath('/sales');
      revalidatePath(`/sales/${saleId}`);
      await logAuditAction(actorUserId, 'UPDATE_SALE_DETAILS', {
        saleId: updatedSale.id,
        saleNumber: updatedSale.saleNumber,
        changes: {
            customerId: updatedSale.customerId,
            customerName: updatedSale.customerName,
            paymentMethod: updatedSale.paymentMethod
        },
        originalCustomerId: originalSale.customerId,
        originalCustomerName: originalSale.customerName,
        originalPaymentMethod: originalSale.paymentMethod
      });
      return { success: true, sale: updatedSale };
    } else {
      return { success: false, error: "Venta no encontrada o no se pudo actualizar." };
    }
  } catch (error: any) {
    console.error("Error actualizando la venta:", error);
    return { success: false, error: error.message || "Error al actualizar la venta." };
  }
}
