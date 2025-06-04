import React, { useState } from 'react'
import { Search, Edit, Trash2, UserPlus, Shield, UserX, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Pagination from '../../components/common/Pagination'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import userService from '../../services/userService'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  username: yup.string().required('Username is required').min(3, 'Username must be at least 3 characters'),
  email: yup.string().email('Invalid email').required('Email is required'),
  firstName: yup.string(),
  lastName: yup.string(),
  phoneNumber: yup.string(),
  role: yup.string().oneOf(['member', 'admin']).required('Role is required'),
  isActive: yup.boolean()
})

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [creatingUser, setCreatingUser] = useState(false)
  
  const queryClient = useQueryClient()
  const limit = 20
  
  // Fetch users
  const { data, isLoading } = useQuery(
    ['adminUsers', { search: searchTerm, role: roleFilter, page: currentPage, limit }],
    () => userService.getAllUsers({ search: searchTerm, role: roleFilter, page: currentPage, limit }),
    { keepPreviousData: true }
  )
  
  const users = data?.data || []
  const totalPages = data?.pagination?.pages || 1
  
  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    resolver: yupResolver(schema)
  })
  
  // Mutations
  const updateUser = useMutation(
    ({ id, data }) => userService.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
        toast.success('User updated successfully')
        setEditingUser(null)
        reset()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user')
      }
    }
  )
  
  const deleteUser = useMutation(
    (id) => userService.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
        toast.success('User deactivated successfully')
        setDeletingUserId(null)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user')
      }
    }
  )
  
  const handleEditUser = (user) => {
    setEditingUser(user)
    setValue('username', user.username)
    setValue('email', user.email)
    setValue('firstName', user.firstName || '')
    setValue('lastName', user.lastName || '')
    setValue('phoneNumber', user.phoneNumber || '')
    setValue('role', user.role)
    setValue('isActive', user.isActive)
  }
  
  const onSubmit = (data) => {
    if (editingUser) {
      updateUser.mutate({ id: editingUser._id, data })
    }
  }
  
  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
  }
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      </div>
      
      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, username, or email..."
                  className="form-input pl-10"
                />
              </div>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="form-input"
            >
              <option value="">All Roles</option>
              <option value="member">Members</option>
              <option value="admin">Admins</option>
            </select>
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">User</th>
                <th className="table-header-cell">Contact</th>
                <th className="table-header-cell">Role</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Joined</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="table-cell">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm">
                      <div className="flex items-center text-gray-900">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="text-gray-500">{user.phoneNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingUserId(user._id)}
                        className="text-error-600 hover:text-error-700 p-1"
                        title="Deactivate user"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      
      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => {
          setEditingUser(null)
          reset()
        }}
        title="Edit User"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Username</label>
              <input {...register('username')} className="form-input" />
              {errors.username && (
                <p className="form-error">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Email</label>
              <input {...register('email')} type="email" className="form-input" />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">First Name</label>
              <input {...register('firstName')} className="form-input" />
            </div>
            
            <div>
              <label className="form-label">Last Name</label>
              <input {...register('lastName')} className="form-input" />
            </div>
            
            <div>
              <label className="form-label">Phone Number</label>
              <input {...register('phoneNumber')} className="form-input" />
            </div>
            
            <div>
              <label className="form-label">Role</label>
              <select {...register('role')} className="form-input">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              {...register('isActive')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Account is active
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingUser(null)
                reset()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateUser.isLoading}
              className="btn-primary"
            >
              {updateUser.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingUserId}
        onClose={() => setDeletingUserId(null)}
        onConfirm={() => deleteUser.mutate(deletingUserId)}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user? They will not be able to log in, but their data will be preserved."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  )
}

export default AdminUsers