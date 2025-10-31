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
import { UserPlus, RefreshCw, Users, Mail, Shield, Building, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { HierarchicalTable } from '@/components/ui/hierarchical-table';


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
  const [showGenerators, setShowGenerators] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<any>(null);
  const [generators, setGenerators] = useState<any[]>([]);
  const [generatorsLoading, setGeneratorsLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    role: '',
    costCenter: '',
    site: '',
    generators: [] as string[]
  });
  const [availableSites, setAvailableSites] = useState<any[]>([]);

  // Fetch users - simplified and fast
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('👥 Fetching users via API...');
      
      // Use API route instead of direct Supabase (much faster)
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      console.log('✅ Fetched users:', result.data?.length || 0);
      
      let filteredUsers = result.data || [];
      
      // Filter users for non-admin users to only show users from their cost center
      if (!isAdmin && userCostCode) {
        filteredUsers = filteredUsers.filter((user: User) => 
          user.cost_code === userCostCode || 
          user.cost_code?.startsWith(userCostCode + '-')
        );
        console.log('🔒 Filtered users for non-admin:', filteredUsers.length);
      }
      
      setUsers(filteredUsers);
      
    } catch (err) {
      console.error('❌ fetchUsers error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      toast({
        title: 'Failed to load users',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Use cost centers from AppContext (same as navbar)
  const { costCenters: appCostCenters, vehicles, setSelectedRoute } = useApp();
  const { userCostCode } = useUser();
  
  // Convert AppContext cost centers to the format needed for the dropdown
  const availableCostCenters = React.useMemo(() => {
    console.log('🔍 Raw appCostCenters:', appCostCenters);
    console.log('🔍 Raw vehicles:', vehicles?.length || 0);
    
    const flattenCostCenters = (centers: any[]): CostCenter[] => {
      const result: CostCenter[] = [];
      
      centers.forEach(center => {
        if (center.costCode) {
          result.push({
            id: center.id,
            cost_code: center.costCode,
            company: center.company || center.name || 'Unknown Company',
            branch: center.branch || center.name || 'Unknown Branch',
            source: 'app_context'
          });
        }
        
        if (center.children && center.children.length > 0) {
          result.push(...flattenCostCenters(center.children));
        }
      });
      
      return result;
    };
    
    const flattened = flattenCostCenters(appCostCenters || []);
    
    // If user is not admin, only show their cost center
    const filtered = isAdmin ? flattened : flattened.filter(cc => cc.cost_code === userCostCode);
    
    console.log('📊 Flattened cost centers:', flattened.length);
    console.log('📊 Filtered for user:', filtered.length);
    console.log('📋 Sample cost centers:', filtered.slice(0, 3));
    return filtered;
  }, [appCostCenters, vehicles, isAdmin, userCostCode]);

  useEffect(() => {
    console.log('🔍 UsersView useEffect triggered');
    console.log('👤 isAdmin:', isAdmin);
    console.log('⏰ Current loading state:', loading);
    
    if (isAdmin === true) {
      console.log('✅ User is admin, fetching users...');
      fetchUsers();
    } else if (isAdmin === false) {
      console.log('❌ User is not admin, stopping loading');
      setLoading(false);
    } else {
      console.log('⏳ isAdmin is undefined/null, waiting...');
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
      
      if (!newUserForm.email || !newUserForm.role || (newUserForm.role !== 'energyrite_admin' && !newUserForm.costCenter)) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const selectedCostCenter = availableCostCenters.find(cc => `${cc.source}-${cc.id}` === newUserForm.costCenter);
      
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
          site_id: newUserForm.site ? availableSites.find(s => s.id.toString() === newUserForm.site)?.branch || null : null,
          energyrite: true,
          first_login: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const result = await response.json();
      
      // Send welcome email with password
      try {
        const roleDisplayName = newUserForm.role === 'energyrite_admin' ? 'EnergyRite Administrator' : 'EnergyRite User';
        const selectedSite = availableSites.find(s => s.id.toString() === newUserForm.site);
        const accessLevel = newUserForm.role === 'energyrite_admin' 
          ? 'Full system access' 
          : newUserForm.site 
            ? selectedSite?.branch || 'Selected site'
            : selectedCostCenter.cost_code;
        
        const emailResponse = await fetch('/api/admin/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUserForm.email,
            role: roleDisplayName,
            company: selectedCostCenter?.company || 'EnergyRite',
            accessLevel,
            site_id: selectedSite?.branch || null,
            password: result.password
          })
        });
        
        if (emailResponse.ok) {
          toast({
            title: 'Success',
            description: 'User created and login credentials sent via email',
          });
        } else {
          throw new Error('Email API failed');
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        toast({
          title: 'User Created',
          description: 'User created successfully, but welcome email failed to send',
          variant: 'default'
        });
      }

      // Reset form and close modal
      setNewUserForm({ email: '', role: '', costCenter: '', site: '', generators: [] });
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
    setNewUserForm({ email: '', role: '', costCenter: '', site: '', generators: [] });
  };
  
  // Handle cost center click to show generators
  const handleCostCenterClick = async (costCenter: any) => {
    setSelectedCostCenter(costCenter);
    setSelectedRoute({
      id: costCenter.id,
      route: costCenter.name || 'Unknown',
      locationCode: costCenter.costCode || 'N/A',
      costCode: costCenter.costCode || undefined
    });
    
    // Fetch generators for this cost center (including descendants)
    setGeneratorsLoading(true);
    try {
      const source = Array.isArray(vehicles) ? vehicles : [];
      const filtered = source.filter((v: any) => 
        v.cost_code === costCenter.costCode || 
        v.cost_code?.startsWith(costCenter.costCode + '-')
      );
      
      const generatorList = filtered.map((vehicle: any) => ({
        id: vehicle.id,
        branch: vehicle.branch || 'Unknown Branch',
        company: vehicle.company || 'Unknown Company',
        cost_code: vehicle.cost_code || '',
        ip_address: vehicle.ip_address || '',
        plate: vehicle.plate,
        isChild: vehicle.cost_code !== costCenter.costCode
      }));
      
      setGenerators(generatorList);
      setShowGenerators(true);
    } catch (error) {
      console.error('Error fetching generators:', error);
      toast({
        title: 'Error',
        description: 'Failed to load generators',
        variant: 'destructive'
      });
    } finally {
      setGeneratorsLoading(false);
    }
  };
  
  // Handle back to cost centers
  const handleBackToCostCenters = () => {
    setShowGenerators(false);
    setSelectedCostCenter(null);
    setGenerators([]);
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
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
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
                    onClick={() => {
                      setIsAddUserModalOpen(true);
                      // Auto-select cost center for non-admin users
                      if (!isAdmin && availableCostCenters.length > 0) {
                        const userCostCenter = availableCostCenters[0];
                        const costCenterValue = `${userCostCenter.source}-${userCostCenter.id}`;
                        setNewUserForm(prev => ({ ...prev, costCenter: costCenterValue }));
                        
                        // Auto-load sites for the user's cost center
                        const source = Array.isArray(vehicles) ? vehicles : [];
                        const sites = source.filter((v: any) => 
                          v.cost_code === userCostCenter.cost_code || 
                          v.cost_code?.startsWith(userCostCenter.cost_code + '-')
                        ).map((vehicle: any) => {
                          const isChild = vehicle.cost_code !== userCostCenter.cost_code;
                          let childCenterName = 'Direct';
                          if (isChild) {
                            const childCenter = availableCostCenters.find(cc => cc.cost_code === vehicle.cost_code);
                            childCenterName = childCenter ? `${childCenter.company} - ${childCenter.branch}` : vehicle.cost_code;
                          }
                          return {
                            id: vehicle.id,
                            branch: vehicle.branch || 'Unknown Branch',
                            plate: vehicle.plate || 'Unknown Site',
                            cost_code: vehicle.cost_code || '',
                            isChild,
                            childCenterName
                          };
                        });
                        setAvailableSites(sites);
                      }
                    }}
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
                      <th className="px-4 py-2 font-medium text-xs text-left">Email</th>
                      <th className="px-4 py-2 font-medium text-xs text-left">Role</th>
                      <th className="px-4 py-2 font-medium text-xs text-left">Company</th>
                      <th className="px-4 py-2 font-medium text-xs text-left">First Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900 text-xs">
                          {user.email}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <Badge className={`${getRoleBadgeColor(user.role)} px-1.5 py-0.5 text-xs`}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-gray-900 text-xs">
                          {user.company || '-'}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <Badge 
                            className={`px-1.5 py-0.5 text-xs ${
                              user.first_login 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.first_login ? 'Pending' : 'Completed'}
                          </Badge>
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
        <DialogContent className="sm:max-w-lg">
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

            {newUserForm.role && newUserForm.role !== 'energyrite_admin' && (
              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center</Label>
                {isAdmin ? (
                  <Select 
                    value={newUserForm.costCenter} 
                    onValueChange={(value) => {
                    setNewUserForm(prev => ({ ...prev, costCenter: value, site: '' }));
                    // Load sites for selected cost center
                    const selectedCostCenter = availableCostCenters.find(cc => `${cc.source}-${cc.id}` === value);
                    console.log('Selected cost center:', selectedCostCenter);
                    if (selectedCostCenter) {
                      const source = Array.isArray(vehicles) ? vehicles : [];
                      console.log('Available vehicles:', source.length);
                      const sites = source.filter((v: any) => 
                        v.cost_code === selectedCostCenter.cost_code || 
                        v.cost_code?.startsWith(selectedCostCenter.cost_code + '-')
                      ).map((vehicle: any) => {
                        const isChild = vehicle.cost_code !== selectedCostCenter.cost_code;
                        let childCenterName = 'Direct';
                        if (isChild) {
                          const childCenter = availableCostCenters.find(cc => cc.cost_code === vehicle.cost_code);
                          childCenterName = childCenter ? `${childCenter.company} - ${childCenter.branch}` : vehicle.cost_code;
                        }
                        return {
                          id: vehicle.id,
                          branch: vehicle.branch || 'Unknown Branch',
                          plate: vehicle.plate || 'Unknown Site',
                          cost_code: vehicle.cost_code || '',
                          isChild,
                          childCenterName
                        };
                      });
                      console.log('Filtered sites:', sites);
                      setAvailableSites(sites);
                    } else {
                      setAvailableSites([]);
                    }
                  }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCostCenters.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading cost centers...</SelectItem>
                      ) : (
                        availableCostCenters.map((costCenter) => (
                          <SelectItem key={`${costCenter.source}-${costCenter.id}`} value={`${costCenter.source}-${costCenter.id}`}>
                            {costCenter.company} - {costCenter.branch} - {costCenter.cost_code}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-gray-100 rounded-md">
                    <span className="text-sm text-gray-700">
                      {availableCostCenters[0]?.company} - {availableCostCenters[0]?.branch} - {availableCostCenters[0]?.cost_code}
                    </span>
                  </div>
                )}
              </div>
            )}
              </div>
            
            {newUserForm.costCenter && availableSites.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Select 
                  value={newUserForm.site} 
                  onValueChange={(value) => setNewUserForm(prev => ({ ...prev, site: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{site.branch}</span>
                          <Badge className={site.isChild ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                            {site.childCenterName}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
