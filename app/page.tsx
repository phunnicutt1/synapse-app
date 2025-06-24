'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SignatureTemplatesPanel } from './components/SignatureTemplatesPanel';
import { EquipmentReviewPanel } from './components/EquipmentReviewPanel';
import { CxAlloyMappingPanel } from './components/CxAlloyMappingPanel';
import { EditSignatureModal } from './components/EditSignatureModal';
import { SignatureEditModal } from './components/SignatureEditModal';
import { useAppStore } from '@/hooks/useAppStore';

export default function Home() {
  const queryClient = useQueryClient();
  const { isSignatureEditModalOpen, editingSignatureId, closeSignatureEditModal } = useAppStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ['init'],
    queryFn: () => fetch('/api/init').then(res => {
        if (!res.ok) throw new Error("Initialization failed");
        return res.json();
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const handleReProcess = async () => {
    // This forces the init API to re-run by clearing the database state server-side
    await fetch('/api/init?force=true');
    // And this clears the client-side cache to trigger a refetch
    queryClient.invalidateQueries();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-bold text-gray-800">Synapse Point Mapper</h1>
            <p className="text-gray-600 mt-1">Intelligently map BACnet data to CxAlloy commissioning projects.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleReProcess}
            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Re-Process All Data
          </button>
          <button 
            onClick={() => window.open('/testing', '_blank')}
            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            Testing Dashboard
          </button>
        </div>
      </header>

      {isLoading && <div className="text-center text-xl font-semibold text-blue-600">Processing data files, please wait...</div>}
      {error && <div className="text-center text-xl text-red-500">Error processing data. Check server console logs.</div>}
      
      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(380px,auto)_1fr_minmax(380px,auto)] gap-8">
            <SignatureTemplatesPanel />
            <EquipmentReviewPanel />
            <CxAlloyMappingPanel />
          </div>
          <EditSignatureModal />
          <SignatureEditModal 
            isOpen={isSignatureEditModalOpen}
            onClose={closeSignatureEditModal}
            signatureId={editingSignatureId}
          />
        </>
      )}
    </main>
  );
}