# Guide Complet : Création Super Admin avec Edge Function et Trigger

## Vue d'ensemble

Ce système permet de créer un super-administrateur de manière sécurisée en utilisant :
- **Edge Function** : `create-super-admin-with-profile` pour la création utilisateur
- **Trigger SQL** : `handle_new_user()` pour la propagation automatique des données

## Architecture

### 1. Edge Function : `create-super-admin-with-profile`

**Rôle** : Point d'entrée sécurisé pour créer un super-admin
**Localisation** : `supabase/functions/create-super-admin-with-profile/index.ts`

#### Fonctionnalités :
- ✅ Validation des données d'entrée
- ✅ Vérification qu'aucun super admin n'existe déjà
- ✅ Création utilisateur via `supabase.auth.admin.createUser()`
- ✅ Utilisation des métadonnées pour déclencher le trigger
- ✅ Logs détaillés pour le debugging
- ✅ Gestion d'erreurs complète

#### Variables d'environnement requises :
```
SUPABASE_URL=https://metssugfqsnttghfrsxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Trigger SQL : `handle_new_user()`

**Rôle** : Propagation automatique des données utilisateur
**Déclencheur** : AFTER INSERT sur `auth.users`

#### Fonctionnalités :
- ✅ Création automatique du profil dans `public.profiles`
- ✅ Création automatique dans `super_admins` si `role=superadmin`
- ✅ Logs SQL avec `RAISE NOTICE` pour le debugging
- ✅ Gestion d'erreurs sans blocage

## Utilisation

### Appel via JavaScript/TypeScript
```typescript
import { supabase } from '@/integrations/supabase/client';

const createSuperAdmin = async () => {
  const { data, error } = await supabase.functions.invoke(
    'create-super-admin-with-profile',
    {
      body: {
        email: 'superadmin@example.com',
        password: 'MotDePasseSecurise123!',
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+33123456789',
        avatarUrl: 'https://example.com/avatar.png'
      }
    }
  );

  if (error) {
    console.error('Erreur création super admin:', error);
    return;
  }

  console.log('Super admin créé:', data);
};
```

## Réponses

### Succès (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "superadmin@example.com",
      "role": "superadmin"
    },
    "profile": {
      "id": "uuid-here",
      "email": "superadmin@example.com",
      "full_name": "Super Admin",
      "role": "superadmin"
    },
    "superAdmin": {
      "id": "uuid-here",
      "user_id": "uuid-here",
      "email": "superadmin@example.com",
      "nom": "Admin",
      "prenom": "Super",
      "est_actif": true
    }
  },
  "message": "Super administrateur créé avec succès"
}
```

### Erreur - Super admin existant (409)
```json
{
  "error": {
    "message": "Un super administrateur existe déjà",
    "code": "super_admin_exists"
  }
}
```

## Debugging et Logs

### Logs Edge Function
Les logs de l'Edge Function sont visibles dans :
- Console Supabase Dashboard
- Logs en temps réel pendant l'exécution

### Logs Trigger SQL
Les logs du trigger sont visibles dans :
- Logs PostgreSQL de Supabase
- Messages `RAISE NOTICE` dans les analytics

## Points Importants

1. **Une seule exécution** : Le système empêche la création de plusieurs super admins
2. **Cohérence des données** : Le trigger garantit la synchronisation
3. **Logs complets** : Debugging facilité par les logs détaillés
4. **Sécurité** : Utilisation des bonnes pratiques Supabase
5. **Maintenabilité** : Code clair et documenté