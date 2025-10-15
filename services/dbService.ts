import type { Character } from '../types';

const DB_NAME = 'VisualNovelDB';
const DB_VERSION = 1;
const STORES = {
  SETTINGS: 'settings',
  CHARACTERS: 'characters',
};

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORES.SETTINGS)) {
        dbInstance.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!dbInstance.objectStoreNames.contains(STORES.CHARACTERS)) {
        dbInstance.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
      }
    };
  });
};

export const getSetting = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : undefined);
    };
  });
};

export const setSetting = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getAllCharacters = async (): Promise<Character[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CHARACTERS, 'readonly');
    const store = transaction.objectStore(STORES.CHARACTERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const saveCharacter = async (character: Character): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CHARACTERS, 'readwrite');
    const store = transaction.objectStore(STORES.CHARACTERS);
    const request = store.put(character);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const deleteCharacterDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CHARACTERS, 'readwrite');
    const store = transaction.objectStore(STORES.CHARACTERS);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
