import { create } from 'zustand';

interface AppState {
  selectedSignatureId: string | null;
  selectedSourceEquipmentId: string | null;
  selectedEquipmentId: string | null; // For the new equipment selection
  isEditModalOpen: boolean;
  expandedSignatureId: string | null;
  expandedEquipmentId: string | null;
  expandedEquipmentTypes: Set<string>; // For tracking expanded equipment types
  setSelectedSignatureId: (id: string | null) => void;
  setSelectedSourceEquipmentId: (id: string | null) => void;
  setSelectedEquipmentId: (id: string | null) => void; // For the new equipment selection
  openEditModal: () => void;
  closeEditModal: () => void;
  setExpandedSignatureId: (id: string | null) => void;
  setExpandedEquipmentId: (id: string | null) => void;
  toggleExpandedEquipmentType: (type: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSignatureId: null,
  selectedSourceEquipmentId: null,
  selectedEquipmentId: null,
  isEditModalOpen: false,
  expandedSignatureId: null,
  expandedEquipmentId: null,
  expandedEquipmentTypes: new Set<string>(),
  setSelectedSignatureId: (id) => set({ selectedSignatureId: id, selectedSourceEquipmentId: null }),
  setSelectedSourceEquipmentId: (id) => set({ selectedSourceEquipmentId: id }),
  setSelectedEquipmentId: (id) => set({ selectedEquipmentId: id }),
  openEditModal: () => set({ isEditModalOpen: true }),
  closeEditModal: () => set({ isEditModalOpen: false }),
  setExpandedSignatureId: (id) => set({ expandedSignatureId: id }),
  setExpandedEquipmentId: (id) => set({ expandedEquipmentId: id }),
  toggleExpandedEquipmentType: (type) => set((state) => {
    const newExpanded = new Set(state.expandedEquipmentTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    return { expandedEquipmentTypes: newExpanded };
  }),
}));