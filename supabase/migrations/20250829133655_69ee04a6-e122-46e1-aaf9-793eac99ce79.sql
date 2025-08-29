-- Amélioration du trigger handle_new_user pour meilleurs logs et gestion des erreurs

-- Supprimer l'ancien trigger et fonction
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Créer la fonction améliorée avec logs détaillés
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_phone text;
  v_avatar_url text;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extraire les métadonnées
  v_role := COALESCE(NEW.user_metadata->>'role', 'user');
  v_first_name := NEW.user_metadata->>'firstName';
  v_last_name := NEW.user_metadata->>'lastName';
  v_full_name := CONCAT_WS(' ', v_first_name, v_last_name);
  v_phone := NEW.user_metadata->>'phone';
  v_avatar_url := NEW.user_metadata->>'avatarUrl';

  -- Log de début
  RAISE NOTICE '[TRIGGER] handle_new_user - Début pour user_id: %, email: %, role: %', 
    NEW.id, NEW.email, v_role;

  -- 1. Créer le profil automatiquement
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      id,
      email,
      full_name,
      first_name,
      last_name,
      phone,
      role,
      avatar_url,
      status
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      v_full_name,
      v_first_name,
      v_last_name,
      v_phone,
      v_role,
      v_avatar_url,
      true
    );
    
    RAISE NOTICE '[TRIGGER] Profile créé avec succès pour user_id: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[TRIGGER] Erreur création profile pour user_id: % - %', NEW.id, SQLERRM;
    -- Ne pas bloquer la création de l'utilisateur
  END;

  -- 2. Si role = superadmin, créer l'entrée dans super_admins
  IF v_role = 'superadmin' THEN
    BEGIN
      INSERT INTO public.super_admins (
        user_id,
        id,
        email,
        nom,
        prenom,
        phone,
        est_actif,
        role,
        pricing_plan,
        trial_started_at,
        trial_ends_at,
        trial_consumed
      )
      VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        v_last_name,
        v_first_name,
        v_phone,
        true,
        'superadmin',
        'free',
        NOW(),
        NOW() + INTERVAL '7 days',
        false
      );
      
      RAISE NOTICE '[TRIGGER] Super admin créé avec succès pour user_id: %, email: %', 
        NEW.id, NEW.email;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[TRIGGER] Erreur création super_admin pour user_id: % - %', NEW.id, SQLERRM;
      -- Ne pas bloquer la création de l'utilisateur
    END;
  END IF;

  RAISE NOTICE '[TRIGGER] handle_new_user - Fin pour user_id: %', NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissions pour la fonction
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

RAISE NOTICE 'Trigger handle_new_user mis à jour avec logs améliorés';