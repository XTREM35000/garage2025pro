export const WORKFLOW_STEPS = {
  LOADING: 'loading',
  SUPER_ADMIN: 'super-admin',
  PRICING: 'pricing',
  CREATE_ADMIN: 'create-admin',
  CREATE_ORGANIZATION: 'create-organization',
  SMS_VALIDATION: 'sms-validation',
  GARAGE_SETUP: 'garage-setup',
  COMPLETE: 'complete'
} as const;

export type WorkflowMode = 'super_admin' | 'tenant' | 'admin';

export type WorkflowStep =
  | 'super_admin'
  | 'admin'
  | 'pricing'
  | 'organization'
  | 'sms_validation'
  | 'garage'
  | 'completed';

export interface WorkflowState {
  current_step: WorkflowStep;
  completed_steps: WorkflowStep[];
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  userId?: string;
  lastActiveOrg?: string;
  metadata?: Record<string, any>;
  stepData?: Record<string, any>;
  isOpen?: boolean;
}

export interface WorkflowContextType {
  state: WorkflowState;
  completeStep: (step: WorkflowStep) => Promise<void>;
  goToStep: (step: WorkflowStep) => Promise<void>;
  reset: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  validateFormField: (field: string, value: string) => {
    isValid: boolean;
    error?: string;
  };
}

export const WORKFLOW_STEP_ORDER: readonly WorkflowStep[] = [
  'super_admin',
  'admin', 
  'pricing',
  'organization',
  'sms_validation',
  'garage',
  'completed'
] as const;

export const getNextStep = (currentStep: WorkflowStep): WorkflowStep => {
  const currentIndex = WORKFLOW_STEP_ORDER.indexOf(currentStep);
  return WORKFLOW_STEP_ORDER[currentIndex + 1] || 'completed';
};

export const isValidWorkflowStep = (step: unknown): step is WorkflowStep => {
  return typeof step === 'string' && WORKFLOW_STEP_ORDER.includes(step as WorkflowStep);
};

export const parseWorkflowState = (data: any): WorkflowState => {
  return {
    current_step: isValidWorkflowStep(data.current_step) ? data.current_step : 'super_admin',
    completed_steps: Array.isArray(data.completed_steps) ? data.completed_steps : [],
    isDemo: Boolean(data.metadata?.isDemo),
    loading: false,
    error: null,
    userId: data.user_id,
    metadata: data.metadata || {},
    stepData: data.stepData || {}
  };
};