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
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-8">
      {/* Enhanced Header */}
      <header className="mb-10">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 lg:gap-0">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Synapse Point Mapper
            </h1>
            <p className="text-lg text-gray-600 font-medium max-w-2xl leading-relaxed">
              Intelligently map BACnet data to CxAlloy commissioning projects with advanced semantic analysis.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={handleReProcess}
              className="header-button danger group"
              title="Re-process all data files"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-Process All Data
            </button>
            <button 
              onClick={() => window.open('/testing', '_blank')}
              className="header-button success group"
              title="Open testing dashboard in new tab"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Testing Dashboard
            </button>
            <button 
              onClick={() => window.open('/demo', '_blank')}
              className="header-button info group"
              title="Open state management demo in new tab"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              State Demo
            </button>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-l-blue-400 rounded-full animate-spin animate-reverse"></div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-gray-800">Processing Data Files</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Analyzing BACnet points and applying semantic normalization rules. This may take a few moments...
            </p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-800 mb-2">Processing Error</h3>
            <p className="text-red-700">
              Error processing data. Please check server console logs for detailed information.
            </p>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      {data && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(400px,auto)_1fr_minmax(400px,auto)] gap-8">
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
        </div>
      )}
    </main>
  );
}