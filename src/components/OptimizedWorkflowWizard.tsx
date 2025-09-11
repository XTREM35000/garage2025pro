// src/components/OptimizedWorkflowWizard.tsx
import { OptimizedWorkflowWizardProps, WorkflowState, PlanDetails, AdminCredentials } from '@/types/workflow.types';
import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Imports des modaux
import { SuperAdminCreationModal } from './SuperAdminCreationModal';
import PricingModal from './PricingModal';
import { AdminCreationModal } from './AdminCreationModal';
import { OrganizationSetupModal } from './OrganizationSetupModal';
import SmsValidationModal from './SmsValidationModal';
import GarageSetupModal from './GarageSetupModal';
import CompletionSummaryModal from './CompletionSummaryModal';
import WorkflowProgressBar from './WorkflowProgressBar';

interface OrganizationSetupModalProps {
  isOpen: boolean;
  onComplete: (data: any) => void;
  selectedPlan(Plan: any): any
}

// Types pour le workflow
type WorkflowStep =
  | 'super_admin'
  | 'pricing'
  | 'admin'
  | 'organization'
  | 'sms_validation'
  | 'garage'
  | 'completed';

export const OptimizedWorkflowWizard: React.FC<OptimizedWorkflowWizardProps> = ({
  isOpen,
  onComplete
}) => {
  const { state, isLoading, error, goToStep } = useWorkflow();
  const [currentModal, setCurrentModal] = useState<WorkflowStep | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials | null>(null);

  // Logs de débogage
  useEffect(() => {
    console.log('🔄 Current modal changed to:', currentModal);
  }, [currentModal]);

  useEffect(() => {
    console.log('📊 Workflow state updated:', state);
  }, [state]);

  const determineCurrentModal = useCallback(() => {
    if (!state || !isOpen) {
      console.log('❌ État workflow non disponible ou modal fermé');
      return null;
    }

    console.log('🔍 Analyse workflow:', state);

    // Utiliser current_step directement depuis le contexte
    return state.current_step;
  }, [state, isOpen]);

  // Mise à jour du modal actuel
  useEffect(() => {
    const nextModal = determineCurrentModal();
    console.log(`🔍 [OptimizedWorkflowWizard] Détermination modal:`, {
      nextModal,
      currentModal,
      stateCurrentStep: state?.current_step,
      isOpen
    });

    if (nextModal !== currentModal) {
      console.log(`🔄 Changement modal: ${currentModal} → ${nextModal}`);
      setCurrentModal(nextModal);
    }
  }, [determineCurrentModal, currentModal, state?.current_step, isOpen]);

  // Effet pour forcer la vérification après chaque étape
  useEffect(() => {
    if (currentModal === 'completed') {
      onComplete('completed');
    }
  }, [currentModal, onComplete]);

  // Handlers
  const handleStepCompleted = async (step: WorkflowStep) => {
    console.log(`✅ Étape terminée: ${step}`);
    toast.success(`${step.replace('_', ' ')} complété ! 🎉`);
  };

  const handlePlanSelected = async (planDetails: PlanDetails) => {
    setSelectedPlan(planDetails);
    console.log('📋 Plan sélectionné:', planDetails);
    await handleStepCompleted('pricing');
    setCurrentModal('organization');
  };

  const handleAdminCreated = async (credentials: AdminCredentials) => {
    setAdminCredentials(credentials);
    await handleStepCompleted('admin');
  };

  const handleCompletionClose = () => {
    onComplete('completed');
  };

  // Loader
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Vérification du workflow...</span>
          </div>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const handleSmsValidated = async (validationData: any) => {
    console.log('📱 SMS validation completed:', validationData);
    await handleStepCompleted('sms_validation');
  };

  // Rendu des modaux
  return (
    <>
      {/* Progress Bar UI */}
      {state && (
        <WorkflowProgressBar
          currentStep={state.current_step as any}
          completedSteps={state.completed_steps as any}
          onStepClick={(step) => goToStep(step as any)}
        />
      )}

      {currentModal === 'super_admin' && (
        <SuperAdminCreationModal />
      )}

      {currentModal === 'admin' && (
        <AdminCreationModal />
      )}

      {currentModal === 'pricing' && (
        <PricingModal />
      )}

      {currentModal === 'organization' && (
        <OrganizationSetupModal />
      )}

      {currentModal === 'sms_validation' && state && (
        <SmsValidationModal />
      )}

      {currentModal === 'garage' && state && (
        <GarageSetupModal />
      )}

      {currentModal === 'completed' && (
        <CompletionSummaryModal />
      )}
    </>
  );
};

export default OptimizedWorkflowWizard;