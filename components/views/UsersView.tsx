'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { UserPlus, RefreshCw, Users, Mail, Shield, Building, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  role: string | null;
  created_at: string;
  tech_admin: boolean | null;
  first_login: boolean | null;
  permissions: any;
  energyrite: boolean | null;
  cost_code: string | null;
  company: string | null;
}

interface CostCenter {
  id: number;
  cost_code: string;
  company: string;
  branch: string;
  source?: string; // Track which table this came from
}

interface UsersViewProps {
  onBack: () => void;
}

export function UsersView({ onBack }: UsersViewProps) {
  const { isAdmin } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    role: '',
    costCenter: ''
  });

  // Fetch users where role is energyrite or energyrite_admin
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('👥 Fetching EnergyRite users...');
      
      const supabase = createClient();
      
      // First, let's see all users to debug
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, role, energyrite')
        .order('created_at', { ascending: false });
      
      console.log('🔍 All users in database:', allUsers);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .in('role', ['energyrite', 'energyrite_admin'])
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        throw fetchError;
      }
      
      console.log('✅ Fetched EnergyRite users:', data?.length || 0);
      console.log('📋 Filtered users data:', data);
      setUsers(data || []);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toast({
        title: 'Failed to load users',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch cost centers for dropdown - hierarchical filtering
  const fetchCostCenters = async () => {
    try {
      const supabase = createClient();
      const allCostCenters: CostCenter[] = [];

      // Step 1: Get base cost centers with new_account_number='ENER-0001'
      const { data: baseCostCenters, error: baseError } = await supabase
        .from('cost_centers')
        .select('id, cost_code, company, branch')
        .eq('new_account_number', 'ENER-0001');

      if (baseError) {
        console.error('Error fetching base cost centers:', baseError);
        return;
      }

      if (baseCostCenters) {
        // Add source information to base cost centers
        const baseWithSource = baseCostCenters.map(cc => ({ ...cc, source: 'cost_centers' }));
        allCostCenters.push(...baseWithSource);
        
        // Get cost codes from base level
        const baseCostCodes = baseCostCenters.map(cc => cc.cost_code);
        
        // Step 2: Get level 3 cost centers where parent_cost_code matches base cost codes
        const { data: level3CostCenters, error: level3Error } = await supabase
          .from('level_3_cost_centers')
          .select('id, cost_code, company, branch')
          .in('parent_cost_code', baseCostCodes);

        if (level3Error) {
          console.error('Error fetching level 3 cost centers:', level3Error);
        } else if (level3CostCenters) {
          // Add source information to level 3 cost centers
          const level3WithSource = level3CostCenters.map(cc => ({ ...cc, source: 'level_3_cost_centers' }));
          allCostCenters.push(...level3WithSource);
          
          // Get cost codes from level 3
          const level3CostCodes = level3CostCenters.map(cc => cc.cost_code);
          
          // Step 3: Get level 4 cost centers where parent_cost_code matches level 3 cost codes
          const { data: level4CostCenters, error: level4Error } = await supabase
            .from('level_4_cost_centers')
            .select('id, cost_code, company, branch')
            .in('parent_cost_code', level3CostCodes);

          if (level4Error) {
            console.error('Error fetching level 4 cost centers:', level4Error);
          } else if (level4CostCenters) {
            // Add source information to level 4 cost centers
            const level4WithSource = level4CostCenters.map(cc => ({ ...cc, source: 'level_4_cost_centers' }));
            allCostCenters.push(...level4WithSource);
            
            // Get cost codes from level 4
            const level4CostCodes = level4CostCenters.map(cc => cc.cost_code);
            
            // Step 4: Get level 5 cost centers where parent_cost_code matches level 4 cost codes
            const { data: level5CostCenters, error: level5Error } = await supabase
              .from('level_5_cost_centers')
              .select('id, cost_code, company, branch')
              .in('parent_cost_code', level4CostCodes);

            if (level5Error) {
              console.error('Error fetching level 5 cost centers:', level5Error);
            } else if (level5CostCenters) {
              // Add source information to level 5 cost centers
              const level5WithSource = level5CostCenters.map(cc => ({ ...cc, source: 'level_5_cost_centers' }));
              allCostCenters.push(...level5WithSource);
            }
          }
        }
      }

      // Sort by company name
      allCostCenters.sort((a, b) => a.company.localeCompare(b.company));
      setCostCenters(allCostCenters);
      
      console.log('📊 Fetched hierarchical cost centers:', allCostCenters.length);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCostCenters();
    }
  }, [isAdmin]);

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'energyrite_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'energyrite':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'energyrite_admin':
        return 'EnergyRite Admin';
      case 'admin':
        return 'Admin';
      case 'energyrite':
        return 'EnergyRite User';
      default:
        return role || 'No Role';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleAddUser = async () => {
    try {
      setIsAddingUser(true);
      
      if (!newUserForm.email || !newUserForm.role || !newUserForm.costCenter) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all fields',
          variant: 'destructive'
        });
        return;
      }

      const selectedCostCenter = costCenters.find(cc => `${cc.source}-${cc.id}` === newUserForm.costCenter);
      
      if (!selectedCostCenter) {
        toast({
          title: 'Error',
          description: 'Selected cost center not found',
          variant: 'destructive'
        });
        return;
      }

      // Call server-side API to create user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserForm.email,
          role: newUserForm.role,
          cost_code: selectedCostCenter.cost_code,
          company: selectedCostCenter.company,
          branch: selectedCostCenter.branch,
          energyrite: true,
          first_login: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      // Reset form and close modal
      setNewUserForm({ email: '', role: '', costCenter: '' });
      setIsAddUserModalOpen(false);
      
      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create user',
        variant: 'destructive'
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleModalClose = () => {
    setIsAddUserModalOpen(false);
    setNewUserForm({ email: '', role: '', costCenter: '' });
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-50 h-full">
        <TopNavigation />
        <div className="flex justify-center items-center h-full">
          <Card className="shadow-sm border border-gray-200 max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="font-semibold text-gray-500 text-xl mb-2">Access Denied</h2>
              <p className="text-gray-400 text-center">
                You need admin privileges to access the user management section.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-full">
      <TopNavigation />

      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-gray-700" />
              <h2 className="font-semibold text-gray-900 text-2xl">User Management</h2>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <p className="text-gray-600 text-sm">
            View EnergyRite users and admins
          </p>
        </div>

        {/* Stats Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="font-semibold text-gray-900 text-2xl">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-gray-500 text-sm">Admins</p>
                  <p className="font-semibold text-gray-900 text-2xl">
                    {users.filter(user => user.role === 'energyrite_admin').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Building className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-gray-500 text-sm">Active Users</p>
                  <p className="font-semibold text-gray-900 text-2xl">
                    {users.filter(user => !user.first_login).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-gray-500 text-sm">With Cost Codes</p>
                  <p className="font-semibold text-gray-900 text-2xl">
                    {users.filter(user => user.cost_code).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-semibold text-gray-900 text-lg">EnergyRite Users</CardTitle>
                <p className="text-gray-500 text-sm">
                  EnergyRite users and admins ({users.length} total)
                </p>
              </div>
              <Button 
                className="bg-[#1e3a5f] hover:bg-[#1a3454] text-white"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <UserPlus className="mr-2 w-4 h-4" />
                Add New User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                  <span className="text-gray-500">Loading users...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <p className="text-red-500 text-lg font-medium">Failed to load users</p>
                  <p className="text-gray-500 text-sm mt-2">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchUsers}
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="text-gray-500 text-lg">No EnergyRite users found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    EnergyRite users and admins will appear here
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-6 py-4 font-medium text-sm text-left">Email</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Role</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Company</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Cost Code</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Tech Admin</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">First Login</th>
                      <th className="px-6 py-4 font-medium text-sm text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900 text-sm">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={`${getRoleBadgeColor(user.role)} px-2 py-1`}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm">
                          {user.company || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm">
                          {user.cost_code || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge 
                            className={`px-2 py-1 ${
                              user.tech_admin 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.tech_admin ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge 
                            className={`px-2 py-1 ${
                              user.first_login 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.first_login ? 'Pending' : 'Completed'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm">
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add New User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={newUserForm.role} 
                onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energyrite">EnergyRite User</SelectItem>
                  <SelectItem value="energyrite_admin">EnergyRite Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCenter">Cost Center</Label>
              <Select 
                value={newUserForm.costCenter} 
                onValueChange={(value) => setNewUserForm(prev => ({ ...prev, costCenter: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a cost center" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((costCenter) => (
                    <SelectItem key={`${costCenter.source}-${costCenter.id}`} value={`${costCenter.source}-${costCenter.id}`}>
                      {costCenter.company} - {costCenter.branch} - {costCenter.cost_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser} 
              disabled={isAddingUser}
              className="bg-[#1e3a5f] hover:bg-[#1a3454] text-white"
            >
              {isAddingUser ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
