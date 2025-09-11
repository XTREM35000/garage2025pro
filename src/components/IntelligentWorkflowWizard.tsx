import React, { useState, useEffect } from 'react';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import { useSystemStatus } from '@/components/SystemStatusChecker';

// Import des modaux
import { SuperAdminCreationModal } from '@/components/SuperAdminCreationModal';
import { AdminCreationModal } from '@/components/AdminCreationModal';
import PricingModal from '@/components/PricingModal';
import { OrganizationSetupModal } from '@/components/OrganizationSetupModal';
import SmsValidationModal from '@/components/SmsValidationModal';
import GarageSetupModal from '@/components/GarageSetupModal';
import CompletionSummaryModal from '@/components/CompletionSummaryModal';

export const IntelligentWorkflowWizard = () => {
  const { state, isLoading, error } = useWorkflow();
  const { status, refreshStatus } = useSystemStatus();
  const [currentModal, setCurrentModal] = useState<string | null>(null);

  // Déterminer quel modal afficher basé sur l'état du système ET du workflow
  useEffect(() => {
    if (isLoading || !status) return;

    console.log('🔍 IntelligentWorkflowWizard: Détermination modal', {
      systemStatus: status,
      workflowState: state
    });

    // Si le système est vide, forcer super admin
    if (status.isEmpty) {
      setCurrentModal('super_admin');
      return;
    }

    // Sinon, utiliser l'état du workflow
    if (state.current_step && state.current_step !== 'completed') {
      setCurrentModal(state.current_step);
    } else {
      setCurrentModal(null);
    }
  }, [status, state.current_step, isLoading]);

  // Gérer la completion des étapes
  const handleStepComplete = async () => {
    console.log('✅ Étape complétée, rafraîchissement du statut système...');
    await refreshStatus();
  };

  // Gestion des erreurs
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Erreur Workflow</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  // Loader
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Chargement du workflow...</span>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎭 IntelligentWorkflowWizard: Rendu modal:', currentModal);

  // Rendu des modaux selon l'étape déterminée
  return (
    <>
      {currentModal === 'super_admin' && (
        <SuperAdminCreationModal key="super_admin" />
      )}
      
      {currentModal === 'admin' && (
        <AdminCreationModal key="admin" />
      )}
      
      {currentModal === 'pricing' && (
        <PricingModal key="pricing" />
      )}
      
      {currentModal === 'organization' && (
        <OrganizationSetupModal key="organization" />
      )}
      
      {currentModal === 'sms_validation' && (
        <SmsValidationModal key="sms_validation" />
      )}
      
      {currentModal === 'garage' && (
        <GarageSetupModal key="garage" />
      )}
      
      {currentModal === 'completed' && (
        <CompletionSummaryModal key="completed" />
      )}
    </>
  );
};

export default IntelligentWorkflowWizard;