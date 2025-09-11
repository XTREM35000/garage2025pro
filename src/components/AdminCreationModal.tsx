import React, { useState, useEffect } from 'react';
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
import { useWorkflow } from '@/contexts/WorkflowProvider';
import '../styles/whatsapp-theme.css';
import MiniStepProgress from '@/components/ui/MiniStepProgress';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
}

export const AdminCreationModal = () => {
  const { state, completeStep } = useWorkflow();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    avatarUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si c'est l'étape actuelle
  if (state.current_step !== 'admin') {
    return null;
  }

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
  };

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;

    // Erreurs spécifiques de l'API
    if (error?.message?.includes('User already registered')) {
      return 'Cet email est déjà utilisé.';
    }
    if (error?.message?.includes('already exists')) {
      return 'Cet email ou numéro de téléphone est déjà utilisé.';
    }
    if (error?.message?.includes('Format d\'email invalide')) {
      return 'Format d\'email invalide.';
    }

    // Erreurs HTTP
    if (error?.status === 400) {
      return 'Données invalides. Vérifiez les informations saisies.';
    }
    if (error?.status === 401) {
      return 'Non autorisé. Veuillez vous reconnecter.';
    }
    if (error?.status === 500) {
      return 'Erreur serveur interne. Réessayez plus tard.';
    }

    // Erreurs réseau
    if (error?.message?.includes('fetch')) {
      return 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
    }

    return error?.message || 'Une erreur inattendue s\'est produite. Contactez le support.';
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Validation basique
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password) {
        throw new Error("Tous les champs obligatoires doivent être remplis");
      }

      if (formData.password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères");
      }

      console.log('🔄 Création Admin via Edge Function...', {
        ...formData,
        password: '********' // Masquer le mot de passe dans les logs
      });

      // Appel de la fonction Edge
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-admin-with-profile`,
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
            avatarUrl: formData.avatarUrl || null
          })
        }
      );

      // Vérification de la réponse
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Admin créé avec succès:', data);

      // Vérification du succès
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur inconnue lors de la création');
      }

      // Afficher le succès et continuer
      setShowSuccess(true);
      toast.success(`Administrateur ${formData.firstName} créé avec succès ! 🎉`);

      // Délai avant fermeture
      setTimeout(async () => {
        try {
          await completeStep('admin');
          console.log('✅ AdminCreationModal: Étape complétée avec succès');
        } catch (stepError) {
          console.error('❌ AdminCreationModal: Erreur lors de la complétion de l\'étape:', stepError);
        }
      }, 2000);

    } catch (error: any) {
      console.error('❌ Erreur création admin:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <WhatsAppModal isOpen={true} onClose={() => { }}>
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-green-500 text-3xl">✅</div>
          </div>
          <h3 className="text-2xl font-bold text-[#128C7E] mb-4">Administrateur créé !</h3>
          <p className="text-gray-600 mb-6">
            Félicitations ! Votre administrateur a été créé avec succès.
          </p>
          <div className="w-16 h-16 border-4 border-[#128C7E]/20 border-t-[#128C7E] rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-sm text-gray-500 mb-4">Redirection automatique...</p>
        </div>
      </WhatsAppModal>
    );
  }

  const isFormValid = () => {
    return formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.password &&
      formData.password.length >= 6;
  };

  return (
    <WhatsAppModal isOpen={true} onClose={() => {}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <MiniStepProgress currentStep={state.current_step} completedSteps={state.completed_steps} />
        </div>
        <AvatarUpload
          avatarPreview={avatarPreview}
          onAvatarChange={handleAvatarChange}
          role="Administrateur"
          roleColor="silver"
          title="Création d'un Administrateur"
          subtitle="Configurez un administrateur pour votre organisation"
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
                  <Label htmlFor="firstName" className="text-[#128C7E] font-medium">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Prénom"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[#128C7E] font-medium">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Nom"
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
                  placeholder="Adresse email *"
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
                  'Créer l\'Administrateur'
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
};

export default AdminCreationModal;