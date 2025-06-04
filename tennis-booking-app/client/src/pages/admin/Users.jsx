// client/src/pages/admin/Users.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Search, Edit, UserX, Mail, Shield, UserPlus, UserCheck, UserCog, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

import userService from '../../services/userService';

// Common Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const userFormSchema = yup.object({
  username: yup.string().required('Username is required').min(3, 'Min 3 characters').max(30, 'Max 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, underscores, hyphens only'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  firstName: yup.string().optional().max(50, 'Max 50 characters'),
  lastName: yup.string().optional().max(50, 'Max 50 characters'),
  phoneNumber: yup.string().optional().matches(/^$|^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number'),
  role: yup.string().oneOf(['member', 'admin']).required('Role is required'),
  isActive: yup.boolean(),
  // No password fields here for admin edit; password changes should be separate or self-service by user
});

const AdminUsers = () => {
  const [filters, setFilters] = useState({ searchTerm: '', role: '', isActive: '' });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null); // User object for editing
  const [userToToggleStatus, setUserToToggleStatus] = useState(null); // { id, isActive: currentStatus }
  
  const queryClient = useQueryClient();
  const usersPerPage = 15;

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
      setCurrentPage(1); 
    }, 500);
    return () => clearTimeout(handler);
  }, [filters.searchTerm]);

  const { data: usersData, isLoading, error: usersError } = useQuery(
    ['adminUsers', debouncedSearchTerm, filters.role, filters.isActive, currentPage, usersPerPage],
    () => userService.getAllUsers({ 
      search: debouncedSearchTerm || undefined, 
      role: filters.role || undefined, 
      isActive: filters.isActive !== '' ? filters.isActive === 'true' : undefined,
      page: currentPage, 
      limit: usersPerPage,
      sort: '-createdAt' // Sort by newest first
    }),
    { 
        keepPreviousData: true,
        staleTime: 5 * 60 * 1000,
    }
  );
  
  const users = usersData?.data || [];
  const totalPages = usersData?.pagination?.pages || 1;
  const totalUsers = usersData?.count || 0;
  
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isDirty },
    reset: resetForm,
    setValue, // To pre-fill form for editing
  } = useForm({
    resolver: yupResolver(userFormSchema),
    defaultValues: { // Define default values for clarity
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'member',
        isActive: true,
    }
  });
  
  const updateUserMutation = useMutation(
    ({ id, data }) => userService.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
        toast.success('User updated successfully!');
        setEditingUser(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user.');
      }
    }
  );

  // For deactivating/activating (soft delete is handled by backend by setting isActive)
  const toggleUserStatusMutation = useMutation(
    ({ id, isActive }) => userService.updateUser(id, { isActive }), // Send only isActive field
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('adminUsers');
        toast.success(`User ${variables.isActive ? 'activated' : 'deactivated'} successfully!`);
        setUserToToggleStatus(null);
      },
      onError: (error, variables) => {
        toast.error(error.response?.data?.message || `Failed to ${variables.isActive ? 'activate' : 'deactivate'} user.`);
      }
    }
  );
  
  const handleEditUser = (user) => {
    setEditingUser(user);
    resetForm({ // Use reset to populate all fields and manage dirty state correctly
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
  };
  
  const onSubmitEditForm = (formData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser._id, data: formData });
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    if (filterName !== 'searchTerm') {
        setCurrentPage(1);
    }
  };

  const handleConfirmToggleStatus = () => {
    if (userToToggleStatus) {
        toggleUserStatusMutation.mutate({ 
            id: userToToggleStatus.id, 
            isActive: !userToToggleStatus.isActive // Send the new desired state
        });
    }
  };
  
  const getRoleBadgeColor = (role) => {
    return role === 'admin' ? 'badge-warning' : 'badge-primary';
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive ? 'badge-success' : 'badge-error';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">User Management</h1>
        {/* <Button icon={UserPlus} onClick={() => {/* TODO: Implement create user modal }}>Create New User</Button> */}
      </div>
      
      <Card>
        <div className="p-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-primary-600"/> Filter & Search Users
            </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input
              id="userSearch"
              label="Search"
              placeholder="Name, email, username..."
              icon={Search}
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              inputClassName="text-sm"
              labelClassName="text-sm"
            />
            <div>
              <label htmlFor="roleFilter" className="form-label text-sm">Role</label>
              <select
                id="roleFilter"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="form-input w-full text-sm"
              >
                <option value="">All Roles</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="statusFilter" className="form-label text-sm">Status</label>
              <select
                id="statusFilter"
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="form-input w-full text-sm"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <Button 
                variant="secondary" 
                size="md"
                onClick={() => {
                    setFilters({ searchTerm: '', role: '', isActive: '' });
                    // Debounced search term will also clear
                }}
                className="w-full sm:w-auto h-10" // Ensure button aligns with inputs
            >
                Reset Filters
            </Button>
          </div>
        </div>
      </Card>
      
      {isLoading && (
        <div className="text-center py-10">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      )}

      {!isLoading && usersError && (
         <Card className="bg-error-50 border-error-200">
            <div className="card-body text-center text-error-700 py-10">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-error-400"/>
                <p className="font-semibold">Could not load users.</p>
                <p className="text-sm">{usersError.response?.data?.message || "Please try again later."}</p>
            </div>
        </Card>
      )}

      {!isLoading && !usersError && (
        <Card noPadding> {/* noPadding to allow table to span full width inside card */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Contact</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Joined</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {users.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan="6" className="text-center py-10 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-2 text-gray-300"/>
                            No users found matching your criteria.
                        </td>
                    </tr>
                )}
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                           <div className={`h-10 w-10 rounded-full ${getRoleBadgeColor(user.role).replace('badge-', 'bg-').replace('-800', '-100')} flex items-center justify-center font-semibold ${getRoleBadgeColor(user.role).replace('badge-', 'text-').replace('-100', '-600')}`}>
                                {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                            </div>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 truncate max-w-[150px]" title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}>
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]" title={user.username}>@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900 truncate max-w-[200px]" title={user.email}>{user.email}</div>
                      {user.phoneNumber && <div className="text-xs text-gray-500">{user.phoneNumber}</div>}
                    </td>
                    <td className="table-cell">
                      <span className={`badge text-xs capitalize ${getRoleBadgeColor(user.role)}`}>
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${getStatusBadgeColor(user.isActive)}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                       {!user.emailVerified && (
                         <span className="ml-1 badge badge-warning text-xs" title="Email not verified">Unverified</span>
                       )}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="p-1.5" title="Edit User">
                          <UserCog className="h-4 w-4 text-primary-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToToggleStatus({ id: user._id, isActive: user.isActive })}
                          className="p-1.5"
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? <UserX className="h-4 w-4 text-error-600" /> : <UserCheck className="h-4 w-4 text-success-600" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && users.length > 0 && (
            <div className="p-5 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      )}
      
      <Modal
        isOpen={!!editingUser}
        onClose={() => { setEditingUser(null); resetForm(); }}
        title={editingUser ? `Edit User: ${editingUser.username}` : "Edit User"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmitEditForm)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input id="edit-username" label="Username" register={register('username')} error={formErrors.username?.message} disabled={updateUserMutation.isLoading} />
            <Input id="edit-email" type="email" label="Email" register={register('email')} error={formErrors.email?.message} disabled={updateUserMutation.isLoading} />
            <Input id="edit-firstName" label="First Name" register={register('firstName')} error={formErrors.firstName?.message} disabled={updateUserMutation.isLoading} />
            <Input id="edit-lastName" label="Last Name" register={register('lastName')} error={formErrors.lastName?.message} disabled={updateUserMutation.isLoading} />
            <Input id="edit-phoneNumber" type="tel" label="Phone Number" register={register('phoneNumber')} error={formErrors.phoneNumber?.message} disabled={updateUserMutation.isLoading} />
            <div>
              <label htmlFor="edit-role" className="form-label">Role</label>
              <select id="edit-role" {...register('role')} className="form-input" disabled={updateUserMutation.isLoading}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              {formErrors.role && <p className="form-error">{formErrors.role.message}</p>}
            </div>
          </div>
          
          <div className="flex items-center">
            <input id="edit-isActive" {...register('isActive')} type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" disabled={updateUserMutation.isLoading} />
            <label htmlFor="edit-isActive" className="ml-2 text-sm text-gray-700">Account is Active</label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => { setEditingUser(null); resetForm();}} disabled={updateUserMutation.isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateUserMutation.isLoading} disabled={!isDirty || updateUserMutation.isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
      
      <ConfirmDialog
        isOpen={!!userToToggleStatus}
        onClose={() => setUserToToggleStatus(null)}
        onConfirm={handleConfirmToggleStatus}
        title={`${userToToggleStatus?.isActive ? 'Deactivate' : 'Activate'} User`}
        message={`Are you sure you want to ${userToToggleStatus?.isActive ? 'deactivate' : 'activate'} this user account?`}
        confirmLabel={userToToggleStatus?.isActive ? 'Deactivate' : 'Activate'}
        variant={userToToggleStatus?.isActive ? 'danger' : 'primary'}
        isLoading={toggleUserStatusMutation.isLoading}
      />
    </div>
  );
};

export default AdminUsers;