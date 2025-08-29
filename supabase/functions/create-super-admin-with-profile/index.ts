import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 [Edge Function] create-super-admin-with-profile - Début');
    
    // Initialiser Supabase avec la clé de service
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Variables d\'environnement:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      url: supabaseUrl?.substring(0, 30) + '...'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement manquantes');
      return new Response(
        JSON.stringify({
          error: {
            message: 'Configuration serveur manquante',
            code: 'missing_env_vars'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les données du body
    const requestBody = await req.json();
    console.log('📨 Données reçues:', {
      email: requestBody.email,
      firstName: requestBody.firstName,
      lastName: requestBody.lastName,
      hasPassword: !!requestBody.password,
      phone: requestBody.phone || 'Non fourni',
      avatarUrl: requestBody.avatarUrl || 'Non fourni'
    });

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      avatarUrl 
    } = requestBody;

    // Validation des données obligatoires
    if (!email || !password || !firstName || !lastName) {
      console.error('❌ Données obligatoires manquantes:', {
        hasEmail: !!email,
        hasPassword: !!password,
        hasFirstName: !!firstName,
        hasLastName: !!lastName
      });
      
      return new Response(
        JSON.stringify({
          error: {
            message: 'Email, mot de passe, prénom et nom sont requis',
            code: 'missing_required_fields'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('✅ Validation des données réussie');

    // Vérifier si un super admin existe déjà
    console.log('🔍 Vérification super admin existant...');
    const { data: existingSuperAdmins, error: checkError } = await supabase
      .from('super_admins')
      .select('id, email, est_actif')
      .eq('est_actif', true);

    if (checkError) {
      console.error('❌ Erreur vérification super admin:', checkError);
      return new Response(
        JSON.stringify({
          error: {
            message: 'Erreur vérification super admin existant',
            code: 'check_error',
            details: checkError
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (existingSuperAdmins && existingSuperAdmins.length > 0) {
      console.log('⚠️ Super admin déjà existant:', existingSuperAdmins[0]);
      return new Response(
        JSON.stringify({
          error: {
            message: 'Un super administrateur existe déjà',
            code: 'super_admin_exists',
            existingAdmin: existingSuperAdmins[0]
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409
        }
      );
    }

    console.log('✅ Aucun super admin existant, création possible');

    // Créer l'utilisateur dans auth.users avec métadonnées
    console.log('👤 Création utilisateur auth.users...');
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        phone: phone || '',
        avatarUrl: avatarUrl || '',
        role: 'superadmin'  // CRITIQUE: trigger basé sur cette metadata
      }
    });

    if (authError) {
      console.error('❌ Erreur création auth.users:', {
        message: authError.message,
        status: authError.status,
        code: authError.code || 'auth_error'
      });
      
      return new Response(
        JSON.stringify({
          error: {
            message: authError.message,
            code: authError.code || 'auth_error',
            details: authError
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    if (!user) {
      console.error('❌ Utilisateur non créé (réponse vide)');
      return new Response(
        JSON.stringify({
          error: {
            message: 'Échec création utilisateur - réponse vide',
            code: 'user_creation_failed'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('✅ Utilisateur créé avec succès:', {
      userId: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at,
      metadata: user.user_metadata
    });

    // Attendre un court délai pour laisser le trigger s'exécuter
    console.log('⏳ Attente trigger (1 seconde)...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Vérifier que le profil a été créé par le trigger
    console.log('🔍 Vérification création profil...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('⚠️ Erreur récupération profil:', profileError);
    } else {
      console.log('✅ Profil trouvé:', {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name
      });
    }

    // Vérifier que l'entrée super_admins a été créée par le trigger
    console.log('🔍 Vérification création super_admin...');
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (superAdminError) {
      console.warn('⚠️ Erreur récupération super_admin:', superAdminError);
    } else {
      console.log('✅ Super admin trouvé:', {
        id: superAdmin.id,
        userId: superAdmin.user_id,
        email: superAdmin.email,
        nom: superAdmin.nom,
        prenom: superAdmin.prenom,
        estActif: superAdmin.est_actif
      });
    }

    // Réponse de succès
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: 'superadmin'
        },
        profile: profile || null,
        superAdmin: superAdmin || null
      },
      message: 'Super administrateur créé avec succès'
    };

    console.log('🎉 Création super admin terminée avec succès');
    console.log('📤 Réponse finale:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Erreur générale Edge Function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Erreur interne du serveur',
          code: 'unexpected_failure',
          details: error
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});