import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Sparkles, AlertTriangle, Clock, Building, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { usePricing } from '@/hooks/usePricing';
import { useWorkflow } from '@/contexts/WorkflowProvider';
import { PlanDetails, PlanType } from '@/types/workflow.types';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  popular?: boolean;
  icon: React.ComponentType<any>;
  buttonColors: {
    bg: string;
    hover: string;
    text: string;
  };
  cardGradient: string;
}

export const PricingModal = () => {
  const { state, completeStep } = useWorkflow();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { pricing, loading: pricingLoading } = usePricing();

  // Vérifier si c'est l'étape actuelle
  if (state.current_step !== 'pricing') {
    return null;
  }

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Essai Gratuit',
      price: '0',
      period: '7 jours',
      description: 'Découvrez notre solution sans engagement',
      icon: Star,
      buttonColors: {
        bg: 'bg-green-500',
        hover: 'hover:bg-green-700',
        text: 'text-white'
      },
      cardGradient: 'from-green-50 to-emerald-100',
      features: [
        '1 Organisation incluse',
        '1 Garage (instance)',
        'Jusqu\'à 5 collaborateurs',
        'Gestion et opérations mécaniques de base',
        'Support email'
      ],
      limitations: [
        'Durée limitée à 7 jours',
        'Fonctionnalités avancées désactivées',
        'Redirection vers abonnement payant après expiration'
      ]
    },
    {
      id: 'monthly',
      name: 'Mensuel',
      price: pricing ? pricing.pricing_month.toLocaleString() : '25 000',
      period: 'par mois',
      description: 'Idéal pour croître votre activité',
      icon: Zap,
      buttonColors: {
        bg: 'bg-orange-500',
        hover: 'hover:bg-orange-700',
        text: 'text-white'
      },
      cardGradient: 'from-orange-50 to-amber-100',
      popular: true,
      features: [
        '1 Organisation',
        'Switch entre instances de garage',
        '3 instances maximum (garage/lavage-auto/buvette)',
        'Jusqu\'à 20 collaborateurs',
        'Toutes les fonctionnalités incluses',
        'Support prioritaire WhatsApp',
        'Sauvegardes automatiques',
        'Rapports détaillés mensuels'
      ],
      limitations: [
        'Limité à 1 organisation',
        'Maximum 3 instances simultanées'
      ]
    },
    {
      id: 'annual',
      name: 'Annuel',
      price: pricing ? pricing.pricing_year.toLocaleString() : '250 000',
      period: 'par an',
      description: 'Solution complète pour entreprises établies',
      icon: Crown,
      buttonColors: {
        bg: 'bg-blue-500',
        hover: 'hover:bg-blue-700',
        text: 'text-white'
      },
      cardGradient: 'from-blue-50 to-indigo-100',
      features: [
        '5 Organisations incluses',
        'Multi-switch entre instances',
        'Instances illimitées',
        'Collaborateurs illimités',
        'Tous types d\'activités supportés',
        'Fonctionnalités premium avancées',
        'Support premium 24/7',
        'Formation personnalisée incluse',
        'API d\'intégration complète',
        'Analytiques et rapports avancés'
      ],
      limitations: [
        'Engagement annuel requis'
      ]
    },
    {
      id: 'license',
      name: 'Licence SaaS',
      price: '1 000 000',
      period: 'perpetuelle',
      description: 'Solution complète pour revendeurs et entrepreneurs',
      icon: Building,
      buttonColors: {
        bg: 'bg-purple-500',
        hover: 'hover:bg-purple-700',
        text: 'text-white'
      },
      cardGradient: 'from-purple-50 to-violet-100',
      features: [
        'Propriété complète du code source',
        'Accès total aux backends et frontends',
        'Droit de revendre sous votre marque',
        'Droit de modification illimité',
        'Documentation technique complète',
        'Transfert de propriété intellectuelle',
        '1 an de support technique inclus',
        'Formation pour votre équipe'
      ],
      limitations: [
        'Paiement unique et forfaitaire',
        'Non-remboursable'
      ]
    }
  ];

  const handlePlanSelect = async (plan: PricingPlan) => {
    try {
      setSelectedPlan(plan.id);
      setIsLoading(true);

      const planDetails: PlanDetails = {
        id: plan.id as PlanType,
        name: plan.name,
        price: plan.price,
        period: plan.period,
        description: plan.description,
        features: plan.features,
        limitations: plan.limitations,
        type: plan.id as PlanType,
        selected_at: new Date().toISOString()
      };

      await completeStep('pricing');
      toast.success(`Plan ${plan.name} sélectionné avec succès!`);
      console.log('✅ PricingModal: Étape complétée avec succès');

    } catch (error: any) {
      console.error('❌ Erreur sélection plan:', error);
      toast.error(error.message || 'Erreur lors de la sélection du plan');
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 border-blue-200 dark:border-blue-700">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            Choisissez votre formule d'abonnement
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300 mt-2 text-lg">
            Une solution adaptée à chaque taille d'entreprise
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {plans.map((plan) => {
            const PlanIcon = plan.icon;
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 cursor-pointer border-2 bg-gradient-to-br ${plan.cardGradient} ${isSelected
                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-500 ring-opacity-50 scale-105'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                  } ${plan.popular ? 'lg:scale-105 lg:z-10' : ''}`}
                onClick={() => handlePlanSelect(plan)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    <Star className="w-3 h-3 mr-1" />
                    Le plus populaire
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 w-12 h-12 ${plan.buttonColors.bg} rounded-full flex items-center justify-center shadow-lg`}>
                    <PlanIcon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    {plan.name}
                  </CardTitle>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                        {plan.price === '0' ? 'Gratuit' : `${plan.price} FCFA`}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {plan.period !== 'perpetuelle' ? `/${plan.period}` : ''}
                      </span>
                    </div>
                    {plan.id === 'annual' && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Économisez 17% vs le mensuel
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">
                      Fonctionnalités incluses :
                    </h4>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2 border-b pb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Limitations :
                      </h4>
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-amber-700 dark:text-amber-300">
                            {limitation}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className={`w-full transition-all duration-300 font-semibold py-3 rounded-lg ${plan.buttonColors.bg} ${plan.buttonColors.hover} ${plan.buttonColors.text} shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isLoading}
                  >
                    {isLoading && isSelected ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Traitement...
                      </div>
                    ) : isSelected ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Sélectionné
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {plan.id === 'free' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Essayer gratuitement
                          </>
                        ) : plan.id === 'license' ? (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Acheter la licence
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Souscrire
                          </>
                        )}
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-lg">
                Avantages inclus dans tous les plans
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
                <div>
                  <p className="mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Activation immédiate</strong>
                  </p>
                  <p className="mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Sécurité des données garantie</strong>
                  </p>
                  <p className="mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Mises à jour incluses</strong>
                  </p>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Support technique</strong>
                  </p>
                  <p className="mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Migration facilitée</strong>
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Satisfaction garantie</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;