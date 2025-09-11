import React, { useState, useEffect } from 'react';
import { WhatsAppModal } from '@/components/ui/whatsapp-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AvatarUpload from '@/components/ui/avatar-upload';
import { generateSlug, isValidSlug } from '@/utils/slugGenerator';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import '../styles/whatsapp-theme.css';
import MiniStepProgress from '@/components/ui/MiniStepProgress';


// Ajoutez ces imports en haut du fichier
import { CopyIcon } from 'lucide-react';
// Props supprimées - maintenant gérées par le contexte

// Ajoutez cette fonction dans le composant
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier ! 📋');
  } catch (err) {
    console.error('Erreur lors de la copie:', err);
    toast.error('Erreur lors de la copie');
  }
};

interface FormData {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
}

export const OrganizationSetupModal = () => {
  const { state, completeStep } = useWorkflow();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [generatedSlug, setGeneratedSlug] = useState<string>('');
  const [generatedSubdomain, setGeneratedSubdomain] = useState<string>('');
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si c'est l'étape actuelle
  if (state.current_step !== 'organization') {
    return null;
  }

  // Pré-remplir avec les données existantes si disponibles
  useEffect(() => {
    if (state.stepData?.organization) {
      setFormData(prev => ({
        ...prev,
        ...state.stepData.organization
      }));
    }
  }, [state.stepData]);

  // Event listeners pour les pictos de test
  useEffect(() => {
    const handleFillFormError = () => {
      setFormData({
        name: 'A',
        description: 'B',
        address: 'C',
        city: 'D',
        country: 'France',
        phone: '123',
        email: 'invalid',
        website: 'invalid-url',
        logoUrl: ''
      });
    };

    const handleFillFormSuccess = () => {
      setFormData({
        name: 'Garage Excellence Network',
        description: 'Réseau de garages automobiles spécialisés dans la mécanique de pointe et la carrosserie',
        address: '456 Boulevard Haussmann',
        city: 'Paris',
        country: 'France',
        phone: '+33 1 42 68 90 12',
        email: 'contact@garageexcellence.fr',
        website: 'https://garageexcellence.fr',
        logoUrl: ''
      });
    };

    window.addEventListener('fillFormError', handleFillFormError);
    window.addEventListener('fillFormSuccess', handleFillFormSuccess);

    return () => {
      window.removeEventListener('fillFormError', handleFillFormError);
      window.removeEventListener('fillFormSuccess', handleFillFormSuccess);
    };
  }, []);

  // Générer le slug, sous-domaine et email d'entreprise
  useEffect(() => {
    if (formData.name && formData.name.length >= 5) {
      const baseSlug = generateSlug(formData.name) + "-2025";
      // const baseSlug = generateSlug(formData.name);

      // Ajouter un timestamp pour l'unicité
      const timestamp = Date.now().toString(36).slice(-4);
      const finalSlug = `${baseSlug}-${timestamp}`;

      setGeneratedSlug(finalSlug);
      setGeneratedSubdomain(`${finalSlug}.com`);
      setGeneratedEmail(`contact@${finalSlug}.com`);

      console.log('🏷️ Slug généré:', finalSlug);
    } else {
      setGeneratedSlug('');
      setGeneratedSubdomain('');
      setGeneratedEmail('');
    }
  }, [formData.name]);

  const handleLogoChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, logoUrl: result }));
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const validateField = (field: string, value: string): { isValid: boolean; error?: string } => {
    switch (field) {
      case 'name':
        if (!value.trim()) return { isValid: false, error: 'Le nom de l\'organisation est requis' };
        if (value.length < 3) return { isValid: false, error: 'Le nom doit contenir au moins 3 caractères' };
        break;
      case 'description':
        if (!value.trim()) return { isValid: false, error: 'La description est requise' };
        if (value.length < 10) return { isValid: false, error: 'La description doit contenir au moins 10 caractères' };
        break;
      case 'address':
        if (!value.trim()) return { isValid: false, error: 'L\'adresse est requise' };
        break;
      case 'city':
        if (!value.trim()) return { isValid: false, error: 'La ville est requise' };
        break;
      case 'country':
        if (!value.trim()) return { isValid: false, error: 'Le pays est requis' };
        break;
      case 'phone':
        if (!value.trim()) return { isValid: false, error: 'Le téléphone est requis' };
        break;
      case 'email':
        if (!value.trim()) return { isValid: false, error: 'L\'email est requis' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { isValid: false, error: 'Format d\'email invalide' };
        break;
    }
    return { isValid: true };
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === 'name') {
      // Nettoyer la valeur : pas d'espaces, que des caractères valides pour un slug
      const cleanedValue = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '') // Garder seulement lettres, chiffres, tirets
        .replace(/-+/g, '-') // Éviter les tirets multiples
        .replace(/^-|-$/g, ''); // Enlever les tirets en début/fin

      setFormData(prev => ({ ...prev, [field]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;

    // Gestion des erreurs Supabase
    if (error?.code === '23505') {
      if (error.message.includes('slug')) {
        return 'Ce nom d\'organisation est déjà utilisé. Veuillez choisir un autre nom.';
      }
      if (error.message.includes('email')) {
        return 'Cette adresse email est déjà utilisée par une autre organisation.';
      }
      if (error.message.includes('phone')) {
        return 'Ce numéro de téléphone est déjà utilisé par une autre organisation.';
      }
      return 'Une donnée similaire existe déjà dans le système.';
    }

    if (error?.code === '23503') {
      return 'Impossible de créer l\'organisation : données de référence manquantes.';
    }

    if (error?.code === '42501') {
      return 'Permission refusée. Contactez votre administrateur système.';
    }

    if (error?.code === '23514') {
      return 'Les données fournies ne respectent pas les contraintes de validation.';
    }

    if (error?.code === '42P01') {
      return 'Erreur de configuration de la base de données.';
    }

    if (error?.code === '08000') {
      return 'Erreur de connexion à la base de données.';
    }

    if (error?.code === '57014') {
      return 'Opération annulée par l\'utilisateur.';
    }

    // Erreurs HTTP
    if (error?.status === 400) {
      return 'Requête invalide. Vérifiez les données saisies.';
    }

    if (error?.status === 401) {
      return 'Non autorisé. Veuillez vous reconnecter.';
    }

    if (error?.status === 403) {
      return 'Accès interdit. Permissions insuffisantes.';
    }

    if (error?.status === 404) {
      return 'Service non trouvé. Contactez le support.';
    }

    if (error?.status === 500) {
      return 'Erreur serveur interne. Réessayez plus tard.';
    }

    if (error?.status === 503) {
      return 'Service temporairement indisponible.';
    }

    // Erreurs réseau
    if (error?.message?.includes('fetch')) {
      return 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
    }

    if (error?.message?.includes('timeout')) {
      return 'Délai d\'attente dépassé. Réessayez.';
    }

    // Erreurs de validation
    if (error?.message?.includes('validation')) {
      return 'Données invalides. Vérifiez les informations saisies.';
    }

    // Erreur par défaut
    return error?.message || 'Une erreur inattendue s\'est produite. Contactez le support.';
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // 1. Création de l'organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone,
          email: formData.email,
          website: formData.website || null,
          logo_url: formData.logoUrl || null,
          plan_type: selectedPlan || 'starter',
          slug: generatedSlug,
          subdomain: generatedSubdomain,
          company_email: generatedEmail,
          status: 'active'
        })
        .select()
        .single();

      if (orgError) throw orgError;

      console.log('✅ Organisation créée avec succès:', orgData);

      // 2. Utiliser la nouvelle architecture
      try {
        await completeStep('organization');
        console.log('✅ OrganizationSetupModal: Étape complétée avec succès');
      } catch (stepError) {
        console.error('❌ OrganizationSetupModal: Erreur lors de la complétion de l\'étape:', stepError);
        toast.error('Erreur lors de la sauvegarde de l\'organisation');
      }

    } catch (error) {
      console.error('❌ Erreur création:', error);
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
          <h3 className="text-2xl font-bold text-[#128C7E] mb-4">Organisation créée !</h3>
          <p className="text-gray-600 mb-6">
            Félicitations ! Votre organisation a été créée avec succès.
          </p>

          {/* Informations générées */}
          <div className="bg-[#128C7E]/5 border border-[#128C7E]/20 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-[#128C7E] mb-3">Informations générées :</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Slug :</strong> <code className="bg-white px-2 py-1 rounded">{generatedSlug}</code></p>
              <p><strong>Sous-domaine :</strong> <code className="bg-white px-2 py-1 rounded">{generatedSubdomain}</code></p>
              <p><strong>Email entreprise :</strong> <code className="bg-white px-2 py-1 rounded">{generatedEmail}</code></p>
            </div>
          </div>

          <div className="w-16 h-16 border-4 border-[#128C7E]/20 border-t-[#128C7E] rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-sm text-gray-500">Redirection automatique vers la prochaine étape...</p>
        </div>
      </WhatsAppModal>
    );
  }

  return (
    <WhatsAppModal isOpen={isOpen} onClose={() => { }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <MiniStepProgress currentStep={state.current_step} completedSteps={state.completed_steps} />
        </div>
        {/* Utilisation du composant AvatarUpload réutilisable */}
        <AvatarUpload
          avatarPreview={logoPreview}
          onAvatarChange={handleLogoChange}
          role="Organisation"
          roleColor="bronze"
          title="Création de l'Organisation"
          subtitle="Configurez votre organisation et ses informations"
        />

        <Card className="modal-whatsapp-card">
          <CardContent className="space-y-6 p-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#128C7E] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#128C7E]">Informations de base</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#128C7E] font-medium">
                  Nom de l'organisation *
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500 text-sm">ORG-</span>
                  </div>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="modal-whatsapp-input pl-12" // Ajoutez du padding à gauche
                    placeholder="votre-organisation"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Le nom complet sera: <strong>ORG-{formData.name || 'votre-organisation'}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-[#128C7E] font-medium">Site web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="modal-whatsapp-input"
                  placeholder="https://votre-site.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#128C7E] font-medium">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="modal-whatsapp-input"
                placeholder="Décrivez votre organisation et ses activités"
                rows={3}
              />
            </div>


            {/* Adresse */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#25D366]">Adresse</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[#25D366] font-medium">Adresse complète *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Rue, numéro, complément"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-[#25D366] font-medium">Ville *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="modal-whatsapp-input"
                      placeholder="Votre ville"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-[#25D366] font-medium">Pays *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="modal-whatsapp-input"
                      placeholder="Votre pays"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-[#075E54] rounded-full"></div>
                <h3 className="text-lg font-semibold text-[#075E54]">Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#075E54] font-medium">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Numéro de téléphone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#075E54] font-medium">Email *</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="modal-whatsapp-input"
                    placeholder="Email de contact"
                  />
                </div>
              </div>
            </div>

            {/* Informations générées */}
            {generatedSlug && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-[#8B5CF6] rounded-full"></div>
                  <h3 className="text-lg font-semibold text-[#8B5CF6]">Informations générées automatiquement</h3>
                </div>

                <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Slug avec icône copier */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-[#8B5CF6]">Slug</p>
                        <button
                          onClick={() => copyToClipboard(generatedSlug)}
                          className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                          title="Copier le slug"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="bg-white px-2 py-1 rounded text-xs block truncate">{generatedSlug}</code>
                    </div>

                    {/* Sous-domaine avec icône copier */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-[#8B5CF6]">Sous-domaine</p>
                        <button
                          onClick={() => copyToClipboard(generatedSubdomain)}
                          className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                          title="Copier le sous-domaine"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="bg-white px-2 py-1 rounded text-xs block truncate">{generatedSubdomain}</code>
                    </div>

                    {/* Email avec icône copier */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-[#8B5CF6]">Email entreprise</p>
                        <button
                          onClick={() => copyToClipboard(generatedEmail)}
                          className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                          title="Copier l'email"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="bg-white px-2 py-1 rounded text-xs block truncate">{generatedEmail}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton de soumission */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                className="btn-whatsapp-primary"
                disabled={!formData.name || !formData.description || !formData.address ||
                  !formData.city || !formData.country || !formData.phone ||
                  !formData.email || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Création en cours...
                  </>
                ) : (
                  'Créer l\'Organisation'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </WhatsAppModal >
  );
};

export default OrganizationSetupModal;
