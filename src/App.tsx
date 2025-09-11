import React from 'react';
import { Toaster } from 'sonner';
import { WorkflowProvider } from '@/contexts/WorkflowProvider';
import { SuperAdminCreationModal } from '@/components/SuperAdminCreationModal';
import { AdminCreationModal } from '@/components/AdminCreationModal';
import PricingModal from '@/components/PricingModal';
import { OrganizationSetupModal } from '@/components/OrganizationSetupModal';
import SmsValidationModal from '@/components/SmsValidationModal';
import GarageSetupModal from '@/components/GarageSetupModal';
import CompletionSummaryModal from '@/components/CompletionSummaryModal';
import { useWorkflow } from '@/contexts/WorkflowProvider';

const AppContent = () => {
  const { state, isLoading, error } = useWorkflow();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Recharger
          </button>
        </div>
      </div>
    );
  }

  // Rendu des modaux selon l'étape actuelle
  return (
    <>
      {state.currentStep === 'super_admin' && <SuperAdminCreationModal />}
      {state.currentStep === 'admin' && <AdminCreationModal />}
      {state.currentStep === 'pricing' && <PricingModal />}
      {state.currentStep === 'organization' && <OrganizationSetupModal />}
      {state.currentStep === 'sms_validation' && <SmsValidationModal />}
      {state.currentStep === 'garage' && <GarageSetupModal />}
      {state.currentStep === 'completed' && <CompletionSummaryModal />}
    </>
  );
};

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkflowProvider>
        <AppContent />
      </WorkflowProvider>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export default App;