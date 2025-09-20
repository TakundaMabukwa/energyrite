import { createClient } from './client';

export interface CostCenterData {
  id: number;
  created_at: string;
  cost_code: string;
  company: string;
  branch: string;
  sub_branch?: string;
  cost_codes?: string;
  new_account_number?: string;
  parent_cost_code?: string;
}

export interface HierarchicalCostCenter {
  id: string;
  name: string;
  costCode: string;
  company: string;
  branch: string;
  subBranch?: string;
  parentId?: string;
  level: number;
  path: string;
  children?: HierarchicalCostCenter[];
  hasChildren: boolean;
  newAccountNumber?: string;
}

export class CostCenterService {
  private supabase = createClient();

  async fetchAllCostCenters(): Promise<HierarchicalCostCenter[]> {
    try {
      console.log('🚀 Starting to fetch cost centers from Supabase...');
      console.log('🔧 Environment check:');
      console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
      console.log('   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ? '✅ Set' : '❌ Missing');

      // Always try to fetch from Supabase first
      const [costCenters, level3, level4, level5] = await Promise.all([
        this.fetchCostCenters(),
        this.fetchLevel3CostCenters(),
        this.fetchLevel4CostCenters(),
        this.fetchLevel5CostCenters()
      ]);

      // Combine all data
      const allCostCenters = [
        ...costCenters.map(item => ({ ...item, level: 1 })),
        ...level3.map(item => ({ ...item, level: 3 })),
        ...level4.map(item => ({ ...item, level: 4 })),
        ...level5.map(item => ({ ...item, level: 5 }))
      ];

      console.log('🔄 Combined all cost centers data:', allCostCenters);
      console.log('📈 Total cost centers fetched from Supabase:', allCostCenters.length);

      // Build hierarchical structure
      const hierarchicalData = this.buildHierarchy(allCostCenters);
      console.log('🌳 Final hierarchical structure from Supabase:', hierarchicalData);

      return hierarchicalData;
    } catch (error) {
      console.error('❌ Error fetching cost centers from Supabase:', error);
      console.log('🔄 Attempting to fetch from Energy Rite API as fallback...');
      
      // Fallback: Try to get company/branch data from Energy Rite API
      try {
        const apiData = await this.fetchFromEnergyRiteAPI();
        console.log('✅ Successfully fetched data from Energy Rite API:', apiData);
        return apiData;
      } catch (apiError) {
        console.error('❌ Error fetching from Energy Rite API:', apiError);
        console.warn('⚠️ No data available from either Supabase or API');
        return [];
      }
    }
  }

  private async fetchCostCenters(): Promise<CostCenterData[]> {
    const { data, error } = await this.supabase
      .from('cost_centers')
      .select('*')
      .order('cost_code');

    if (error) {
      console.error('Error fetching cost_centers:', error);
      return [];
    }

    console.log('📊 Fetched cost_centers data:', data);
    return data || [];
  }

  private async fetchLevel3CostCenters(): Promise<CostCenterData[]> {
    const { data, error } = await this.supabase
      .from('level_3_cost_centers')
      .select('*')
      .order('cost_code');

    if (error) {
      console.error('Error fetching level_3_cost_centers:', error);
      return [];
    }

    console.log('📊 Fetched level_3_cost_centers data:', data);
    return data || [];
  }

  private async fetchLevel4CostCenters(): Promise<CostCenterData[]> {
    const { data, error } = await this.supabase
      .from('level_4_cost_centers')
      .select('*')
      .order('cost_code');

    if (error) {
      console.error('Error fetching level_4_cost_centers:', error);
      return [];
    }

    console.log('📊 Fetched level_4_cost_centers data:', data);
    return data || [];
  }

  private async fetchLevel5CostCenters(): Promise<CostCenterData[]> {
    const { data, error } = await this.supabase
      .from('level_5_cost_centers')
      .select('*')
      .order('cost_code');

    if (error) {
      console.error('Error fetching level_5_cost_centers:', error);
      return [];
    }

    console.log('📊 Fetched level_5_cost_centers data:', data);
    return data || [];
  }

  private buildHierarchy(allCostCenters: (CostCenterData & { level: number })[]): HierarchicalCostCenter[] {
    // Create a map for quick lookup
    const costCenterMap = new Map<string, HierarchicalCostCenter>();
    const rootCostCenters: HierarchicalCostCenter[] = [];

    // First pass: create all cost center objects
    allCostCenters.forEach(item => {
      const hierarchicalItem: HierarchicalCostCenter = {
        id: `${item.level}-${item.id}`,
        name: this.generateName(item),
        costCode: item.cost_code,
        company: item.company,
        branch: item.branch,
        subBranch: item.sub_branch,
        parentId: item.parent_cost_code,
        level: item.level,
        path: this.generatePath(item),
        hasChildren: false,
        children: [],
        newAccountNumber: item.new_account_number
      };

      costCenterMap.set(item.cost_code, hierarchicalItem);
    });

    // Second pass: build parent-child relationships
    costCenterMap.forEach(costCenter => {
      if (costCenter.parentId && costCenterMap.has(costCenter.parentId)) {
        const parent = costCenterMap.get(costCenter.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(costCenter);
        parent.hasChildren = true;
      } else {
        // This is a root level cost center
        rootCostCenters.push(costCenter);
      }
    });

    // Sort children and root items
    this.sortCostCenters(rootCostCenters);
    costCenterMap.forEach(costCenter => {
      if (costCenter.children) {
        this.sortCostCenters(costCenter.children);
      }
    });

    return rootCostCenters;
  }

  private generateName(item: CostCenterData): string {
    if (item.sub_branch) {
      return `${item.company} - ${item.branch} - ${item.sub_branch}`;
    }
    return `${item.company} - ${item.branch}`;
  }

  private generatePath(item: CostCenterData): string {
    if (item.sub_branch) {
      return `${item.company} > ${item.branch} > ${item.sub_branch}`;
    }
    return `${item.company} > ${item.branch}`;
  }

  private sortCostCenters(costCenters: HierarchicalCostCenter[]): void {
    costCenters.sort((a, b) => {
      // Sort by level first, then by name
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Method to search Energy Rite data by cost center
  async searchEnergyRiteData(costCenter: HierarchicalCostCenter, endpoint: string): Promise<any> {
    try {
      let url = `http://${process.env.NEXT_PUBLIC_SERVER_URL}${endpoint}`;
      
      // Try with cost center parameters first
      const searchParams = new URLSearchParams();
      
      // Add cost center specific parameters
      if (costCenter.company) {
        searchParams.append('company', costCenter.company);
      }
      if (costCenter.branch) {
        searchParams.append('branch', costCenter.branch);
      }
      if (costCenter.costCode) {
        searchParams.append('costCenterId', costCenter.costCode);
      }

      if (searchParams.toString()) {
        url += `&${searchParams.toString()}`;
      }
      
      console.log('🔍 Trying API request with cost center parameters:', url);
      console.log('📊 Cost center parameters:', {
        company: costCenter.company,
        branch: costCenter.branch,
        costCode: costCenter.costCode
      });
      
      let response = await fetch(url);
      let result = await response.json();
      
      // If no data found with specific parameters, try without branch filter
      if (result.success && (!result.data || result.data.length === 0)) {
        console.log('⚠️ No data found with specific parameters, trying without branch filter');
        
        const fallbackParams = new URLSearchParams();
        if (costCenter.company) {
          fallbackParams.append('company', costCenter.company);
        }
        if (costCenter.costCode) {
          fallbackParams.append('costCenterId', costCenter.costCode);
        }
        
        const fallbackUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}${endpoint}${fallbackParams.toString() ? `?${fallbackParams.toString()}` : ''}`;
        console.log('🔄 Fallback request:', fallbackUrl);
        
        response = await fetch(fallbackUrl);
        result = await response.json();
      }
      
      // If still no data, try with just company filter
      if (result.success && (!result.data || result.data.length === 0) && costCenter.company) {
        console.log('⚠️ Still no data, trying with just company filter');
        
        const companyUrl = `http://${process.env.NEXT_PUBLIC_SERVER_URL}${endpoint}?company=${encodeURIComponent(costCenter.company)}`;
        console.log('🏢 Company-only request:', companyUrl);
        
        response = await fetch(companyUrl);
        result = await response.json();
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('📥 Final API response:', result);
      return result;
    } catch (error) {
      console.error('❌ Error searching Energy Rite data:', error);
      throw error;
    }
  }

  // Fetch company and branch data from Energy Rite API as fallback
  private async fetchFromEnergyRiteAPI(): Promise<HierarchicalCostCenter[]> {
    try {
      console.log('🌐 Fetching company/branch data from Energy Rite API...');
      
      // Get realtime dashboard data to extract companies and branches
      const response = await fetch(`http://${process.env.NEXT_PUBLIC_SERVER_URL}/api/energy-rite-reports/realtime-dashboard`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Energy Rite API response:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }
      
      const { companyBreakdown, branchBreakdown } = result.data;
      
      // Build hierarchical structure from API data
      const hierarchicalData: HierarchicalCostCenter[] = [];
      
      // Group branches by company
      const companyMap = new Map<string, any[]>();
      
      if (branchBreakdown && Array.isArray(branchBreakdown)) {
        branchBreakdown.forEach((branch: any) => {
          const company = branch.company || 'Unknown Company';
          if (!companyMap.has(company)) {
            companyMap.set(company, []);
          }
          companyMap.get(company)!.push(branch);
        });
      }
      
      // Create hierarchical structure
      companyMap.forEach((branches, company) => {
        const companyId = `api-${company.toLowerCase().replace(/\s+/g, '-')}`;
        
        const companyData: HierarchicalCostCenter = {
          id: companyId,
          name: company,
          costCode: companyId,
          company: company,
          branch: company,
          subBranch: undefined,
          level: 1,
          parentId: undefined,
          hasChildren: branches.length > 0,
          path: company,
          newAccountNumber: undefined,
          children: branches.map((branch: any, index: number) => ({
            id: `${companyId}-${index + 1}`,
            name: `${company} - ${branch.branch}`,
            costCode: `${companyId}-${branch.branch}`,
            company: company,
            branch: branch.branch,
            subBranch: branch.branch,
            level: 3,
            parentId: companyId,
            hasChildren: false,
            path: `${company} > ${branch.branch}`,
            newAccountNumber: undefined,
            children: []
          }))
        };
        
        hierarchicalData.push(companyData);
      });
      
      console.log('🏗️ Built hierarchical structure from API data:', hierarchicalData);
      return hierarchicalData;
      
    } catch (error) {
      console.error('❌ Error fetching from Energy Rite API:', error);
      throw error;
    }
  }

  // Note: Mock data removed - system now uses real data from Supabase or Energy Rite API
  /*
  private getMockCostCenters(): HierarchicalCostCenter[] {
    return [
      {
        id: '1-1',
        name: 'YUM Equity - JOHANNESBURG',
        costCode: 'JHB',
        company: 'YUM Equity',
        branch: 'JOHANNESBURG',
        level: 1,
        path: 'YUM Equity > JOHANNESBURG',
        hasChildren: true,
        children: [
          {
            id: '3-1',
            name: 'YUM Equity - JOHANNESBURG - SANDTON',
            costCode: 'JHB-SANDTON',
            company: 'YUM Equity',
            branch: 'JOHANNESBURG',
            subBranch: 'SANDTON',
            parentId: 'JHB',
            level: 3,
            path: 'YUM Equity > JOHANNESBURG > SANDTON',
            hasChildren: false
          },
          {
            id: '3-2',
            name: 'YUM Equity - JOHANNESBURG - RANDBURG',
            costCode: 'JHB-RANDBURG',
            company: 'YUM Equity',
            branch: 'JOHANNESBURG',
            subBranch: 'RANDBURG',
            parentId: 'JHB',
            level: 3,
            path: 'YUM Equity > JOHANNESBURG > RANDBURG',
            hasChildren: false
          }
        ]
      },
      {
        id: '1-2',
        name: 'Gunret - CAPE TOWN',
        costCode: 'CT',
        company: 'Gunret',
        branch: 'CAPE TOWN',
        level: 1,
        path: 'Gunret > CAPE TOWN',
        hasChildren: true,
        children: [
          {
            id: '3-3',
            name: 'Gunret - CAPE TOWN - CENTRE',
            costCode: 'CT-CENTRE',
            company: 'Gunret',
            branch: 'CAPE TOWN',
            subBranch: 'CENTRE',
            parentId: 'CT',
            level: 3,
            path: 'Gunret > CAPE TOWN > CENTRE',
            hasChildren: false
          }
        ]
      },
      {
        id: '1-3',
        name: 'SPUR - DURBAN',
        costCode: 'DBN',
        company: 'SPUR',
        branch: 'DURBAN',
        level: 1,
        path: 'SPUR > DURBAN',
        hasChildren: false
      },
      {
        id: '1-4',
        name: 'Alchemy Foods - PRETORIA',
        costCode: 'PTA',
        company: 'Alchemy Foods',
        branch: 'PRETORIA',
        level: 1,
        path: 'Alchemy Foods > PRETORIA',
        hasChildren: false
      },
      {
        id: '1-5',
        name: 'KFC - JOHANNESBURG',
        costCode: 'KFC-JHB',
        company: 'KFC',
        branch: 'JOHANNESBURG',
        level: 1,
        path: 'KFC > JOHANNESBURG',
        hasChildren: true,
        children: [
          {
            id: '3-4',
            name: 'KFC - JOHANNESBURG - SANDTON',
            costCode: 'KFC-JHB-SANDTON',
            company: 'KFC',
            branch: 'JOHANNESBURG',
            subBranch: 'SANDTON',
            parentId: 'KFC-JHB',
            level: 3,
            path: 'KFC > JOHANNESBURG > SANDTON',
            hasChildren: false
          }
        ]
      }
    ];
  }
  */
}

export const costCenterService = new CostCenterService();
