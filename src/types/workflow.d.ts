// src/types/workflow.d.ts
export type WorkflowStep =
  | 'init'
  | 'super_admin_check'
  | 'admin_creation'
  | 'org_creation'
  | 'organization_setup'
  | 'pricing_selection'
  | 'sms_validation'
  | 'garage_setup'
  | 'completed';

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  userId?: string;
  metadata?: Record<string, any>;
  lastActiveOrg?: string | null;
}

export interface WorkflowError {
  message: string;
  code?: string;
  details?: any;
}

export interface WorkflowContextType {
  state: WorkflowState;
  completeStep: (step: WorkflowStep) => Promise<void>;
  reset: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  validateFormField: (field: string, value: string) => {
    isValid: boolean;
    error?: string;
  };
}

export interface DBWorkflowState {
  id: string;
  user_id: string;
  current_step: WorkflowStep;
  completed_steps: WorkflowStep[];
  is_completed: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}