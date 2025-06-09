
import { MongoClient, ObjectId, type Collection, type Db, ServerApiVersion, ClientSession, TransactionOptions } from 'mongodb';
import { getDb, clientPromise } from './mongodb'; // Import clientPromise
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
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME; // Ensure MONGODB_DB_NAME is available

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
export async function generateNextSaleNumber(db: Db, session?: ClientSession): Promise<string> {
  const salesCollection = db.collection<Omit<Sale, 'id'>>(SALES_COLLECTION);
  const lastSale = await salesCollection.find({}, { session }).sort({ saleNumber: -1 }).limit(1).toArray();
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
  const mongoClient = await clientPromise;
  const session = mongoClient.startSession();

  const transactionOptions: TransactionOptions = {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 30000 
  };

  let resultSale: Sale | undefined;
  console.log(`[addSale] Initiating transaction for user: ${saleData.userId}`);

  try {
    await session.withTransaction(async (currentSession) => {
      if (!MONGODB_DB_NAME) {
        console.error("[addSale Transaction] CRITICAL: MONGODB_DB_NAME is not defined. Aborting transaction.");
        throw new Error("Configuración de base de datos incompleta en el servidor.");
      }
      const db = mongoClient.db(MONGODB_DB_NAME); // Explicitly use MONGODB_DB_NAME
      console.log(`[addSale Transaction] Using database: ${db.databaseName}`);
      const inventoryCollection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);
      const salesCollection = db.collection<Omit<Sale, 'id'>>(SALES_COLLECTION);
      const usersCollection = db.collection<User>(USERS_COLLECTION);

      console.log(`[addSale Transaction] Processing ${saleData.items.length} items.`);
      for (const saleItem of saleData.items) {
        const currentProductIdString = saleItem.productId; 
        console.log(`[addSale Transaction] Processing saleItem: ${saleItem.productName}, RAW productId (string from client): "${currentProductIdString}" (length: ${currentProductIdString.length})`);
        
        let charCodes = '';
        for (let i = 0; i < currentProductIdString.length; i++) {
          charCodes += currentProductIdString.charCodeAt(i) + ' ';
        }
        console.log(`[addSale Transaction] RAW productId char codes: [${charCodes.trim()}]`);

        if (!ObjectId.isValid(currentProductIdString)) {
          console.error(`[addSale Transaction] Invalid ObjectId for productId: ${currentProductIdString} (product: ${saleItem.productName})`);
          throw new Error(`ID de producto inválido: "${currentProductIdString}" para "${saleItem.productName}".`);
        }
        
        const objectIdToSearch = new ObjectId(currentProductIdString);
        console.log(`[addSale Transaction] Attempting to find product with _id (ObjectId): ${objectIdToSearch.toHexString()} in collection: ${inventoryCollection.collectionName} of DB: ${db.databaseName}`);
        
        const product = await inventoryCollection.findOne({ _id: objectIdToSearch }, { session: currentSession });
        console.log(`[addSale Transaction] Product find result for ID ${objectIdToSearch.toHexString()}: ${product ? 'FOUND' : 'NULL'}`);
        
        if (!product) {
          console.error(`[addSale Transaction] Product not found in collection '${INVENTORY_COLLECTION}' for _id: ${objectIdToSearch.toHexString()} (converted from string "${currentProductIdString}"). Product Name: ${saleItem.productName}`);
          throw new Error(`Producto "${saleItem.productName}" (ID: ${currentProductIdString}) no encontrado.`);
        }
        console.log(`[addSale Transaction] Found product: ${product.name}, current stock: ${product.quantity}`);

        const quantityInBaseUnitsToDeduct = saleItem.quantitySold;
        if (product.quantity < quantityInBaseUnitsToDeduct) {
          console.error(`[addSale Transaction] Insufficient stock for product: ${product.name} (ID: ${currentProductIdString}). Available: ${product.quantity}, Requested: ${quantityInBaseUnitsToDeduct}`);
          throw new Error(`Stock insuficiente para "${product.name}" (en ${product.unitName}). Disponible: ${product.quantity.toFixed(2)}, Solicitado: ${quantityInBaseUnitsToDeduct.toFixed(2)}.`);
        }
      }

      let sellerName = 'Usuario Desconocido';
      if (ObjectId.isValid(saleData.userId)) {
        const sellerDoc = await usersCollection.findOne({ _id: new ObjectId(saleData.userId) }, { session: currentSession });
        if (sellerDoc) {
          sellerName = sellerDoc.nombre;
        }
      }
      console.log(`[addSale Transaction] Seller name determined: ${sellerName}`);

      const bulkStockUpdates = saleData.items.map(item => {
        const quantityToDeduct = item.quantitySold;
        return {
          updateOne: {
            filter: { _id: new ObjectId(item.productId), quantity: { $gte: quantityToDeduct } },
            update: {
              $inc: { quantity: -quantityToDeduct },
              $set: { lastUpdated: new Date().toISOString() }
            },
          },
        };
      });

      if (bulkStockUpdates.length > 0) {
        console.log(`[addSale Transaction] Performing bulk stock update for ${bulkStockUpdates.length} items.`);
        const bulkResult = await inventoryCollection.bulkWrite(bulkStockUpdates as any, { session: currentSession });
        if (bulkResult.matchedCount !== bulkStockUpdates.length || bulkResult.modifiedCount !== bulkStockUpdates.length) {
          console.warn(`[addSale Transaction] Stock update issue during bulkWrite. Matched: ${bulkResult.matchedCount}, Modified: ${bulkResult.modifiedCount}, Expected: ${bulkStockUpdates.length}. Aborting transaction.`);
          throw new Error("No se pudo actualizar el stock para todos los artículos. La cantidad podría haber cambiado. Intente de nuevo.");
        }
        console.log(`[addSale Transaction] Bulk stock update successful. Matched: ${bulkResult.matchedCount}, Modified: ${bulkResult.modifiedCount}`);
      }

      const saleNumber = await generateNextSaleNumber(db, currentSession);
      console.log(`[addSale Transaction] Generated sale number: ${saleNumber}`);
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

      console.log(`[addSale Transaction] Attempting to insert sale: ${saleNumber}`);
      const insertResult = await salesCollection.insertOne(newSaleToInsert as any, { session: currentSession });
      if (!insertResult.insertedId) {
        console.error(`[addSale Transaction] Failed to insert sale. No insertedId returned. Aborting transaction.`);
        throw new Error("Error crítico: No se pudo confirmar el guardado de la venta en la base de datos durante la transacción.");
      }
      console.log(`[addSale Transaction] Sale inserted successfully. DB ID: ${insertResult.insertedId}`);
      const insertedSaleWithId = { ...newSaleToInsert, _id: insertResult.insertedId };
      resultSale = mapMongoId(insertedSaleWithId);

    }, transactionOptions); 

    if (resultSale) {
        console.log(`[addSale] Transaction committed successfully for sale: ${resultSale.saleNumber}`);
        return { sale: resultSale };
    } else {
        console.error("[addSale] Transaction completed but resultSale is undefined. This should not happen if withTransaction didn't throw.");
        return { error: "La transacción de venta se completó, pero no se pudo obtener el resultado final de la venta. Revise la base de datos." };
    }

  } catch (e: any) {
    console.error("[addSale] Error during addSale (outer catch):", e.message, e.stack);
    if (e.message.startsWith("Producto") || e.message.startsWith("ID de producto inválido") || e.message.startsWith("Stock insuficiente") || e.message.startsWith("No se pudo actualizar el stock")) {
        return { stockError: e.message };
    }
    if (e.message.startsWith("Configuración de base de datos incompleta")) {
        return { error: e.message };
    }
    if (e.name === 'MongoExpiredSessionError' || (e.name === 'MongoTransactionError' && e.hasErrorLabel('TransientTransactionError')) || e.message.includes('MaxTimeMSExpired')) {
        console.error(`[addSale] Transaction timed out (maxCommitTimeMS: ${transactionOptions.maxCommitTimeMS}ms).`);
        return { error: `La operación de venta excedió el tiempo límite (${(transactionOptions.maxCommitTimeMS || 0)/1000}s) y fue cancelada. Por favor, inténtalo de nuevo.` };
    }
    const message = e.message || "Se produjo un error interno del servidor al procesar la venta.";
    return { error: `Error al procesar la venta: ${message}` };
  } finally {
    await session.endSession();
    console.log("[addSale] Session ended.");
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

  const mongoClient = await clientPromise;
  const session = mongoClient.startSession();
  const transactionOptions: TransactionOptions = {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 30000
  };

  try {
    let operationSucceeded = false;
    await session.withTransaction(async (currentSession) => {
      if (!MONGODB_DB_NAME) {
        console.error("[deleteSaleAndRestoreStock Transaction] CRITICAL: MONGODB_DB_NAME is not defined. Aborting transaction.");
        throw new Error("Configuración de base de datos incompleta en el servidor.");
      }
      const db = mongoClient.db(MONGODB_DB_NAME);
      const salesCollection = db.collection<Omit<Sale, 'id'> & { _id: ObjectId }>(SALES_COLLECTION);
      const inventoryCollection = db.collection<Omit<InventoryItem, 'id'> & { _id: ObjectId }>(INVENTORY_COLLECTION);

      const saleToDelete = await salesCollection.findOne({ _id: new ObjectId(saleId) }, { session: currentSession });

      if (!saleToDelete) {
        throw new Error("Venta no encontrada.");
      }

      for (const item of saleToDelete.items) {
        if (!ObjectId.isValid(item.productId)) {
          console.warn(`Skipping stock restoration for invalid productId: ${item.productId} in sale ${saleId}`);
          continue;
        }
        const quantityToRestore = item.quantitySold;

        const updateResult = await inventoryCollection.findOneAndUpdate(
          { _id: new ObjectId(item.productId) },
          {
            $inc: { quantity: quantityToRestore },
            $set: { lastUpdated: new Date().toISOString() }
          },
          { session: currentSession, returnDocument: 'after' }
        );
        if (!updateResult) {
          console.warn(`Producto con ID ${item.productId} no encontrado en inventario durante la restauración de stock para la venta ${saleId}.`);
        }
      }

      const deleteResult = await salesCollection.deleteOne({ _id: new ObjectId(saleId) }, { session: currentSession });
      if (deleteResult.deletedCount !== 1) {
         throw new Error("No se pudo eliminar la venta de la base de datos.");
      }
      operationSucceeded = true;
    }, transactionOptions);

    return { success: operationSucceeded };

  } catch (e: any) {
    console.error(`Error al eliminar la venta ${saleId} y restaurar stock:`, e);
    if (e.message.startsWith("Configuración de base de datos incompleta")) {
        return { success: false, error: e.message };
    }
    if (e.name === 'MongoExpiredSessionError' || e.name === 'MongoTransactionError' && e.hasErrorLabel('TransientTransactionError') || e.message.includes('MaxTimeMSExpired')) {
        return { success: false, error: `La operación de eliminación excedió el tiempo límite (${(transactionOptions.maxCommitTimeMS || 0)/1000}s) y fue cancelada.` };
    }
    if (e.message === "Venta no encontrada.") {
        return { success: false, error: e.message };
    }
    if (e.message === "No se pudo eliminar la venta de la base de datos.") {
        return { success: false, error: e.message };
    }
    return { success: false, error: `Error del servidor: ${e.message}` };
  } finally {
    await session.endSession();
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

