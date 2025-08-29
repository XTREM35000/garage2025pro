# Documentation Complète - Création Super Admin

## Vue d'ensemble du Système

Cette documentation décrit l'architecture complète pour la création d'un super administrateur dans notre application Supabase. Le système est composé de deux parties principales qui travaillent ensemble :

1. **Edge Function** : `create-super-admin-with-profile`
2. **Trigger PostgreSQL** : `handle_new_user()`

## Architecture

### Workflow de Création

```
Client Request → Edge Function → auth.users → Trigger → profiles + super_admins
     ↓                ↓              ↓           ↓            ↓
   Validation    Service Role    Métadonnées   Auto-exec   Propagation
```

### Interaction Edge Function ↔ Trigger

- **Edge Function** : Responsable de la création sécurisée de l'utilisateur avec métadonnées
- **Trigger** : Responsable de la propagation automatique des données vers `profiles` et `super_admins`

## 1. Edge Function : `create-super-admin-with-profile`

### Rôle
- Valider les données d'entrée
- Vérifier qu'aucun super admin n'existe déjà
- Créer l'utilisateur dans `auth.users` avec `SUPABASE_SERVICE_ROLE_KEY`
- Inclure les métadonnées nécessaires pour le trigger
- Logger toutes les étapes
- Retourner une réponse structurée

### Variables d'Environnement Utilisées
```
SUPABASE_URL                 : URL de votre projet Supabase
SUPABASE_SERVICE_ROLE_KEY   : Clé service_role pour les opérations admin
```

### Métadonnées Critiques
L'Edge Function inclut ces métadonnées dans `user_metadata` :
```json
{
  "firstName": "string",
  "lastName": "string", 
  "phone": "string (optionnel)",
  "avatarUrl": "string (optionnel)",
  "role": "superadmin"  // CRITIQUE pour le trigger
}
```

### Logs Générés
- ✅ Variables d'environnement
- ✅ Données reçues (sans mot de passe)
- ✅ Validation des données
- ✅ Vérification super admin existant
- ✅ Création utilisateur auth.users
- ✅ Vérification propagation (profiles + super_admins)

## 2. Trigger : `handle_new_user()`

### Rôle
- Se déclencher automatiquement à chaque insertion dans `auth.users`
- Extraire les métadonnées de l'utilisateur
- Créer automatiquement un enregistrement dans `profiles`
- Si `role = 'superadmin'`, créer aussi dans `super_admins`
- Logger toutes les opérations avec `RAISE NOTICE`

### Logique du Trigger

```sql
-- 1. Extraction des métadonnées
v_role := COALESCE(NEW.user_metadata->>'role', 'user');
v_first_name := NEW.user_metadata->>'firstName';
v_last_name := NEW.user_metadata->>'lastName';

-- 2. Création systématique du profil
INSERT INTO public.profiles (...)

-- 3. Création conditionnelle super admin
IF v_role = 'superadmin' THEN
  INSERT INTO public.super_admins (...)
END IF;
```

### Gestion d'Erreurs
- Les erreurs de création de profil ou super admin n'interrompent PAS la création de l'utilisateur
- Utilisation de blocs `BEGIN...EXCEPTION...END` pour chaque insertion
- Logging détaillé avec `RAISE NOTICE` pour débugger

### Logs Générés (PostgreSQL)
- 🔍 Début trigger avec user_id, email, role
- ✅ Succès création profile
- ✅ Succès création super admin (si applicable)
- ❌ Erreurs éventuelles (sans bloquer)
- 🔍 Fin trigger

## 3. Exemple d'Utilisation

### Appel avec curl
```bash
curl -X POST \
  https://metssugfqsnttghfrsxx.supabase.co/functions/v1/create-super-admin-with-profile \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "MotDePasseSecurise123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+33123456789",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

### Appel avec JavaScript
```javascript
const { data, error } = await supabase.functions.invoke(
  'create-super-admin-with-profile',
  {
    body: {
      email: 'admin@example.com',
      password: 'MotDePasseSecurise123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+33123456789',
      avatarUrl: 'https://example.com/avatar.jpg'
    }
  }
);
```

### Réponse Succès
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "admin@example.com",
      "role": "superadmin"
    },
    "profile": {
      "id": "uuid-here",
      "email": "admin@example.com",
      "full_name": "John Doe",
      "role": "superadmin"
    },
    "superAdmin": {
      "id": "uuid-here",
      "user_id": "uuid-here",
      "email": "admin@example.com",
      "nom": "Doe",
      "prenom": "John",
      "est_actif": true
    }
  },
  "message": "Super administrateur créé avec succès"
}
```

### Réponse Erreur
```json
{
  "error": {
    "message": "Un super administrateur existe déjà",
    "code": "super_admin_exists",
    "existingAdmin": {
      "id": "uuid-existing",
      "email": "existing@example.com"
    }
  }
}
```

## 4. Sécurité

### Validation Côté Edge Function
- ✅ Vérification données obligatoires (email, password, firstName, lastName)
- ✅ Vérification unicité super admin
- ✅ Utilisation `SUPABASE_SERVICE_ROLE_KEY` seulement

### Sécurité Base de Données
- ✅ Trigger avec `SECURITY DEFINER`
- ✅ RLS activé sur `profiles` et `super_admins`
- ✅ Gestion d'erreurs sans blocage

## 5. Debugging et Monitoring

### Logs Edge Function
Visibles dans les logs Supabase Edge Functions :
```
🚀 [Edge Function] create-super-admin-with-profile - Début
🔧 Variables d'environnement: { hasUrl: true, hasServiceKey: true }
📨 Données reçues: { email: "...", firstName: "...", hasPassword: true }
✅ Validation des données réussie
🔍 Vérification super admin existant...
✅ Aucun super admin existant, création possible
👤 Création utilisateur auth.users...
✅ Utilisateur créé avec succès: { userId: "...", email: "..." }
⏳ Attente trigger (1 seconde)...
🔍 Vérification création profil...
✅ Profil trouvé: { id: "...", role: "superadmin" }
🔍 Vérification création super_admin...
✅ Super admin trouvé: { id: "...", estActif: true }
🎉 Création super admin terminée avec succès
```

### Logs PostgreSQL
Visibles dans les logs PostgreSQL de Supabase :
```
NOTICE: [TRIGGER] handle_new_user - Début pour user_id: uuid, email: admin@..., role: superadmin
NOTICE: [TRIGGER] Profile créé avec succès pour user_id: uuid
NOTICE: [TRIGGER] Super admin créé avec succès pour user_id: uuid, email: admin@...
NOTICE: [TRIGGER] handle_new_user - Fin pour user_id: uuid
```

## 6. Maintenance

### Mise à Jour Edge Function
```bash
# Le déploiement est automatique via Lovable
# Pas d'action manuelle requise
```

### Mise à Jour Trigger
```sql
-- Exécuter via migration Supabase
-- Le trigger sera automatiquement mis à jour
```

### Nettoyage (si nécessaire)
```sql
-- Supprimer un super admin (ATTENTION: irréversible)
DELETE FROM public.super_admins WHERE email = 'admin@example.com';
DELETE FROM public.profiles WHERE email = 'admin@example.com';
-- L'utilisateur auth reste (nécessite admin Supabase)
```

## 7. Points d'Attention

### ⚠️ Contraintes
- **Un seul super admin autorisé** : La fonction vérifie l'unicité
- **Trigger obligatoire** : Sans le trigger, pas de propagation automatique
- **Métadonnées critiques** : Le `role: 'superadmin'` DOIT être présent
- **Variables d'env** : `SUPABASE_SERVICE_ROLE_KEY` obligatoire

### ✅ Avantages
- **Logging complet** : Débuggage facilité
- **Sécurité** : Validation et unicité garanties
- **Automatisation** : Propagation automatique via trigger
- **Résilience** : Erreurs non-bloquantes dans le trigger
- **Maintenabilité** : Code centralisé et documenté

## 8. Tests

### Test Création Réussie
1. S'assurer qu'aucun super admin n'existe
2. Appeler l'Edge Function avec données valides
3. Vérifier logs Edge Function
4. Vérifier logs PostgreSQL
5. Vérifier données dans `auth.users`, `profiles`, `super_admins`

### Test Échec (Super Admin Existant)
1. Créer un premier super admin
2. Tenter de créer un second
3. Vérifier réponse d'erreur appropriée
4. Vérifier que rien n'a été modifié

### Test Données Invalides
1. Appeler sans email/password
2. Vérifier validation côté Edge Function
3. Vérifier réponse d'erreur 400

---

**Cette architecture garantit une création sécurisée, tracée et fiable du super administrateur.**