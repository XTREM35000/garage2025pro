import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemStatus {
  isEmpty: boolean;
  hasSuperAdmin: boolean;
  hasAdmins: boolean;
  hasTenants: boolean;
  hasOrganizations: boolean;
  hasGarages: boolean;
  currentStep: string;
}

export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus>({
    isEmpty: true,
    hasSuperAdmin: false,
    hasAdmins: false,
    hasTenants: false,
    hasOrganizations: false,
    hasGarages: false,
    currentStep: 'super_admin'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSystemStatus = async (): Promise<SystemStatus> => {
    try {
      console.log('🔍 Vérification du statut système...');
      
      const [
        superAdminResult,
        adminResult,
        organizationResult,
        garageResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('garages').select('id', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      const superAdminCount = superAdminResult.count || 0;
      const adminCount = adminResult.count || 0;
      const organizationCount = organizationResult.count || 0;
      const garageCount = garageResult.count || 0;

      const systemStatus: SystemStatus = {
        isEmpty: superAdminCount === 0,
        hasSuperAdmin: superAdminCount > 0,
        hasAdmins: adminCount > 0,
        hasTenants: adminCount > 0, // Un admin = un tenant potentiel
        hasOrganizations: organizationCount > 0,
        hasGarages: garageCount > 0,
        currentStep: determineCurrentStep(superAdminCount, adminCount, organizationCount, garageCount)
      };

      console.log('📊 Statut système:', systemStatus);
      return systemStatus;

    } catch (err) {
      console.error('❌ Erreur vérification statut système:', err);
      throw err;
    }
  };

  const determineCurrentStep = (
    superAdminCount: number,
    adminCount: number, 
    organizationCount: number,
    garageCount: number
  ): string => {
    if (superAdminCount === 0) return 'super_admin';
    if (adminCount === 0) return 'admin';
    if (organizationCount === 0) return 'organization';
    if (garageCount === 0) return 'garage';
    return 'completed';
  };

  const refreshStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const newStatus = await checkSystemStatus();
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  return {
    status,
    loading,
    error,
    refreshStatus
  };
};