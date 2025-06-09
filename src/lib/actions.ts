
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
// import { v4 as uuidv4 } from 'uuid'; // No longer needed for sellingUnits IDs here
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
  getSalesSummaryByMonth as dbGetSalesSummaryByMonth, // For aggregation report
  getAdminCollectionData as dbGetAdminCollectionData, // For admin data explorer
} from './store';
import type { AuditLogEntry, InventoryItem, NewInventoryItemFormValues, UpdateStockFormValues, Supplier, SupplierFormValues, User, UserFormValues, LoginCredentials, EditInventoryItemFormValues, Customer, CustomerFormValues, CreateSaleFormValues, SaleItemFormValues, Sale, SaleItem, PaymentMethod, UnitType, SalesSummary, AdminCollectionDataParams, AllowedCollectionNames } from './types';
// SellingUnit type is no longer used directly in actions layer after reversion.

const NO_CUSTOMER_SELECTED_VALUE = "__NO_CUSTOMER__"; // Matches the value used in client-side Selects

// --- Audit Log Actions ---
export async function logAuditAction(
  actorUserId: string,
  actionType: string,
  details: Record<string, any> = {}
) {
  // console.log(`[logAuditAction] Called with actorUserId: ${actorUserId}, actionType: ${actionType}`);
  let actorName = 'Usuario Desconocido';
  let actorRole: User['rol'] | 'Desconocido' = 'Desconocido';

  if (ObjectId.isValid(actorUserId)) {
    try {
      const actor = await dbGetUserById(actorUserId);
      if (actor) {
        actorName = actor.nombre;
        actorRole = actor.rol;
        // console.log(`[logAuditAction] Actor details fetched: Name=${actorName}, Role=${actorRole}`);
      } else {
        // console.warn(`[logAuditAction] Actor user not found for ID: ${actorUserId}. Logging with default actor info.`);
      }
    } catch (fetchError: any) {
      // console.error(`[logAuditAction] Error fetching actor details for ID ${actorUserId}:`, fetchError.message);
      // Proceed with default actor info
    }
  } else {
    //  console.warn(`[logAuditAction] Invalid actorUserId format: ${actorUserId}. Audit log entry will use default actor info.`);
  }

  const logEntryData: Omit<AuditLogEntry, 'id'> = {
    timestamp: new Date().toISOString(),
    actorUserId,
    actorName,
    actorRole,
    actionType,
    details,
  };

  // console.log('[logAuditAction] Attempting to log audit entry:', JSON.stringify(logEntryData, null, 2));
  try {
    await addAuditLogInternal(logEntryData);
  } catch (error: any) {
    // console.error('[logAuditAction] Failed to create audit log entry via addAuditLogInternal:', error.message);
  }
}

export async function fetchAuditLogsAction(): Promise<{ success: boolean; logs?: AuditLogEntry[]; error?: string }> {
  try {
    const logs = await dbGetAuditLogs();
    return { success: true, logs };
  } catch (error: any) {
    console.error("Error fetching audit logs (action layer):", error.message);
    return { success: false, error: "No se pudo cargar la bitácora debido a un error interno del servidor." };
  }
}


// --- Inventory Schemas and Actions ---

// SellingUnitServerSchema is removed

const NewInventoryItemServerSchema = z.object({
  categoryCodePrefix: z.string().length(2, "El código de categoría debe tener 2 dígitos."),
  shelfCodePrefix: z.string().length(2, "El código de estante debe tener 2 caracteres.").regex(/^[a-zA-Z0-9]{2}$/, "El código de estante debe ser alfanumérico de 2 caracteres."),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  quantity: z.coerce.number().min(0, "La cantidad debe ser un número no negativo."),
  unitPrice: z.coerce.number().min(0, "El precio unitario debe ser un número no negativo."),
  stockMinimo: z.coerce.number().int().min(0, "Las existencias mínimas deben ser un entero no negativo."),
  dailySales: z.coerce.number().min(0, "Las ventas diarias deben ser un número no negativo."),
  supplier: z.string().optional().transform(val => val === '' ? undefined : val),
  unitType: z.enum(['countable', 'measurable']),
  unitName: z.string().min(1, "El nombre de la unidad es obligatorio."),
});

const EditInventoryItemServerSchema = z.object({
  id: z.string().min(1), // ID of the inventory item itself
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  unitPrice: z.coerce.number().min(0, "El precio unitario debe ser un número no negativo."),
  stockMinimo: z.coerce.number().int().min(0, "Las existencias mínimas deben ser un entero no negativo."),
  dailySales: z.coerce.number().min(0, "Las ventas diarias deben ser un número no negativo."),
  category: z.string().optional().transform(val => val === '' ? undefined : val),
  supplier: z.string().optional().transform(val => val === '' ? undefined : val),
  unitType: z.enum(['countable', 'measurable']),
  unitName: z.string().min(1, "El nombre de la unidad es obligatorio."),
});

const CODE_REGEX_FOR_UPDATE_SERVER = /^\d{2}-[a-zA-Z0-9]{2}-\d{5}$/;
const CODE_ERROR_MESSAGE_FOR_UPDATE_SERVER = "El código debe tener el formato CC-SS-NNNNN (ej: 01-A1-00001)";

const UpdateStockServerSchema = z.object({
  code: z.string().regex(CODE_REGEX_FOR_UPDATE_SERVER, CODE_ERROR_MESSAGE_FOR_UPDATE_SERVER).min(1, "El código del artículo es requerido."),
  quantityToAdd: z.coerce.number().gt(0, "La cantidad a añadir debe ser un número positivo."),
});

export async function fetchInventoryItems(
  sortField?: keyof InventoryItem,
  sortOrder?: 'asc' | 'desc',
  filterQuery?: string
): Promise<InventoryItem[]> {
  return dbGetInventory(sortField, sortOrder, filterQuery);
}

export async function fetchInventoryItemsForSaleAction(): Promise<InventoryItem[]> {
  const items = await dbGetInventory('name', 'asc');
  return items;
}

export async function addNewInventoryItemAction(
  formData: NewInventoryItemFormValues, // Reverted to NewInventoryItemFormValues
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
        unitName: result.item.unitName,
        unitPrice: result.item.unitPrice,
        stockMinimo: result.item.stockMinimo,
        dailySales: result.item.dailySales,
      });
      return { success: true, item: result.item };
    }
    return { success: false, error: "Error desconocido al añadir el artículo." };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al añadir el artículo al inventario." };
  }
}

export async function updateInventoryItemDetailsAction(
  itemId: string,
  formData: EditInventoryItemFormValues, // Reverted to EditInventoryItemFormValues
  actorUserId: string
) {
  const validatedFields = EditInventoryItemServerSchema.safeParse(formData); 

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para editar el artículo.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { id, ...itemDetailsToUpdate } = validatedFields.data;

  try {
    const originalItem = await dbGetInventoryItemById(itemId);
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
        changes: itemDetailsToUpdate,
        originalName: originalItem.name,
        originalUnitPrice: originalItem.unitPrice,
        originalStockMinimo: originalItem.stockMinimo,
        originalUnitName: originalItem.unitName,
      });
      return { success: true, item: updatedItem };
    } else {
      return { success: false, error: "Artículo no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
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
    const originalItem = await dbGetInventory().then(items => items.find(i => i.code === code));
    const updatedItem = await dbIncreaseItemQuantityByCode(code, quantityToAdd);
    if (updatedItem && originalItem) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'INCREASE_STOCK', {
        itemCode: updatedItem.code,
        itemName: updatedItem.name,
        quantityAdded: quantityToAdd,
        newQuantity: updatedItem.quantity,
        originalQuantity: originalItem.quantity,
        unitName: updatedItem.unitName,
      });
      return { success: true, item: updatedItem };
    } else if (!updatedItem) { 
        return {
            success: false,
            error: `No se encontró ningún artículo con el código "${code}".`,
            fieldErrors: { code: [`No se encontró ningún artículo con el código "${code}".`] }
        };
    } else { 
        return { success: false, error: "Error al actualizar el stock, o artículo original no encontrado." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al incrementar el stock." };
  }
}

export async function deleteInventoryItemAction(
    itemId: string,
    itemName: string,
    itemCode: string,
    actorUserId: string
) {
  try {
    const deleted = await dbDeleteInventoryItem(itemId);
    if (deleted) {
      revalidatePath('/inventory');
      await logAuditAction(actorUserId, 'DELETE_ITEM', { itemId, itemName, itemCode });
      return { success: true };
    } else {
      return { success: false, error: "Artículo no encontrado o no se pudo eliminar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el artículo del inventario." };
  }
}

// --- Supplier Schemas and Actions ---
const SupplierServerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  telefono: z.string().optional().transform(val => val === '' ? undefined : val),
  email: z.string().email("Introduce un email válido.").optional().transform(val => val === '' ? undefined : val),
  contacto: z.string().optional().transform(val => val === '' ? undefined : val),
  productos_suministrados_string: z.string().optional(),
});


export async function fetchSuppliersAction(): Promise<Supplier[]> {
  return dbGetSuppliers();
}

export async function addNewSupplierAction(
  formData: Omit<SupplierFormValues, 'id'>,
  actorUserId: string
) {
  const validatedFields = SupplierServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { productos_suministrados_string, ...restOfData } = validatedFields.data;
  const productos_suministrados_array = productos_suministrados_string
    ? productos_suministrados_string.split(',').map(p => p.trim()).filter(p => p !== '')
    : [];

  const supplierDataForDb = {
    ...restOfData,
    productos_suministrados: productos_suministrados_array,
  };

  try {
    const newSupplier = await dbAddSupplier(supplierDataForDb);
    revalidatePath('/suppliers');
    await logAuditAction(actorUserId, 'CREATE_SUPPLIER', { supplierId: newSupplier.id, supplierName: newSupplier.name });
    return { success: true, supplier: newSupplier };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al añadir el proveedor." };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  formData: Omit<SupplierFormValues, 'id'>,
  actorUserId: string
) {
  const validatedFields = SupplierServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para editar proveedor",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { productos_suministrados_string, ...restOfData } = validatedFields.data;
  const productos_suministrados_array = productos_suministrados_string
    ? productos_suministrados_string.split(',').map(p => p.trim()).filter(p => p !== '')
    : [];

  const supplierDataForDb = {
    ...restOfData,
    productos_suministrados: productos_suministrados_array,
  };

  try {
    const updatedSupplier = await dbUpdateSupplier(supplierId, supplierDataForDb);
    if (updatedSupplier) {
      revalidatePath('/suppliers');
      await logAuditAction(actorUserId, 'UPDATE_SUPPLIER', { supplierId: updatedSupplier.id, supplierName: updatedSupplier.name, changes: formData });
      return { success: true, supplier: updatedSupplier };
    } else {
      return { success: false, error: "Proveedor no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el proveedor." };
  }
}

export async function deleteSupplierAction(
    supplierId: string,
    supplierName: string,
    actorUserId: string
) {
  try {
    const deleted = await dbDeleteSupplier(supplierId);
    if (deleted) {
      revalidatePath('/suppliers');
      await logAuditAction(actorUserId, 'DELETE_SUPPLIER', { supplierId, supplierName });
      return { success: true };
    } else {
      return { success: false, error: "Proveedor no encontrado o no se pudo eliminar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el proveedor." };
  }
}


// --- User Schemas and Actions ---
const UserActionPayloadSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Introduce un email válido."),
  rol: z.enum(['admin', 'empleado', 'inventory_manager']),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const AddUserServerSchema = UserActionPayloadSchema
  .refine(data => {
    if (!data.password || data.password.length < 6) {
      return false;
    }
    return true;
  }, {
    message: "La contraseña es obligatoria y debe tener al menos 6 caracteres.",
    path: ["password"],
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

const UpdateUserServerSchema = UserActionPayloadSchema
  .refine(data => {
    if (data.password && data.password.length > 0 && data.password.length < 6) {
      return false;
    }
    return true;
  }, {
    message: "Si se proporciona una nueva contraseña, debe tener al menos 6 caracteres.",
    path: ["password"],
  })
  .refine(data => {
    if (data.password) {
      return data.password === data.confirmPassword;
    }
    return true; 
  }, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });


export async function fetchUsersAction(): Promise<Omit<User, 'password'>[]> {
  return dbGetUsers();
}

export async function addNewUserAction(
  formData: UserFormValues,
  actorUserId: string
) {
  const { id, ...userDataToValidate } = formData; 
  
  const validatedFields = AddUserServerSchema.safeParse(userDataToValidate);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para nuevo usuario",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { password, confirmPassword, ...restOfData } = validatedFields.data;
  
  const userDataForDb = { ...restOfData, password: password! }; 

  try {
    const result = await dbAddUser(userDataForDb);
    if (result.user) {
      revalidatePath('/users');
      await logAuditAction(actorUserId, 'CREATE_USER', { userId: result.user.id, userName: result.user.nombre, userRole: result.user.rol });
      return { success: true, user: result.user };
    } else {
      return { success: false, error: result.error || "Error desconocido al añadir usuario." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al añadir el usuario." };
  }
}

export async function updateUserAction(
  userIdToUpdate: string,
  formData: UserFormValues,
  actorUserId: string
) {
  const { id, ...userDataToValidate } = formData; 

  const validatedFields = UpdateUserServerSchema.safeParse(userDataToValidate);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para editar usuario",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { password, confirmPassword, ...restOfData } = validatedFields.data;
  const dataForDb: Partial<Omit<User, 'id' | 'lastUpdated'>> & { password?: string } = { ...restOfData };
  
  if (password && password.length > 0) {
    dataForDb.password = password; 
  }
  
  try {
    const originalUser = await dbGetUserById(userIdToUpdate);
    if (!originalUser) {
        return { success: false, error: "Usuario original no encontrado para la bitácora." };
    }

    const updatedUser = await dbUpdateUser(userIdToUpdate, dataForDb);
    if (updatedUser) {
      revalidatePath('/users');
      await logAuditAction(actorUserId, 'UPDATE_USER', { 
          userId: updatedUser.id, 
          userName: updatedUser.nombre, 
          originalName: originalUser.nombre,
          originalRole: originalUser.rol,
          changes: {
              nombre: updatedUser.nombre,
              email: updatedUser.email,
              rol: updatedUser.rol,
              passwordChanged: !!dataForDb.password
          }
      });
      return { success: true, user: updatedUser };
    } else {
      return { success: false, error: "Usuario no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el usuario." };
  }
}

export async function deleteUserAction(
    userIdToDelete: string,
    userName: string,
    actorUserId: string
) {
  if (userIdToDelete === actorUserId) {
    return { success: false, error: "No puedes eliminar tu propia cuenta." };
  }

  try {
    const deleted = await dbDeleteUser(userIdToDelete);
    if (deleted) {
      revalidatePath('/users');
      await logAuditAction(actorUserId, 'DELETE_USER', { userId: userIdToDelete, userName });
      return { success: true };
    } else {
      return { success: false, error: "Usuario no encontrado o no se pudo eliminar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el usuario." };
  }
}

export async function loginUserAction(credentials: LoginCredentials) {
  if (!credentials.nombre || !credentials.password) {
    return { success: false, error: 'Nombre de usuario y contraseña son requeridos.' };
  }

  try {
    const user = await dbAuthenticateUser(credentials);
    if (user) {
      await logAuditAction(user.id, 'USER_LOGIN_SUCCESS', { userName: user.nombre });
      return { success: true, user };
    } else {
      return { success: false, error: 'Nombre de usuario o contraseña incorrectos.' };
    }
  } catch (error: any) {
    return { success: false, error: 'Ocurrió un error en el servidor. Inténtalo más tarde.' };
  }
}

// --- Customer Schemas and Actions ---
const CustomerServerSchema = z.object({
  name: z.string().min(2, "El nombre del cliente es obligatorio (mín. 2 caracteres)."),
  email: z.string().email("Introduce un email válido.").optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  phone: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  address: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  ruc: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

export async function fetchCustomersAction(): Promise<Customer[]> {
  return dbGetCustomers();
}

export async function addNewCustomerAction(
  formData: Omit<CustomerFormValues, 'id'>,
  actorUserId: string
) {
  const validatedFields = CustomerServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para nuevo cliente.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  try {
    const newCustomer = await dbAddCustomer(validatedFields.data);
    revalidatePath('/customers');
    await logAuditAction(actorUserId, 'CREATE_CUSTOMER', { customerId: newCustomer.id, customerName: newCustomer.name });
    return { success: true, customer: newCustomer };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al añadir el cliente." };
  }
}

export async function updateCustomerAction(
  customerId: string,
  formData: Omit<CustomerFormValues, 'id'>,
  actorUserId: string
) {
  const validatedFields = CustomerServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Falló la validación del servidor para editar cliente.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  try {
    const originalCustomer = await dbGetCustomers().then(c => c.find(cust => cust.id === customerId));

    const updatedCustomer = await dbUpdateCustomer(customerId, validatedFields.data);
    if (updatedCustomer) {
      revalidatePath('/customers');
       await logAuditAction(actorUserId, 'UPDATE_CUSTOMER', { 
          customerId: updatedCustomer.id, 
          customerName: updatedCustomer.name,
          originalName: originalCustomer?.name, 
          changes: formData 
      });
      return { success: true, customer: updatedCustomer };
    } else {
      return { success: false, error: "Cliente no encontrado o no se pudo actualizar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el cliente." };
  }
}

export async function deleteCustomerAction(
  customerId: string,
  customerName: string,
  actorUserId: string
) {
  try {
    const deleted = await dbDeleteCustomer(customerId);
    if (deleted) {
      revalidatePath('/customers');
      await logAuditAction(actorUserId, 'DELETE_CUSTOMER', { customerId, customerName });
      return { success: true };
    } else {
      return { success: false, error: "Cliente no encontrado o no se pudo eliminar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el cliente." };
  }
}

// --- Sale Schemas and Actions ---
const SaleItemServerFormSchema = z.object({ 
  inventoryItemId: z.string().min(1, "ID de artículo de inventario es requerido."),
  productCode: z.string(),
  productName: z.string(),
  unitName: z.string(), 
  unitPrice: z.number().min(0), 
  quantityToSell: z.string().refine(val => parseFloat(val) > 0, "La cantidad debe ser un número positivo."),
  availableStock: z.number().min(0), 
});

const CreateSaleServerFormSchema = z.object({ 
  customerId: z.string().optional(),
  items: z.array(SaleItemServerFormSchema).min(1, "Debe añadir al menos un artículo a la venta."),
  paymentMethod: z.enum(['efectivo', 'tarjeta']),
});

export async function createSaleAction(
  actorUserId: string,
  formData: CreateSaleFormValues 
): Promise<{ success: boolean; sale?: Sale; error?: string; stockError?: string; fieldErrors?: any }> {
  
  const validatedFields = CreateSaleServerFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    
    let specificError = "Falló la validación de la venta en el servidor.";
    if (fieldErrors?.items && typeof fieldErrors.items === 'string') {
        specificError = fieldErrors.items;
    } else if (Array.isArray(fieldErrors?.items)) {
        const itemError = fieldErrors.items.find((err: any) => err && err.quantityToSell);
        if (itemError?.quantityToSell) specificError = `Error en cantidad: ${itemError.quantityToSell._errors.join(', ')}`;
    }
    return { success: false, error: specificError, fieldErrors: fieldErrors };
  }

  const { customerId, items: formItems, paymentMethod } = validatedFields.data;

  let customerName: string | undefined;
  if (customerId && customerId !== NO_CUSTOMER_SELECTED_VALUE) {
    const customer = await dbGetCustomers().then(customers => customers.find(c => c.id === customerId));
    customerName = customer?.name;
  }
  
  const saleItemsToSave: SaleItem[] = formItems.map(item => {
    const quantityNum = parseFloat(item.quantityToSell);
    return {
      productId: item.inventoryItemId,
      productCode: item.productCode,
      productName: item.productName,
      quantitySold: quantityNum,
      unitNameAtSale: item.unitName, 
      priceAtSale: item.unitPrice, 
      subtotal: quantityNum * item.unitPrice,
  }});

  const totalAmount = saleItemsToSave.reduce((sum, item) => sum + item.subtotal, 0);

  const saleDataForDb = {
    date: new Date().toISOString(),
    customerId: customerId === NO_CUSTOMER_SELECTED_VALUE ? undefined : customerId,
    customerName,
    items: saleItemsToSave,
    totalAmount,
    paymentMethod,
    userId: actorUserId,
  };

  try {
    const result = await dbAddSale(saleDataForDb); 
    if (result.sale) {
      revalidatePath('/sales');
      revalidatePath('/inventory'); 
      await logAuditAction(actorUserId, 'CREATE_SALE', { 
        saleId: result.sale.id, 
        saleNumber: result.sale.saleNumber, 
        totalAmount: result.sale.totalAmount,
        itemCount: result.sale.items.length
      });
      return { success: true, sale: result.sale };
    } else if (result.stockError) {
      return { success: false, stockError: result.stockError };
    } else {
      const errorMessage = result.error || "Error desconocido del servidor al intentar crear la venta.";
      return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    const message = error.message || "Se produjo un error interno del servidor al crear la venta.";
    return { success: false, error: message };
  }
}

export async function fetchSalesAction(): Promise<Sale[]> {
  return dbGetSales();
}

export async function fetchSaleByIdAction(saleId: string): Promise<Sale | null> {
  return dbGetSaleById(saleId);
}

export async function deleteSaleAction(
  saleId: string,
  saleNumber: string,
  actorUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await dbDeleteSaleAndRestoreStock(saleId); 
    if (result.success) {
      revalidatePath('/sales');
      revalidatePath('/inventory'); 
      await logAuditAction(actorUserId, 'DELETE_SALE', { saleId, saleNumber });
      return { success: true };
    } else {
      return { success: false, error: result.error || "No se pudo eliminar la venta o restaurar el stock." };
    }
  } catch (error: any) {
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
  actorUserId: string
): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  const validatedFields = EditSaleServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: "Falló la validación del servidor para editar venta." };
  }

  const { saleId, customerId, paymentMethod } = validatedFields.data;
  
  let customerName: string | undefined;
  if (customerId && customerId !== NO_CUSTOMER_SELECTED_VALUE) {
      const customer = await dbGetCustomers().then(customers => customers.find(c => c.id === customerId));
      customerName = customer?.name;
  }

  const dataToUpdate: { customerId?: string; customerName?: string; paymentMethod?: PaymentMethod } = {
    paymentMethod,
    customerId: customerId === NO_CUSTOMER_SELECTED_VALUE ? undefined : customerId,
    customerName: customerId === NO_CUSTOMER_SELECTED_VALUE ? undefined : customerName,
  };
  
  try {
    const originalSale = await dbGetSaleById(saleId);
     if (!originalSale) {
        return { success: false, error: "Venta original no encontrada para la bitácora." };
    }

    const updatedSale = await dbUpdateSaleDetails(saleId, dataToUpdate);
    if (updatedSale) {
      revalidatePath(`/sales`);
      revalidatePath(`/sales/${saleId}`);
      await logAuditAction(actorUserId, 'UPDATE_SALE', { 
          saleId: updatedSale.id, 
          saleNumber: updatedSale.saleNumber,
          originalCustomerId: originalSale.customerId,
          originalPaymentMethod: originalSale.paymentMethod,
          changes: {
              customerId: updatedSale.customerId,
              customerName: updatedSale.customerName,
              paymentMethod: updatedSale.paymentMethod
          }
      });
      return { success: true, sale: updatedSale };
    } else {
      return { success: false, error: "Venta no encontrada o no se pudo actualizar." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar la venta." };
  }
}

// --- Aggregation Actions ---
export async function fetchSalesSummaryByMonthAction(): Promise<{ success: boolean; summary?: SalesSummary[]; error?: string }> {
  try {
    const summary = await dbGetSalesSummaryByMonth();
    return { success: true, summary };
  } catch (error: any) {
    return { success: false, error: "No se pudo cargar el resumen de ventas por mes." };
  }
}

// --- Admin Data Explorer Actions ---
export async function fetchAdminCollectionDataAction(params: AdminCollectionDataParams): Promise<{ success: boolean; documents?: any[]; totalDocuments?: number; error?: string; }> {
  try {
    const { documents, totalDocuments } = await dbGetAdminCollectionData(params);
    return { success: true, documents, totalDocuments };
  } catch (error: any) {
    return { success: false, error: (error as Error).message || "Error al obtener datos de la colección." };
  }
}

