
import { MongoClient, ObjectId, type Collection, type Db, ServerApiVersion } from 'mongodb';
import { getDb } from './mongodb';
import type { AuditLogEntry, InventoryItem, NewInventoryItemFormValues, UpdateStockFormValues, Supplier, User, LoginCredentials, EditInventoryItemFormValues, Customer, CustomerFormValues, Sale, SaleItem, PaymentMethod, UnitType } from './types';
// SellingUnit type is no longer used here after reversion.
import { getCategoryNameByCodePrefix } from '@/lib/category-mapping';
// import { v4 as uuidv4 } from 'uuid'; // No longer needed here

// Define collection names
const INVENTORY_COLLECTION = 'inventoryItems';
const SUPPLIERS_COLLECTION = 'suppliers';
const USERS_COLLECTION = 'users';
const CUSTOMERS_COLLECTION = 'customers';
const SALES_COLLECTION = 'sales'; 
const AUDIT_LOG_COLLECTION = 'auditLogs'; 

// Helper function to convert MongoDB document to application type
function mapMongoId<T extends { _id?: ObjectId }>(doc: T): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id!.toString() };
}

// --- Audit Log Store Functions ---
export async function addAuditLogInternal(logEntry: Omit<AuditLogEntry, 'id'>): Promise<void> {
  const db = await getDb();
  const collection = db.collection(AUDIT_LOG_COLLECTION);
  try {
    const result = await collection.insertOne(logEntry as any);
    if (result.insertedId) {
      console.log(`[Audit Log Store] Entry added successfully for action: ${logEntry.actionType} by ${logEntry.actorName}. DB ID: ${result.insertedId}`);
    } else {
      console.warn(`[Audit Log Store] Entry for action ${logEntry.actionType} by ${logEntry.actorName} did NOT get an insertedId from MongoDB.`);
    }
  } catch (error) {
    console.error(`[Audit Log Store] Failed to add entry to database for action ${logEntry.actionType} by ${logEntry.actorName}:`, error);
  }
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const db = await getDb();
  const collection = db.collection<Omit<AuditLogEntry, 'id'>>(AUDIT_LOG_COLLECTION);
  const logsFromDb = await collection.find().sort({ timestamp: -1 }).limit(100).toArray(); 
  return logsFromDb.map(log => mapMongoId(log as Omit<AuditLogEntry, 'id'> & { _id: ObjectId }));
}


// Inventory Functions
export async function getInventory(
  sortField: keyof InventoryItem = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
  filterQuery: string = ''
): Promise<InventoryItem[]> {
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'>>(INVENTORY_COLLECTION);

  let query: any = {};
  if (filterQuery) {
    const lowerCaseQuery = filterQuery.toLowerCase();
    query = {
      $or: [
        { name: { $regex: lowerCaseQuery, $options: 'i' } },
        { code: { $regex: lowerCaseQuery, $options: 'i' } },
        { category: { $regex: lowerCaseQuery, $options: 'i' } },
        { supplier: { $regex: lowerCaseQuery, $options: 'i' } },
        { unitName: { $regex: lowerCaseQuery, $options: 'i' } },
        // Removed sellingUnits search
      ],
    };
  }

  const sortOptions: any = {};
  sortOptions[sortField === 'id' ? '_id' : sortField] = sortOrder === 'asc' ? 1 : -1;

  const itemsFromDb = await collection.find(query).sort(sortOptions).toArray();
  return itemsFromDb.map(item => mapMongoId(item as Omit<InventoryItem, 'id'> & { _id: ObjectId }));
}

export async function getInventoryItemById(itemId: string): Promise<InventoryItem | null> {
  if (!ObjectId.isValid(itemId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);
  const item = await collection.findOne({ _id: new ObjectId(itemId) });
  return item ? mapMongoId(item) : null;
}

export async function generateNextItemCodeForPrefix(db: Db, categoryPrefix: string, shelfPrefix: string): Promise<string> {
  const collection = db.collection<Omit<InventoryItem, 'id'>>(INVENTORY_COLLECTION);
  const escapedCategoryPrefix = categoryPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const escapedShelfPrefix = shelfPrefix.toUpperCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); 
  const codePrefixPattern = `^${escapedCategoryPrefix}-${escapedShelfPrefix}-`;

  const itemsWithPrefix = await collection.find({ code: { $regex: codePrefixPattern } }).sort({ code: -1 }).limit(1).toArray();
  
  let maxSequentialNumber = 0;
  if (itemsWithPrefix.length > 0) {
    const lastItemCode = itemsWithPrefix[0].code;
    const match = lastItemCode.match(new RegExp(`${codePrefixPattern}(\\d{5})$`));
    if (match && match[1]) {
      maxSequentialNumber = parseInt(match[1], 10);
    }
  }

  const nextSequentialNumber = maxSequentialNumber + 1;
  const sequentialString = String(nextSequentialNumber).padStart(5, '0');

  return `${categoryPrefix}-${escapedShelfPrefix}-${sequentialString}`;
}


export async function addInventoryItem(
  itemData: Omit<NewInventoryItemFormValues, 'category' | 'code'> & { 
    categoryCodePrefix: string; 
    shelfCodePrefix: string;
  }
): Promise<{ item?: InventoryItem, error?: string }> {
  const db = await getDb();
  
  const categoryNameToSave = getCategoryNameByCodePrefix(itemData.categoryCodePrefix);
  const shelfCodePrefixNormalized = itemData.shelfCodePrefix.toUpperCase();
  
  let fullCode = "";
  try {
    fullCode = await generateNextItemCodeForPrefix(db, itemData.categoryCodePrefix, shelfCodePrefixNormalized);
  } catch (e: any) {
    console.error("Error al generar código de artículo:", e);
    return { error: "Error al generar el código del artículo. Verifique los prefijos." };
  }
  
  const existingItemByFullCode = await db.collection(INVENTORY_COLLECTION).findOne({ code: fullCode });
  if (existingItemByFullCode) {
    return { error: `Un artículo con el código "${fullCode}" ya existe. Esto es inesperado si la generación secuencial funciona.` };
  }

  const newItemToInsert: Omit<InventoryItem, 'id'> = {
    code: fullCode,
    name: itemData.name,
    quantity: parseFloat(itemData.quantity),
    unitPrice: parseFloat(itemData.unitPrice),
    stockMinimo: parseInt(itemData.stockMinimo, 10),
    dailySales: parseFloat(itemData.dailySales),
    category: categoryNameToSave,
    supplier: itemData.supplier || undefined,
    unitType: itemData.unitType,
    unitName: itemData.unitName,
    lastUpdated: new Date().toISOString(),
  };

  const collection = db.collection<Omit<InventoryItem, 'id'>>(INVENTORY_COLLECTION);
  const result = await collection.insertOne(newItemToInsert as any); 
  if (result.insertedId) {
    const insertedItemWithId = { ...newItemToInsert, _id: result.insertedId };
    return { item: mapMongoId(insertedItemWithId) };
  }
  return { error: "Error al añadir el artículo al inventario." };
}

export async function updateInventoryItemDetails(
  itemId: string,
  itemData: Partial<Omit<InventoryItem, 'id' | 'code' | 'quantity' | 'lastUpdated'>>
): Promise<InventoryItem | null> {
  if (!ObjectId.isValid(itemId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

  const updatePayload: any = {};
  if (itemData.name !== undefined) updatePayload.name = itemData.name;
  if (itemData.unitPrice !== undefined) updatePayload.unitPrice = Number(itemData.unitPrice);
  if (itemData.stockMinimo !== undefined) updatePayload.stockMinimo = Number(itemData.stockMinimo);
  if (itemData.dailySales !== undefined) updatePayload.dailySales = Number(itemData.dailySales);
  if (itemData.category !== undefined) updatePayload.category = itemData.category;
  if (itemData.supplier !== undefined) updatePayload.supplier = itemData.supplier;
  if (itemData.unitType !== undefined) updatePayload.unitType = itemData.unitType;
  if (itemData.unitName !== undefined) updatePayload.unitName = itemData.unitName;
  
  if (Object.keys(updatePayload).length === 0) {
    const currentItem = await collection.findOne({ _id: new ObjectId(itemId) });
    return currentItem ? mapMongoId(currentItem) : null;
  }

  updatePayload.lastUpdated = new Date().toISOString();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(itemId) },
    { $set: updatePayload },
    { returnDocument: 'after' }
  );
  return result ? mapMongoId(result) : null;
}

export async function increaseItemQuantityByCode(code: string, quantityToAdd: number): Promise<InventoryItem | null> {
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

  const result = await collection.findOneAndUpdate(
    { code: code },
    {
      $inc: { quantity: quantityToAdd }, 
      $set: { lastUpdated: new Date().toISOString() }
    },
    { returnDocument: 'after' }
  );

  return result ? mapMongoId(result) : null;
}

export async function increaseItemQuantityById(itemId: string, quantityToAdd: number): Promise<InventoryItem | null> {
  if (!ObjectId.isValid(itemId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(itemId) },
    {
      $inc: { quantity: quantityToAdd }, 
      $set: { lastUpdated: new Date().toISOString() }
    },
    { returnDocument: 'after' }
  );
  return result ? mapMongoId(result) : null;
}


export async function updateItemQuantity(itemId: string, newQuantity: number): Promise<InventoryItem | null> {
  if (!ObjectId.isValid(itemId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(itemId) },
    {
      $set: {
        quantity: newQuantity, 
        lastUpdated: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  );
  return result ? mapMongoId(result) : null;
}

export async function deleteInventoryItem(itemId: string): Promise<boolean> {
  if (!ObjectId.isValid(itemId)) return false;
  const db = await getDb();
  const collection = db.collection(INVENTORY_COLLECTION);
  const result = await collection.deleteOne({ _id: new ObjectId(itemId) });
  return result.deletedCount === 1;
}

// Supplier Functions
export async function getSuppliers(): Promise<Supplier[]> {
  const db = await getDb();
  const collection = db.collection<Omit<Supplier, 'id'>>(SUPPLIERS_COLLECTION);
  const suppliersFromDb = await collection.find().sort({ name: 1 }).toArray();
  return suppliersFromDb.map(supplier => mapMongoId(supplier as Omit<Supplier, 'id'> & { _id: ObjectId }));
}

export async function addSupplier(supplierData: Omit<Supplier, 'id' | 'lastUpdated'>): Promise<Supplier> {
  const db = await getDb();
  const collection = db.collection<Omit<Supplier, 'id'>>(SUPPLIERS_COLLECTION);
  const newSupplierToInsert = {
    ...supplierData,
    lastUpdated: new Date().toISOString(),
  };
  const result = await collection.insertOne(newSupplierToInsert as any); 
  const insertedSupplierWithId = { ...newSupplierToInsert, _id: result.insertedId };
  return mapMongoId(insertedSupplierWithId);
}

export async function updateSupplier(supplierId: string, supplierData: Omit<Supplier, 'id' | 'lastUpdated'>): Promise<Supplier | null> {
  if (!ObjectId.isValid(supplierId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<Supplier, 'id'> & { _id: ObjectId }>(SUPPLIERS_COLLECTION);

  const updatePayload = {
    ...supplierData,
    lastUpdated: new Date().toISOString(),
  };

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(supplierId) },
    { $set: updatePayload },
    { returnDocument: 'after' }
  );
  return result ? mapMongoId(result) : null;
}

export async function deleteSupplier(supplierId: string): Promise<boolean> {
  if (!ObjectId.isValid(supplierId)) return false;
  const db = await getDb();
  const collection = db.collection(SUPPLIERS_COLLECTION);
  const result = await collection.deleteOne({ _id: new ObjectId(supplierId) });
  return result.deletedCount === 1;
}

// User Functions
export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  const db = await getDb();
  const collection = db.collection<User>(USERS_COLLECTION);
  const usersFromDb = await collection.find().sort({ nombre: 1 }).toArray();
  return usersFromDb.map(userDoc => {
    const { password, ...userWithoutPassword } = mapMongoId(userDoc as User & { _id: ObjectId });
    return userWithoutPassword;
  });
}

export async function getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
  if (!ObjectId.isValid(userId)) {
    console.warn(`[getUserById] Invalid userId format: ${userId}`);
    return null;
  }
  const db = await getDb();
  const collection = db.collection<User>(USERS_COLLECTION);
  const userDoc = await collection.findOne({ _id: new ObjectId(userId) });
  if (userDoc) {
    const { password, ...userWithoutPassword } = mapMongoId(userDoc as User & { _id: ObjectId });
    return userWithoutPassword;
  }
  return null;
}


export async function addUser(userData: Omit<User, 'id' | 'lastUpdated'>): Promise<{user?: Omit<User, 'password'>, error?: string}> {
  const db = await getDb();
  const collection = db.collection<User>(USERS_COLLECTION);

  if (!userData.password) {
    return { error: "La contraseña es obligatoria para nuevos usuarios." };
  }

  const existingUser = await collection.findOne({
    $or: [
      { email: userData.email },
      { nombre: { $regex: `^${userData.nombre}$`, $options: 'i' } }
    ]
  });
  if (existingUser) {
    return { error: "El nombre de usuario o email ya está en uso." };
  }

  const newUserToInsert: User = {
    ...userData,
    lastUpdated: new Date().toISOString(),
  };
  const result = await collection.insertOne(newUserToInsert as any); 
  const { password, ...userWithoutPassword } = mapMongoId({...newUserToInsert, _id: result.insertedId } as User & { _id: ObjectId });
  return { user: userWithoutPassword };
}

export async function updateUser(userId: string, userData: Partial<Omit<User, 'id' | 'lastUpdated' | 'password'>> & { password?: string }): Promise<Omit<User, 'password'> | null> {
  if (!ObjectId.isValid(userId)) return null;
  const db = await getDb();
  const collection = db.collection<User>(USERS_COLLECTION);

  const updateData: any = { ...userData };
  delete updateData.id; 

  if (userData.password && userData.password.trim() !== '') {
    updateData.password = userData.password; 
  } else {
    delete updateData.password; 
  }
  
  if (Object.keys(updateData).length === 0 && !userData.password) {
    const currentUserDoc = await collection.findOne({ _id: new ObjectId(userId) });
    if (currentUserDoc) {
        const { password, ...userWithoutPassword } = mapMongoId(currentUserDoc as User & { _id: ObjectId });
        return userWithoutPassword;
    }
    return null;
  }

  if (updateData.nombre || updateData.email) {
    const queryOr: any[] = [];
    if (updateData.email) queryOr.push({ email: updateData.email });
    if (updateData.nombre) queryOr.push({ nombre: { $regex: `^${updateData.nombre}$`, $options: 'i' } });
    
    if (queryOr.length > 0) {
        const existingUser = await collection.findOne({
        _id: { $ne: new ObjectId(userId) }, 
        $or: queryOr
        });
        if (existingUser) {
        throw new Error("El nombre de usuario o email ya está en uso por otro usuario.");
        }
    }
  }
  
  updateData.lastUpdated = new Date().toISOString();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (result) {
    const { password, ...userWithoutPassword } = mapMongoId(result as User & { _id: ObjectId });
    return userWithoutPassword;
  }
  return null;
}


export async function deleteUser(userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const db = await getDb();
  const collection = db.collection(USERS_COLLECTION);
  const result = await collection.deleteOne({ _id: new ObjectId(userId) });
  return result.deletedCount === 1;
}

export async function authenticateUser(credentials: LoginCredentials): Promise<Omit<User, 'password'> | null> {
  const db = await getDb();
  const collection = db.collection<User>(USERS_COLLECTION);
  
  const query: any = {
    nombre: { $regex: `^${credentials.nombre}$`, $options: 'i' }, 
    password: credentials.password 
  };
  
  try {
    const userDoc = await collection.findOne(query);
    if (userDoc) {
      const { password, ...userWithoutPassword } = mapMongoId(userDoc as User & { _id: ObjectId });
      return userWithoutPassword;
    } else {
      return null;
    }
  } catch (error: any) {
    throw error; 
  }
}

// Customer Functions
export async function getCustomers(): Promise<Customer[]> {
  const db = await getDb();
  const collection = db.collection<Omit<Customer, 'id'>>(CUSTOMERS_COLLECTION);
  const customersFromDb = await collection.find().sort({ name: 1 }).toArray();
  return customersFromDb.map(customer => mapMongoId(customer as Omit<Customer, 'id'> & { _id: ObjectId }));
}

export async function addCustomer(customerData: CustomerFormValues): Promise<Customer> {
  const db = await getDb();
  const collection = db.collection<Omit<Customer, 'id'>>(CUSTOMERS_COLLECTION);
  
  const now = new Date().toISOString();
  const newCustomerToInsert: Omit<Customer, 'id'> = {
    name: customerData.name,
    email: customerData.email || undefined,
    phone: customerData.phone || undefined,
    address: customerData.address || undefined,
    ruc: customerData.ruc || undefined,
    registrationDate: now,
    lastUpdated: now,
  };
  const result = await collection.insertOne(newCustomerToInsert as any);
  const insertedCustomerWithId = { ...newCustomerToInsert, _id: result.insertedId };
  return mapMongoId(insertedCustomerWithId);
}

export async function updateCustomer(customerId: string, customerData: CustomerFormValues): Promise<Customer | null> {
  if (!ObjectId.isValid(customerId)) return null;
  const db = await getDb();
  const collection = db.collection<Omit<Customer, 'id'> & { _id: ObjectId }>(CUSTOMERS_COLLECTION);

  const updatePayload: Partial<Omit<Customer, 'id' | 'registrationDate' | 'lastUpdated'>> = {};
  if (customerData.name) updatePayload.name = customerData.name;
  if (customerData.email !== undefined) updatePayload.email = customerData.email || undefined; 
  if (customerData.phone !== undefined) updatePayload.phone = customerData.phone || undefined;
  if (customerData.address !== undefined) updatePayload.address = customerData.address || undefined;
  if (customerData.ruc !== undefined) updatePayload.ruc = customerData.ruc || undefined;
  
  if (Object.keys(updatePayload).length === 0) {
     const currentCustomer = await collection.findOne({ _id: new ObjectId(customerId) });
     return currentCustomer ? mapMongoId(currentCustomer) : null;
  }

  updatePayload.lastUpdated = new Date().toISOString();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(customerId) },
    { $set: updatePayload },
    { returnDocument: 'after' }
  );
  return result ? mapMongoId(result) : null;
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  if (!ObjectId.isValid(customerId)) return false;
  const db = await getDb();
  const collection = db.collection(CUSTOMERS_COLLECTION);
  const result = await collection.deleteOne({ _id: new ObjectId(customerId) });
  return result.deletedCount === 1;
}

// --- Sales Functions ---
export async function generateNextSaleNumber(db: Db): Promise<string> {
  const salesCollection = db.collection<Omit<Sale, 'id'>>(SALES_COLLECTION);
  const lastSale = await salesCollection.find().sort({ saleNumber: -1 }).limit(1).toArray();
  let nextNumber = 1;
  if (lastSale.length > 0 && lastSale[0].saleNumber) {
    const lastNumStr = lastSale[0].saleNumber.replace(/^V/i, '');
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }
  return `V${String(nextNumber).padStart(5, '0')}`;
}

export async function addSale(
  saleData: Omit<Sale, 'id' | 'saleNumber' | 'lastUpdated' | 'sellerName'> & { userId: string }
): Promise<{ sale?: Sale; error?: string; stockError?: string }> {
  const db = await getDb();
  const inventoryCollection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);
  const salesCollection = db.collection<Omit<Sale, 'id'>>(SALES_COLLECTION);

  // --- Stock Validation ---
  for (const saleItem of saleData.items) {
    if (!ObjectId.isValid(saleItem.productId)) {
       return { stockError: `ID de producto inválido: "${saleItem.productId}" para "${saleItem.productName}".` };
    }
    const product = await inventoryCollection.findOne({ _id: new ObjectId(saleItem.productId) });
    if (!product) {
      return { stockError: `Producto "${saleItem.productName}" (ID: ${saleItem.productId}) no encontrado.` };
    }
    // For single unit model, conversionToBaseAtSale is effectively 1
    const quantityInBaseUnitsToDeduct = saleItem.quantitySold; // * 1 (implicit)

    if (product.quantity < quantityInBaseUnitsToDeduct) {
      return { stockError: `Stock insuficiente para "${product.name}" (en ${product.unitName}). Disponible: ${product.quantity.toFixed(2)}, Solicitado: ${quantityInBaseUnitsToDeduct.toFixed(2)}.` };
    }
  }
  // --- End Stock Validation ---

  let sellerName = 'Usuario Desconocido';
  if (ObjectId.isValid(saleData.userId)) { // saleData.userId is the actorUserId
    const seller = await getUserById(saleData.userId); 
    if (seller) {
      sellerName = seller.nombre;
    }
  }
  
  const bulkStockUpdates = saleData.items.map(item => {
    const quantityToDeduct = item.quantitySold; // No conversion factor needed for single unit model
    return {
      updateOne: {
        filter: { _id: new ObjectId(item.productId) },
        update: { 
          $inc: { quantity: -quantityToDeduct }, 
          $set: { lastUpdated: new Date().toISOString() }
        },
      },
    }
  });

  try {
    if (bulkStockUpdates.length > 0) {
      await inventoryCollection.bulkWrite(bulkStockUpdates as any); 
    }

    const saleNumber = await generateNextSaleNumber(db);
    const now = new Date().toISOString();
    const newSaleToInsert: Omit<Sale, 'id'> = {
      date: saleData.date || now, 
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      items: saleData.items,
      totalAmount: saleData.totalAmount,
      paymentMethod: saleData.paymentMethod,
      userId: saleData.userId,
      sellerName, 
      saleNumber,
      lastUpdated: now,
    };

    const result = await salesCollection.insertOne(newSaleToInsert as any);
    if (result.insertedId) {
      const insertedSaleWithId = { ...newSaleToInsert, _id: result.insertedId };
      return { sale: mapMongoId(insertedSaleWithId) };
    } else {
      console.error("Error en dbAddSale: No se obtuvo insertedId de MongoDB después de insertOne.");
      return { error: "Error crítico: No se pudo confirmar el guardado de la venta en la base de datos." };
    }
  } catch (e: any) {
    console.error("Error durante dbAddSale (catch):", e);
    // Attempt to revert stock updates if sale insertion fails
    console.warn("Intentando revertir actualizaciones de stock debido a error en la creación de la venta...");
    for (const saleItem of saleData.items) {
        if (ObjectId.isValid(saleItem.productId)) {
            const quantityToRestore = saleItem.quantitySold;
            await inventoryCollection.updateOne(
                { _id: new ObjectId(saleItem.productId) },
                { $inc: { quantity: quantityToRestore } }
            );
        }
    }
    const message = e.message || "Se produjo un error interno del servidor durante el procesamiento de la base de datos para la venta.";
    return { error: `Error al procesar la venta: ${message}. Se intentó revertir el stock.` };
  }
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDb();
  const collection = db.collection<Omit<Sale, 'id'>>(SALES_COLLECTION);
  const salesFromDb = await collection.find().sort({ date: -1 }).toArray();
  return salesFromDb.map(sale => mapMongoId(sale as Omit<Sale, 'id'> & { _id: ObjectId }));
}

export async function getSaleById(saleId: string): Promise<Sale | null> {
  if (!ObjectId.isValid(saleId)) {
    console.warn(`[getSaleById] Invalid saleId format: ${saleId}`);
    return null;
  }
  const db = await getDb();
  const collection = db.collection<Omit<Sale, 'id'> & { _id: ObjectId }>(SALES_COLLECTION);
  const sale = await collection.findOne({ _id: new ObjectId(saleId) });
  return sale ? mapMongoId(sale) : null;
}

export async function deleteSaleAndRestoreStock(saleId: string): Promise<{ success: boolean; error?: string }> {
  if (!ObjectId.isValid(saleId)) {
    return { success: false, error: "ID de venta inválido." };
  }
  const db = await getDb();
  const salesCollection = db.collection<Omit<Sale, 'id'> & { _id: ObjectId }>(SALES_COLLECTION);
  const inventoryCollection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

  const saleToDelete = await salesCollection.findOne({ _id: new ObjectId(saleId) });

  if (!saleToDelete) {
    return { success: false, error: "Venta no encontrada." };
  }

  try {
    for (const item of saleToDelete.items) {
      if (!ObjectId.isValid(item.productId)) {
        console.warn(`Skipping stock restoration for invalid productId: ${item.productId} in sale ${saleId}`);
        continue;
      }
      const quantityToRestore = item.quantitySold; // No conversion factor for single unit model

      const updateResult = await inventoryCollection.findOneAndUpdate(
        { _id: new ObjectId(item.productId) },
        {
          $inc: { quantity: quantityToRestore }, 
          $set: { lastUpdated: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );
      if (!updateResult) {
        console.warn(`Producto con ID ${item.productId} no encontrado en inventario durante la restauración de stock para la venta ${saleId}.`);
      }
    }

    const deleteResult = await salesCollection.deleteOne({ _id: new ObjectId(saleId) });
    if (deleteResult.deletedCount === 1) {
      return { success: true };
    } else {
      return { success: false, error: "No se pudo eliminar la venta de la base de datos." };
    }
  } catch (e: any) {
    console.error(`Error al eliminar la venta ${saleId} y restaurar stock:`, e);
    return { success: false, error: `Error del servidor: ${e.message}` };
  }
}

export async function updateSaleDetails(
  saleId: string,
  data: { customerId?: string; customerName?: string; paymentMethod?: PaymentMethod }
): Promise<Sale | null> {
  if (!ObjectId.isValid(saleId)) {
    console.warn(`[updateSaleDetails] Invalid saleId format: ${saleId}`);
    return null;
  }
  const db = await getDb();
  const salesCollection = db.collection<Omit<Sale, 'id'> & { _id: ObjectId }>(SALES_COLLECTION);

  const updatePayload: any = {
    lastUpdated: new Date().toISOString(),
  };

  if (data.paymentMethod) {
    updatePayload.paymentMethod = data.paymentMethod;
  }
  
  if (data.customerId === undefined && data.hasOwnProperty('customerId')) { 
    updatePayload.customerId = undefined;
    updatePayload.customerName = undefined;
  } else if (data.customerId) { 
    updatePayload.customerId = data.customerId;
    if (data.customerName) { 
         updatePayload.customerName = data.customerName;
    }
  }
  
  const numKeysToUpdate = Object.keys(updatePayload).length;
  if (numKeysToUpdate === 1 && updatePayload.lastUpdated) {
     const currentSale = await salesCollection.findOne({_id: new ObjectId(saleId)});
     return currentSale ? mapMongoId(currentSale) : null;
  }


  const result = await salesCollection.findOneAndUpdate(
    { _id: new ObjectId(saleId) },
    { $set: updatePayload },
    { returnDocument: 'after' }
  );

  return result ? mapMongoId(result) : null;
}

