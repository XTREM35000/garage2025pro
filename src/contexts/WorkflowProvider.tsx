import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  WorkflowStep,
  DBWorkflowState,
  WorkflowContextType
} from '@/types/workflow.types';

// Interface locale pour l'état du workflow dans le contexte
interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  userId?: string;
  lastActiveOrg?: string;
  metadata?: Record<string, any>;
  stepData?: Record<string, any>;
  isOpen?: boolean;
}

export const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

const initialState: WorkflowState = {
  currentStep: 'super_admin',
  completedSteps: [],
  isDemo: false,
  loading: false,
  error: null,
  isOpen: true
};

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkflowState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuthSession();

  // Vérifier l'existence d'un super admin (nouvelle table: profiles)
  const checkSuperAdminExists = useCallback(async () => {
    try {
      console.log('🔍 [WorkflowProvider] Vérification super admin dans profiles...');
      
      // D'abord, vérifier tous les profils pour debug
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, role, email');
      
      console.log('📊 [WorkflowProvider] Tous les profils:', allProfiles);
      
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      console.log('📊 [WorkflowProvider] Résultat requête super_admin:', { count, error });

      if (error) {
        console.error('❌ [WorkflowProvider] Erreur vérification super admin:', error);
        return false;
      }

      const hasSuperAdmin = typeof count === 'number' && count > 0;
      console.log('✅ [WorkflowProvider] Vérification super admin (profiles):', hasSuperAdmin ? 'Trouvé' : 'Non trouvé', `(count: ${count})`);
      return hasSuperAdmin;
    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur inattendue:', err);
      return false;
    }
  }, []);

  // Créer l'état initial du workflow
  const createInitialState = useCallback(async () => {
    // Pour l'étape super_admin, on n'a pas besoin d'utilisateur connecté
    // Mais on doit toujours vérifier s'il existe déjà un super admin
    if (!user?.id && state.currentStep !== 'super_admin') {
      // Vérifier quand même s'il existe un super admin pour déterminer l'état initial
      const hasSuperAdmin = await checkSuperAdminExists();
      if (hasSuperAdmin) {
        console.log('✅ [WorkflowProvider] Super admin trouvé, passage à admin');
        setState(prev => ({
          ...prev,
          current_step: 'admin',
          completed_steps: ['super_admin'],
          isLoading: false
        }));
      } else {
        console.log('ℹ️ [WorkflowProvider] Aucun super admin, création nécessaire');
        setState(prev => ({
          ...prev,
          current_step: 'super_admin',
          completed_steps: [],
          isLoading: false
        }));
      }
      return;
    }

    try {
      console.log('🔄 [WorkflowProvider] Création de l\'état initial...');

      // Vérifier s'il existe déjà un super admin
      const hasSuperAdmin = await checkSuperAdminExists();

      let currentStep: WorkflowStep;
      let completedSteps: WorkflowStep[];

      if (hasSuperAdmin) {
        // Si un super admin existe, passer à la création admin
        currentStep = 'admin';
        completedSteps = ['super_admin'];
        console.log('✅ [WorkflowProvider] Super admin trouvé, passage direct à admin');
      } else {
        // Aucun super admin, commencer par la création
        currentStep = 'super_admin';
        completedSteps = [];
        console.log('ℹ️ [WorkflowProvider] Aucun super admin, création nécessaire');
      }

      const newState = {
        ...initialState,
        userId: user.id,
        current_step: currentStep,
        completed_steps: completedSteps
      };

      // Sauvegarder dans Supabase (seulement si on a un utilisateur)
      if (user?.id) {
        const { error: insertError } = await supabase
          .from('workflow_states')
          .insert({
            user_id: user.id,
            current_step: newState.current_step,
            completed_steps: newState.completed_steps,
            metadata: { isDemo: newState.isDemo }
          });

        if (insertError) {
          console.error('❌ [WorkflowProvider] Erreur insertion workflow state:', insertError);
          throw insertError;
        }
      } else {
        console.log('ℹ️ [WorkflowProvider] Pas d\'utilisateur, pas de sauvegarde workflow state');
      }

      setState(newState);
      console.log('✅ [WorkflowProvider] État initial créé et sauvegardé:', newState);
    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur création état initial:', err);
      setError(err instanceof Error ? err.message : 'Erreur de création');
    }
  }, [user?.id, checkSuperAdminExists]);

  // Synchronisation avec Supabase
  const syncState = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 [WorkflowProvider] Synchronisation avec Supabase...');

      // Vérifier s'il existe déjà un état de workflow pour cet utilisateur
      const { data, error: fetchError } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        // État existant trouvé, l'utiliser
        const workflowData = data as DBWorkflowState;
        console.log('📋 [WorkflowProvider] État existant trouvé:', workflowData);

        setState({
          current_step: workflowData.current_step as WorkflowStep,
          completed_steps: workflowData.completed_steps || [],
          lastActiveOrg: typeof workflowData.metadata === 'object' && workflowData.metadata !== null
            ? (workflowData.metadata as Record<string, any>).lastActiveOrg
            : undefined,
          isDemo: typeof workflowData.metadata === 'object' && workflowData.metadata !== null
            ? Boolean((workflowData.metadata as Record<string, any>).isDemo)
            : false,
          userId: workflowData.user_id,
          loading: false,
          error: null,
          isOpen: true,
          metadata: typeof workflowData.metadata === 'object' && workflowData.metadata !== null
            ? (workflowData.metadata as Record<string, any>)
            : {}
        });
      } else {
        // Aucun état existant, créer un nouvel état initial
        console.log('🆕 [WorkflowProvider] Aucun état existant, création d\'un nouvel état...');
        await createInitialState();
      }
    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur synchronisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de synchronisation');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, createInitialState]);

  // Interface pour la table workflow_states
  interface WorkflowStateInsert {
    current_step: string;
    user_id: string;
    completed_steps?: string[];
    metadata?: Record<string, any>;
    updated_at?: string;
    created_at?: string;
    is_completed?: boolean;
  }

  // Fonction pour créer ou mettre à jour l'état du workflow
  const createOrUpdateWorkflowState = useCallback(async (workflowData: Partial<WorkflowStateInsert>) => {
    if (!user?.id) return;

    try {
      const dataToUpsert: WorkflowStateInsert = {
        user_id: user.id,
        current_step: workflowData.current_step || 'super_admin',
        completed_steps: workflowData.completed_steps || [],
        metadata: {
          ...(state.metadata || {}),
          lastUpdate: new Date().toISOString(),
          ...(workflowData.metadata || {})
        },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('workflow_states')
        .upsert(dataToUpsert)
        .select()
        .single();

      if (error) {
        console.error('❌ [WorkflowProvider] Erreur upsert:', error);
        throw error;
      }

      console.log('✅ [WorkflowProvider] Workflow mis à jour:', data);
      return data;
    } catch (error) {
      console.error('❌ [WorkflowProvider] Erreur mise à jour workflow:', error);
      throw error;
    }
  }, [user?.id, state.metadata]);

  // Compléter une étape et passer à la suivante (ordre strict)
  const completeStep = useCallback(async (step: WorkflowStep) => {
    console.log('🎯 [WorkflowProvider] completeStep appelé avec:', step);
    console.log('🎯 [WorkflowProvider] user?.id:', user?.id);
    
    // Pour la création du super admin, on n'a pas besoin d'utilisateur connecté
    if (!user?.id && step !== 'super_admin') {
      console.log('❌ [WorkflowProvider] Pas d\'utilisateur, abandon');
      return;
    }

    try {
      console.log('🎯 [WorkflowProvider] Complétion étape:', step);

      // Ajouter l'étape aux étapes complétées
      const newCompletedSteps = [...state.completed_steps, step];

      // Déterminer la prochaine étape selon la logique du workflow
      let nextStep: WorkflowStep;

      switch (step) {
        case 'super_admin':
          nextStep = 'admin';
          break;
        case 'admin':
          nextStep = 'pricing';
          break;
        case 'pricing':
          nextStep = 'organization';
          break;
        case 'organization':
          nextStep = 'sms_validation';
          break;
        case 'sms_validation':
          nextStep = 'garage';
          break;
        case 'garage':
          nextStep = 'completed';
          break;
        default:
          nextStep = 'completed';
      }

      // Mettre à jour l'état local immédiatement
      const newState = {
        ...state,
        current_step: nextStep,
        completed_steps: newCompletedSteps,
        loading: false,
        error: null
      };

      setState(newState);
      console.log('✅ [WorkflowProvider] État local mis à jour:', newState);
      
      // Si on vient de créer un super admin, vérifier qu'il existe bien
      if (step === 'super_admin') {
        console.log('🔄 [WorkflowProvider] Vérification post-création super admin...');
        
        // Petit délai pour permettre la propagation des données
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const hasSuperAdmin = await checkSuperAdminExists();
        console.log('🔍 [WorkflowProvider] Résultat vérification:', hasSuperAdmin);
        
        if (!hasSuperAdmin) {
          console.warn('⚠️ [WorkflowProvider] Super admin non trouvé après création, réinitialisation...');
          // Réinitialiser l'état si la création a échoué
          setState(prev => ({
            ...prev,
            current_step: 'super_admin',
            completed_steps: prev.completed_steps.filter(s => s !== 'super_admin')
          }));
          return;
        }
        console.log('✅ [WorkflowProvider] Super admin confirmé après création');
      }

      // Sauvegarder dans Supabase (sauf pour super_admin qui n'a pas d'utilisateur)
      if (step !== 'super_admin' && user?.id) {
        await createOrUpdateWorkflowState({
          current_step: nextStep,
          completed_steps: newCompletedSteps,
          metadata: {
            lastCompletedStep: step,
            completedAt: new Date().toISOString()
          }
        });
      } else if (step === 'super_admin') {
        console.log('ℹ️ [WorkflowProvider] Étape super_admin complétée, pas de sauvegarde nécessaire');
      }

      console.log('✅ [WorkflowProvider] Étape complétée, passage à:', nextStep);

      // Si c'est la dernière étape, marquer comme terminé
      if (nextStep === 'completed') {
        await createOrUpdateWorkflowState({
          current_step: 'completed',
          completed_steps: newCompletedSteps,
          metadata: {
            ...newState.metadata,
            completedAt: new Date().toISOString(),
            is_completed: true
          }
        });
      }

    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur complétion étape:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la complétion');
    }
  }, [user?.id, state, createOrUpdateWorkflowState]);

  // Navigation contrôlée avec garde d'ordre
  const goToStep = useCallback(async (targetStep: WorkflowStep) => {
    try {
      const stepOrder: WorkflowStep[] = [
        'super_admin',
        'pricing',
        'admin',
        'organization',
        'sms_validation',
        'garage',
        'completed'
      ];

      const currentIndex = stepOrder.indexOf(state.currentStep);
      const targetIndex = stepOrder.indexOf(targetStep);

      // Garde d'ordre: on ne peut aller qu'à une étape déjà complétée ou la suivante immédiate
      const isCompleted = state.completedSteps.includes(targetStep);
      const isNext = targetIndex === currentIndex + 1;
      const isSame = targetIndex === currentIndex;

      if (!(isCompleted || isNext || isSame)) {
        console.warn('⛔ Navigation refusée vers', targetStep);
        try {
          const { toast } = await import('sonner');
          toast.error("Navigation non autorisée vers cette étape. Veuillez compléter les étapes précédentes.");
        } catch (_) {
          // pas de toast disponible dans ce contexte, ignorer
        }
        return;
      }

      setState(prev => ({
        ...prev,
        currentStep: targetStep
      }));

      await createOrUpdateWorkflowState({
        current_step: targetStep,
        completed_steps: state.completedSteps
      });
    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur goToStep:', err);
    }
  }, [state.currentStep, state.completedSteps, createOrUpdateWorkflowState]);

  // Validation flexible des champs
  const validateFormField = useCallback((field: string, value: string) => {
    switch (field) {
      case 'email':
        const isValid = value.length >= 2;
        return {
          isValid,
          error: isValid ? undefined : 'Email trop court (min 2 caractères)'
        };
      case 'password':
        const passwordValid = value.length >= 8;
        return {
          isValid: passwordValid,
          error: passwordValid ? undefined : 'Mot de passe trop court (min 8 caractères)'
        };
      case 'name':
        const nameValid = value.trim().length > 0;
        return {
          isValid: nameValid,
          error: nameValid ? undefined : 'Nom requis'
        };
      case 'phone':
        const phoneValid = /^\+?\d{8,15}$/.test(value);
        return {
          isValid: phoneValid,
          error: phoneValid ? undefined : 'Numéro de téléphone invalide'
        };
      default:
        return { isValid: true };
    }
  }, []);

  // Reset workflow
  const reset = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('workflow_states')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setState(initialState);
      console.log('🔄 [WorkflowProvider] Workflow réinitialisé');
    } catch (err) {
      console.error('❌ [WorkflowProvider] Erreur reset:', err);
      setError(err instanceof Error ? err.message : 'Erreur de réinitialisation');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Sync automatique au changement d'utilisateur
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      syncState();
    } else if (!isAuthenticated) {
      setState(initialState);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, user?.id, syncState]);

  const contextValue: WorkflowContextType = {
    state,
    completeStep,
    goToStep,
    reset,
    isLoading,
    error,
    validateFormField
  };

  // Debug: Log de l'état à chaque changement
  useEffect(() => {
    console.log('🔄 [WorkflowProvider] État mis à jour:', {
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      isLoading,
      error
    });
  }, [state.currentStep, state.completedSteps, isLoading, error]);

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
