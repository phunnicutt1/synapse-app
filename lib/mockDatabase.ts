import {
    EquipmentSignature,
    EquipmentSource,
    CxAlloyEquipment,
    EquipmentMapping,
    AutoAssignmentResult,
    SignatureAnalytics,
  } from '@/interfaces/bacnet';
  import { v4 as uuidv4 } from 'uuid';
  
  interface Db {
    signatures: Map<string, EquipmentSignature>;
    equipment: Map<string, EquipmentSource>;
    unmappedCxAlloy: Map<string, CxAlloyEquipment>;
    mappings: Map<string, EquipmentMapping>;
    autoAssignments: Map<string, AutoAssignmentResult>;
    signatureAnalytics: Map<string, SignatureAnalytics>;
    isInitialized: boolean;
  }
  
  const db: Db = {
    signatures: new Map(),
    equipment: new Map(),
    unmappedCxAlloy: new Map(),
    mappings: new Map(),
    autoAssignments: new Map(),
    signatureAnalytics: new Map(),
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
      db.autoAssignments.clear();
      db.signatureAnalytics.clear();
  
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
        db.autoAssignments.clear();
        db.signatureAnalytics.clear();
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
    },

    deleteSignature: (id: string) => {
      const signature = db.signatures.get(id);
      if (!signature) throw new Error("Signature not found");

      // Remove the signature
      db.signatures.delete(id);
      
      // Also remove any related analytics
      db.signatureAnalytics.delete(id);
      
      // Remove any auto-assignments related to this signature
      const assignmentsToRemove = Array.from(db.autoAssignments.entries())
        .filter(([_, assignment]) => assignment.signatureId === id)
        .map(([key]) => key);
      
      assignmentsToRemove.forEach(key => db.autoAssignments.delete(key));
      
      return true;
    },

    // Auto-assignment and confidence tracking methods
    createAutoAssignment: (assignment: Omit<AutoAssignmentResult, 'timestamp'>) => {
      const newAssignment: AutoAssignmentResult = {
        ...assignment,
        timestamp: new Date()
      };
      
      const id = `${assignment.equipmentId}-${assignment.signatureId}`;
      db.autoAssignments.set(id, newAssignment);
      return newAssignment;
    },

    getAutoAssignments: () => Array.from(db.autoAssignments.values()),

    updateAutoAssignment: (equipmentId: string, signatureId: string, updates: Partial<AutoAssignmentResult>) => {
      const id = `${equipmentId}-${signatureId}`;
      const assignment = db.autoAssignments.get(id);
      if (!assignment) throw new Error("Auto-assignment not found");

      const updatedAssignment = { ...assignment, ...updates };
      db.autoAssignments.set(id, updatedAssignment);
      return updatedAssignment;
    },

    recordSignatureAnalytics: (analytics: SignatureAnalytics) => {
      db.signatureAnalytics.set(analytics.signatureId, analytics);
    },

    getSignatureAnalytics: (signatureId: string) => {
      return db.signatureAnalytics.get(signatureId);
    },

    getAllSignatureAnalytics: () => Array.from(db.signatureAnalytics.values()),

    updateSignatureAnalytics: (signatureId: string, updates: Partial<SignatureAnalytics>) => {
      const existing = db.signatureAnalytics.get(signatureId);
      if (!existing) {
        // Create new analytics if none exist
        const newAnalytics: SignatureAnalytics = {
          signatureId,
          totalMatches: 0,
          accurateMatches: 0,
          accuracy: 0,
          averageConfidence: 0,
          usageFrequency: 0,
          lastUsed: new Date(),
          userFeedback: { positive: 0, negative: 0 },
          ...updates
        };
        db.signatureAnalytics.set(signatureId, newAnalytics);
        return newAnalytics;
      }

      const updatedAnalytics = { ...existing, ...updates };
      db.signatureAnalytics.set(signatureId, updatedAnalytics);
      return updatedAnalytics;
    }
  };
  