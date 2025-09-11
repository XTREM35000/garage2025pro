import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflow } from '@/contexts/WorkflowProvider';

// Props supprimées - maintenant gérées par le contexte

const CompletionSummaryModal = () => {
  const { state } = useWorkflow();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    adminName: '',
    organisationName: '',
    garageName: '',
    plan: '',
  });

  // Vérifier si c'est l'étape actuelle
  if (state.currentStep !== 'completed') {
    return null;
  }

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load basic summary data
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();

        // Get organizations through direct query
        const { data: orgs } = await supabase
          .from('organisations')
          .select('name, subscription_type')
          .limit(1);

        const { data: garages } = await supabase
          .from('garages')
          .select('name')
          .limit(1);

        setSummary({
          adminName: profile?.name || 'Admin',
          organisationName: orgs?.[0]?.name || 'Organisation',
          garageName: garages?.[0]?.name || 'Garage',
          plan: orgs?.[0]?.subscription_type || 'free',
        });
      } catch (error) {
        console.error('Erreur chargement résumé:', error);
      }
    };

    loadSummary();
    // Timer pour la redirection vers le dashboard
    const timer = setTimeout(async () => {
      // Vérifier si l'utilisateur est connecté
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log('✅ Redirection vers dashboard avec utilisateur:', session.user.email);
        navigate('/dashboard');
      } else {
        console.log('❌ Pas de session - redirection vers auth');
        navigate('/auth');
      }
    }, 3000); // Réduire le délai pour un test plus rapide

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-950">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold">Configuration terminée !</h2>

          <div className="space-y-4 text-left">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="font-medium">Administrateur :</p>
              <p className="text-muted-foreground">{summary.adminName}</p>

              <p className="font-medium">Organisation :</p>
              <p className="text-muted-foreground">{summary.organisationName}</p>

              <p className="font-medium">Garage :</p>
              <p className="text-muted-foreground">{summary.garageName}</p>

              <p className="font-medium">Plan choisi :</p>
              <p className="text-muted-foreground capitalize">{summary.plan}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Redirection vers le dashboard dans quelques secondes...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionSummaryModal;