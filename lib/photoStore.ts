export const MAX_STORED_PHOTOS = 10;

export interface StoredPhoto {
  id: string;
  blob: Blob;
  createdAt: number;
  frameId: string;
}

const DATABASE_NAME = "joy-of-giving-photo-booth";
const STORE_NAME = "photos";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local photo storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local photo storage."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local photo storage failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local photo storage was interrupted."));
  });
}

function requestResult<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(message));
  });
}

export async function listStoredPhotos(): Promise<StoredPhoto[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const completion = transactionComplete(transaction);
    try {
      const photos = await requestResult(transaction.objectStore(STORE_NAME).getAll(), "Could not read saved photos.");
      await completion;
      return (photos as StoredPhoto[]).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      await completion.catch(() => undefined);
      throw error;
    }
  } finally {
    database.close();
  }
}

export async function storePhoto(blob: Blob, frameId: string): Promise<StoredPhoto | null> {
  const photo: StoredPhoto = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    blob,
    frameId,
    createdAt: Date.now(),
  };
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(STORE_NAME);
    try {
      const count = await requestResult(store.count(), "Could not check the local gallery.");
      if (count >= MAX_STORED_PHOTOS) {
        await completion;
        return null;
      }
      await requestResult(store.add(photo), "Could not save the photo locally.");
      await completion;
      return photo;
    } catch (error) {
      await completion.catch(() => undefined);
      throw error;
    }
  } finally {
    database.close();
  }
}

export async function deleteStoredPhoto(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    try {
      await requestResult(transaction.objectStore(STORE_NAME).delete(id), "Could not delete the saved photo.");
      await completion;
    } catch (error) {
      await completion.catch(() => undefined);
      throw error;
    }
  } finally {
    database.close();
  }
}
