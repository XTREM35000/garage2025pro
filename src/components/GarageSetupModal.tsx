import React, { useState, useEffect } from 'react';
import { WhatsAppModal } from '@/components/ui/whatsapp-modal';
import '../styles/whatsapp-theme.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import MiniStepProgress from '@/components/ui/MiniStepProgress';

// Props supprimées - maintenant gérées par le contexte

interface FormData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  description: string;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
}

const AFRICAN_COUNTRIES = [
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'ML', label: 'Mali' },
  { value: 'NG', label: 'Nigéria' },
  { value: 'TG', label: 'Togo' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'LB', label: 'Liban' },
  { value: 'DZ', label: 'Algérie' },
  { value: 'TN', label: 'Tunisie' },
  { value: 'MA', label: 'Maroc' },
  { value: 'CI', label: 'Côte d\'Ivoire' },
  { value: 'OTHER', label: 'Autre pays' }
] as const;

export const GarageSetupModal = () => {
  const { state, completeStep } = useWorkflow();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
    description: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Vérifier si c'est l'étape actuelle
  if (state.current_step !== 'garage') {
    return null;
  }

  // Pré-remplir avec les données existantes si disponibles
  useEffect(() => {
    if (state.stepData?.garage) {
      setFormData(prev => ({
        ...prev,
        ...state.stepData.garage
      }));
    }
  }, [state.stepData]);

  // Validation des champs
  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Le nom du garage est obligatoire';
        if (value.length < 3) return 'Le nom doit contenir au moins 3 caractères';
        break;

      case 'address':
        if (!value.trim()) return 'L\'adresse est obligatoire';
        if (value.length < 10) return 'L\'adresse doit contenir au moins 10 caractères';
        break;

      case 'city':
        if (!value.trim()) return 'La ville est obligatoire';
        if (value.length < 2) return 'La ville doit contenir au moins 2 caractères';
        break;

      case 'postalCode':
        if (!value.trim()) return 'Le code postal est obligatoire';
        if (!/^[0-9]{4}$/.test(value)) return 'Le code postal doit contenir 4 chiffres';
        break;

      case 'phone':
        if (value.trim()) {
          // Validation simplifiée : au moins 8 chiffres
          const cleanPhone = value.replace(/\D/g, '');
          if (cleanPhone.length < 8) return 'Format de téléphone invalide';
        }
        break;

      case 'email':
        if (value.trim()) {
          // Validation simplifiée : contient @ et un point après
          if (!value.includes('@') || !value.includes('.')) return 'Format d\'email invalide';
        }
        break;
    }
    return undefined;
  };

  // Validation complète du formulaire
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(formData).forEach((field) => {
      const error = validateField(field as keyof FormData, formData[field as keyof FormData]);
      if (error) {
        newErrors[field as keyof FormData] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Gestion des changements de champs
  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Valider le champ en temps réel
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Géolocalisation automatique
  const handleAutoLocate = async () => {
    setIsLocating(true);

    try {
      if (!navigator.geolocation) {
        toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setCoordinates({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      toast.success('Géolocalisation réussie !');
    } catch (error) {
      console.error('Erreur géolocalisation:', error);
      toast.error('Impossible de récupérer votre position. Veuillez la saisir manuellement.');
    } finally {
      setIsLocating(false);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsLoading(true);

    try {
      // Récupérer l'ID de l'organisation (via membership)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data: membership, error: membershipError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership?.organization_id) {
        console.error('Erreur récupération organisation:', membershipError);
        throw new Error("Organisation non trouvée pour l'utilisateur");
      }

      // Utiliser la RPC sécurisée pour créer le garage (gère RLS et validations côté SQL)
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_first_garage', {
        p_organization_id: membership.organization_id,
        p_name: formData.name,
        p_address: formData.address,
        p_city: formData.city,
        p_postal_code: formData.postalCode,
        p_country: formData.country,
        p_latitude: coordinates?.lat ?? null,
        p_longitude: coordinates?.lng ?? null,
        p_phone: formData.phone || null,
        p_email: formData.email || null,
      });

      if (rpcError) throw rpcError;

      const success = rpcData?.success === true;
      if (success) {
        // Afficher l'animation de succès
        setShowSuccess(true);

        // Attendre un peu pour l'animation
        setTimeout(async () => {
          try {
            await completeStep('garage');
            console.log('✅ GarageSetupModal: Étape complétée avec succès');
          } catch (stepError) {
            console.error('❌ GarageSetupModal: Erreur lors de la complétion de l\'étape:', stepError);
          }
        }, 2000);
      } else {
        throw new Error(rpcData?.error || 'Erreur lors de la création du garage');
      }

    } catch (error: any) {
      console.error('Erreur création garage:', error);
      toast.error(error.message || 'Erreur lors de la création du garage');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation de succès
  if (showSuccess) {
    return (
      <WhatsAppModal
        isOpen={true}
        onClose={() => { }}
        title="Garage créé ! 🎉"
        description={`${formData.name} est maintenant configuré`}
        headerLogo={<AnimatedLogo size={64} />}
      >
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-green-500 text-3xl">✅</div>
          </div>
          <h3 className="text-2xl font-bold text-[#128C7E] mb-4">Garage créé !</h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm text-orange-700">
              <p><strong>Adresse :</strong> {formData.address}</p>
              <p><strong>Ville :</strong> {formData.city} {formData.postalCode}</p>
              {coordinates && (
                <p><strong>Coordonnées :</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
              )}
            </div>
          </div>
          <div className="w-16 h-16 border-4 border-[#128C7E]/20 border-t-[#128C7E] rounded-full animate-spin mx-auto"></div>
        </div>
      </WhatsAppModal>
    );
  }

  return (
    <WhatsAppModal
      isOpen={isOpen}
      onClose={() => { }}
      title="Configuration du Premier Garage"
      description={`Configurez votre premier garage pour ${organizationName}`}
      headerLogo={<AnimatedLogo size={64} />}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <MiniStepProgress currentStep={state.current_step} completedSteps={state.completed_steps} />
        </div>
        <Card className="modal-whatsapp-card">
          <CardContent className="space-y-6 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de base */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.wrench className="w-5 h-5 text-[#128C7E]" />
                    <span>Informations de base</span>
                  </CardTitle>
                  <CardDescription>
                    Définissez le nom et la description de votre garage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du garage *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className={cn(
                        errors.name && "border-red-500 focus:border-red-500"
                      )}
                      placeholder="Ex: Garage Central, Auto Service Plus..."
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Décrivez votre garage, vos spécialités, vos services..."
                      maxLength={500}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formData.description.length}/500 caractères</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Adresse et localisation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.mapPin className="w-5 h-5 text-[#128C7E]" />
                    <span>Adresse et localisation</span>
                  </CardTitle>
                  <CardDescription>
                    Définissez l'emplacement de votre garage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse complète *</Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className={cn(
                        errors.address && "border-red-500 focus:border-red-500"
                      )}
                      placeholder="Ex: 123 Rue de la Paix, Zone Industrielle..."
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville *</Label>
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        className={cn(
                          errors.city && "border-red-500 focus:border-red-500"
                        )}
                        placeholder="Ex: Paris, Lyon, Marseille..."
                      />
                      {errors.city && (
                        <p className="text-sm text-red-500">{errors.city}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal *</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                        className={cn(
                          errors.postalCode && "border-red-500 focus:border-red-500"
                        )}
                        placeholder="5341"
                        maxLength={5}
                      />
                      {errors.postalCode && (
                        <p className="text-sm text-red-500">{errors.postalCode}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Pays</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => handleFieldChange('country', value)}
                      >
                        <SelectTrigger className="modal-whatsapp-input">
                          <SelectValue placeholder="Sélectionnez le pays" />
                        </SelectTrigger>
                        <SelectContent>
                          {AFRICAN_COUNTRIES.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Géolocalisation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Géolocalisation</h4>
                        <p className="text-sm text-blue-700">
                          Récupérez automatiquement les coordonnées GPS de votre garage
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAutoLocate}
                        disabled={isLocating}
                        variant="outline"
                        size="sm"
                        className="bg-white"
                      >
                        {isLocating ? (
                          <>
                            <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                            Localisation...
                          </>
                        ) : (
                          <>
                            <Icons.mapPin className="w-4 h-4 mr-2" />
                            Localiser
                          </>
                        )}
                      </Button>
                    </div>

                    {coordinates && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm font-mono text-blue-700">
                          Coordonnées GPS : {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact et informations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.phone className="w-5 h-5 text-[#128C7E]" />
                    <span>Contact et informations</span>
                  </CardTitle>
                  <CardDescription>
                    Renseignez les informations de contact de votre garage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className={cn(
                          errors.phone && "border-red-500 focus:border-red-500"
                        )}
                        placeholder="+33123456789 ou 0123456789"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className={cn(
                          errors.email && "border-red-500 focus:border-red-500"
                        )}
                        placeholder="contact@garage.com"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Site web (optionnel)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      placeholder="https://www.mon-garage.com"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Informations sur le garage */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Icons.info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900">
                        Premier garage de votre organisation
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• <strong>Configuration initiale</strong> : Ce garage servira de modèle pour les suivants</p>
                        <p>• <strong>Géolocalisation</strong> : Permet aux clients de vous trouver facilement</p>
                        <p>• <strong>Contact</strong> : Informations affichées aux clients</p>
                        <p>• <strong>Personnalisation</strong> : Vous pourrez modifier ces informations plus tard</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#128C7E] to-[#25D366] hover:from-[#075E54] hover:to-[#128C7E] px-8"
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Icons.wrench className="w-4 h-4 mr-2" />
                      Créer le Garage
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
                <p className="text-xs text-gray-600">Développeur FullStack (Frontend & Backend)</p>
                <p className="text-xs text-gray-500">FREELANCE</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Whatsapp +225 0758966156 / 0103644527</p>
              <p className="text-xs text-gray-500">01 BP 5341 Abidjan 01</p>
              <p className="text-xs text-gray-500">Cocody, RIVIERA 3</p>
            </div>
          </div>
        </div>
      </div>
    </WhatsAppModal>
  );
};

export default GarageSetupModal;
