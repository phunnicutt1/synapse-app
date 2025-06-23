import {
    EquipmentSignature,
    EquipmentSource,
    CxAlloyEquipment,
    EquipmentMapping,
  } from '@/interfaces/bacnet';
  import { v4 as uuidv4 } from 'uuid';
  
  interface Db {
    signatures: Map<string, EquipmentSignature>;
    equipment: Map<string, EquipmentSource>;
    unmappedCxAlloy: Map<string, CxAlloyEquipment>;
    mappings: Map<string, EquipmentMapping>;
    isInitialized: boolean;
  }
  
  const db: Db = {
    signatures: new Map(),
    equipment: new Map(),
    unmappedCxAlloy: new Map(),
    mappings: new Map(),
    isInitialized: false,
  };
  
  export const database = {
    initialize: (
      signatures: EquipmentSignature[],
      equipment: EquipmentSource[],
      cxAlloy: CxAlloyEquipment[]
    ) => {
      if (db.isInitialized) return; // Prevent re-initialization
      
      db.signatures.clear();
      db.equipment.clear();
      db.unmappedCxAlloy.clear();
      db.mappings.clear();
  
      signatures.forEach((s) => db.signatures.set(s.id, s));
      equipment.forEach((e) => db.equipment.set(e.id, e));
      cxAlloy.forEach((c) => db.unmappedCxAlloy.set(c.id, c));
      
      db.isInitialized = true;
      console.log('In-memory database initialized.');
    },
    
    reset: () => {
        db.isInitialized = false;
        db.signatures.clear();
        db.equipment.clear();
        db.unmappedCxAlloy.clear();
        db.mappings.clear();
        console.log('In-memory database has been reset.');
    },
  
    isInitialized: () => db.isInitialized,
  
    getSignatures: () => Array.from(db.signatures.values()),
  
    getEquipmentBySignature: (signatureId: string) => {
      const signature = db.signatures.get(signatureId);
      if (!signature) return [];
      return signature.matchingEquipmentIds.map(id => db.equipment.get(id)).filter(Boolean) as EquipmentSource[];
    },
    
    getAllEquipment: () => Array.from(db.equipment.values()),
    
    getEquipmentById: (id: string) => db.equipment.get(id),
  
    getUnmappedCxAlloy: () => Array.from(db.unmappedCxAlloy.values()),
  
    createMapping: (skySparkEquipmentId: string, cxAlloyEquipmentId: string) => {
      const skySparkEquip = db.equipment.get(skySparkEquipmentId);
      const cxAlloyEquip = db.unmappedCxAlloy.get(cxAlloyEquipmentId);
      const signature = Array.from(db.signatures.values()).find(s => s.matchingEquipmentIds.includes(skySparkEquipmentId));
  
      if (!skySparkEquip || !cxAlloyEquip || !signature) {
        throw new Error('Invalid data for mapping.');
      }
  
      const newMapping: EquipmentMapping = {
        id: uuidv4(),
        skySparkEquipmentId,
        cxAlloyEquipmentId,
        cxAlloyEquipmentName: cxAlloyEquip.name,
        signatureId: signature.id,
        mappedAt: new Date(),
        mappedBy: 'local_user',
      };
  
      db.mappings.set(newMapping.id, newMapping);
      db.unmappedCxAlloy.delete(cxAlloyEquipmentId);
      
      signature.matchingEquipmentIds = signature.matchingEquipmentIds.filter(id => id !== skySparkEquipmentId);
      db.signatures.set(signature.id, signature);
  
      return newMapping;
    },
  
        createSignature: (signatureData: Omit<EquipmentSignature, 'id'>) => {
      const id = uuidv4();
      const newSignature: EquipmentSignature = {
        id,
        ...signatureData,
      };
      
      db.signatures.set(id, newSignature);
      return newSignature;
    },

    updateSignature: (id: string, updates: Partial<EquipmentSignature>) => {
      const signature = db.signatures.get(id);
      if (!signature) throw new Error("Signature not found");

      const updatedSignature = { ...signature, ...updates, source: 'user-validated' as const };
      db.signatures.set(id, updatedSignature);
      return updatedSignature;
    }
  };
  