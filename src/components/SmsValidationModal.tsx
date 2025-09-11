// src\components\SmsValidationModal.tsx
// 
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppModal } from './ui/whatsapp-modal';
import { CheckCircle, Search, AlertCircle } from 'lucide-react';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import MiniStepProgress from '@/components/ui/MiniStepProgress';

// Props supprimées - maintenant gérées par le contexte

interface Organization {
  id: string;
  name: string;
  slug: string;
  phone: string;
}

export const SmsValidationModal = () => {
  const { state, completeStep } = useWorkflow();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [slugInput, setSlugInput] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [foundOrganization, setFoundOrganization] = useState<Organization | null>(null);

  // Vérifier si c'est l'étape actuelle
  if (state.current_step !== 'sms_validation') {
    return null;
  }

  // Charger les organisations
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, phone')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Erreur chargement organisations:', error);
      toast.error('Erreur lors du chargement des organisations');
    }
  };

  // Vérifier le slug
  const checkSlug = async () => {
    if (!slugInput.trim()) return;

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, phone')
        .eq('slug', slugInput.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setIsSlugValid(false);
          setFoundOrganization(null);
          toast.error('Aucune organisation trouvée avec ce slug');
        } else {
          throw error;
        }
      } else {
        setIsSlugValid(true);
        setFoundOrganization(data);
        setSelectedOrganization(data.id);
        toast.success('Organisation trouvée !');
      }
    } catch (error) {
      console.error('Erreur vérification slug:', error);
      toast.error('Erreur lors de la vérification du slug');
    } finally {
      setIsChecking(false);
    }
  };

  // Pré-remplir avec les données existantes si disponibles
  useEffect(() => {
    if (state.stepData?.sms_validation) {
      setSelectedOrganization(state.stepData.sms_validation.selectedOrganization || '');
      setSlugInput(state.stepData.sms_validation.slugInput || '');
      setCode(state.stepData.sms_validation.code || '');
    }
  }, [state.stepData]);

  // Si organizationData est fourni, l'utiliser directement
  useEffect(() => {
    if (organizationData) {
      setSelectedOrganization(organizationData.id);
      // setFoundOrganization(organizationData);
      setIsSlugValid(true);
    }
  }, [organizationData]);

  // Valider le code SMS
  const handleValidate = async () => {
    if (!selectedOrganization) {
      toast.error('Veuillez sélectionner une organisation');
      return;
    }

    setIsLoading(true);
    try {
      if (code === '123456') {
        // 1. INSÉRER DANS SMS_VALIDATIONS
        const { data: insertedValidation, error: validationError } = await supabase
          .from('sms_validations')
          .insert({
            organization_id: selectedOrganization,
            phone_number: foundOrganization?.phone || organizationData?.phone || '',
            validation_code: code,
            is_used: true,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (validationError) throw validationError;

        // 2. METTRE À JOUR ORGANIZATIONS
        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            is_phone_validated: true,
            validated_at: new Date().toISOString()
          })
          .eq('id', selectedOrganization);

        if (orgError) throw orgError;

        console.log('✅ SMS validé avec succès');

        // 3. PASSER À L'ÉTAPE SUIVANTE
        const validationData = {
          isValidated: true,
          organizationId: selectedOrganization,
          organization: foundOrganization || organizationData,
          validationId: insertedValidation.id
        };

        // Utiliser la nouvelle architecture
        try {
          await completeStep('sms_validation');
          console.log('✅ SmsValidationModal: Étape complétée avec succès');
        } catch (stepError) {
          console.error('❌ SmsValidationModal: Erreur lors de la complétion de l\'étape:', stepError);
          toast.error('Erreur lors de la sauvegarde de la validation SMS');
        }

      } else {
        throw new Error('Code invalide');
      }
    } catch (error: any) {
      console.error('❌ Erreur validation:', error);
      toast.error(error.message || 'Code invalide, veuillez réessayer');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOrgData = organizations.find(org => org.id === selectedOrganization);

  return (
    <WhatsAppModal isOpen={true} onClose={() => { }}>
      <div className="p-6 max-w-md mx-auto">
        <div className="mb-4">
          <MiniStepProgress currentStep={state.current_step} completedSteps={state.completed_steps} />
        </div>
        <h2 className="text-2xl font-bold text-[#128C7E] mb-6 text-center">
          Validation SMS Organisation
        </h2>

        {/* Sélection de l'organisation */}
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="organization" className="text-[#128C7E] font-medium">
              Sélectionnez l'organisation
            </Label>
            <Select
              value={selectedOrganization}
              onValueChange={setSelectedOrganization}
            >
              <SelectTrigger className="modal-whatsapp-input">
                <SelectValue placeholder="Choisissez une organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-gray-500">OU</div>

          {/* Recherche par slug */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-[#128C7E] font-medium">
              Rechercher par slug
            </Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="Entrez le slug de l'organisation"
                className="modal-whatsapp-input"
                disabled={isChecking}
              />
              <Button
                onClick={checkSlug}
                disabled={!slugInput.trim() || isChecking}
                className="btn-whatsapp-primary"
                size="icon"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Organisation sélectionnée */}
        {selectedOrganization && (
          <div className="bg-[#128C7E]/10 border border-[#128C7E]/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#128C7E]" />
              <span className="font-semibold text-[#128C7E]">Organisation sélectionnée</span>
            </div>
            <p className="text-sm">
              <strong>{selectedOrgData?.name}</strong><br />
              Slug: <code>{selectedOrgData?.slug}</code><br />
              Téléphone: {selectedOrgData?.phone}
            </p>
          </div>
        )}

        {/* Champ code OTP (désactivé si pas d'organisation) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-[#128C7E] font-medium">
              Code de validation
            </Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Entrez le code à 6 chiffres"
              maxLength={6}
              className="text-center text-2xl tracking-widest modal-whatsapp-input"
              disabled={!selectedOrganization || isLoading}
            />
          </div>

          <Button
            onClick={handleValidate}
            disabled={!selectedOrganization || code.length !== 6 || isLoading}
            className="w-full btn-whatsapp-primary"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Validation...
              </span>
            ) : (
              'Valider l\'organisation'
            )}
          </Button>
        </div>

        {/* Message d'aide */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-sm text-yellow-700">
              <strong>Code de test :</strong> 123456<br />
              Le Super Admin enverra le code réel par SMS.
            </p>
          </div>
        </div>
      </div>
    </WhatsAppModal>
  );
};

export default SmsValidationModal;