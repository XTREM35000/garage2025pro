import React, { useState, useEffect, memo } from 'react';
import { WhatsAppModal } from '@/components/ui/whatsapp-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmailFieldPro } from '@/components/ui/email-field-pro';
import { PhoneFieldPro } from '@/components/ui/phone-field-pro';
import { PasswordFieldPro } from '@/components/ui/password-field-pro';
import { toast } from 'sonner';
import AvatarUpload from '@/components/ui/avatar-upload';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import '../styles/whatsapp-theme.css';
import MiniStepProgress from '@/components/ui/MiniStepProgress';

interface SuperAdminCreationModalProps {
  // Props supprimées - maintenant gérées par le contexte
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
}

export const SuperAdminCreationModal = memo(({ }: SuperAdminCreationModalProps) => {
  const { state, completeStep } = useWorkflow();
  
  // Vérifier si c'est l'étape actuelle AVANT les hooks
  if (state.current_step !== 'super_admin') {
    return null;
  }

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    avatarUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      avatarUrl: ''
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validation améliorée
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        throw new Error("Tous les champs obligatoires doivent être remplis");
      }

      if (formData.password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères");
      }

      console.log('🔄 Création Super Admin via Edge Function...', formData);

      // Utilisation directe de fetch avec la clé de service
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-super-admin-with-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.replace(/\s/g, ''),
            avatarUrl: formData.avatarUrl
          })
        }
      );

      // Vérifiez le statut HTTP
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Réponse reçue:', data);

      // Gestion des erreurs de la function
      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error('Erreur inconnue lors de la création');
      }

      console.log('✅ Super Admin créé avec succès:', data);

      toast.success(`Super Admin ${formData.firstName} créé avec succès! 🎉`, {
        duration: 5000
      });

      // Utiliser la nouvelle architecture
      try {
        console.log('🔄 SuperAdminCreationModal: Appel completeStep...');
        await completeStep('super_admin');
        console.log('✅ SuperAdminCreationModal: Étape complétée avec succès');
        
        // Petit délai pour permettre la transition UI
        setTimeout(() => {
          resetForm();
        }, 1000);
      } catch (stepError) {
        console.error('❌ SuperAdminCreationModal: Erreur lors de la complétion de l\'étape:', stepError);
        // Ne pas re-throw l'erreur car la création a réussi
      }

    } catch (err: any) {
      console.error("❌ Erreur création complète:", err);
      const errorMessage = err.message || "Erreur lors de la création du Super Admin";
      setError(errorMessage);

      toast.error(errorMessage, {
        duration: 7000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      avatarUrl: ''
    });
    setAvatarPreview(null);
    setError(null);
  };

  const handleAvatarChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, avatarUrl: result }));
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const isFormValid = () => {
    return formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.password &&
      formData.password.length >= 6;
  };

  return (
    <WhatsAppModal isOpen={true} onClose={() => { }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <MiniStepProgress currentStep={state.current_step} completedSteps={state.completed_steps} />
        </div>
        <AvatarUpload
          avatarPreview={avatarPreview}
          onAvatarChange={handleAvatarChange}
          role="Super Admin"
          roleColor="gold"
          title="Création d'un Super Administrateur"
          subtitle="Configurez le compte principal de votre système"
        />

        <Card className="modal-whatsapp-card">
          <CardContent className="space-y-6 p-6">
            {/* Informations personnelles */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#128C7E] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#128C7E]">Informations personnelles</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[#128C7E] font-medium">
                    Prénom *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Votre prénom"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[#128C7E] font-medium">
                    Nom *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Votre nom"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Informations de contact */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#25D366]">Informations de contact</h3>
              </div>

              <div className="space-y-4">
                <EmailFieldPro
                  value={formData.email}
                  onChange={(value) => handleInputChange('email', value)}
                  placeholder="Votre adresse email *"
                  disabled={isLoading}
                />
                <PhoneFieldPro
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Sécurité */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#075E54] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#075E54]">Sécurité</h3>
              </div>

              <PasswordFieldPro
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                disabled={isLoading}
              />
            </div>

            {/* Affichage des erreurs */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Bouton de soumission */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                className="btn-whatsapp-primary"
                disabled={!isFormValid() || isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Création en cours...
                  </>
                ) : (
                  'Créer le Super Administrateur'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer avec branding */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <img
                src="/profile01.png"
                alt="Thierry Gogo"
                className="w-10 h-10 rounded-full border-2 border-[#128C7E]"
              />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Thierry Gogo</h4>
                <p className="text-xs text-gray-600">Développeur FullStack</p>
                <p className="text-xs text-gray-500">FREELANCE</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Whatsapp +225 0758966156 / 0103644527</p>
              <p className="text-xs text-gray-500">01 BP 5341 Abidjan 01</p>
            </div>
          </div>
        </div>
      </div>
    </WhatsAppModal>
  );
});

SuperAdminCreationModal.displayName = 'SuperAdminCreationModal';