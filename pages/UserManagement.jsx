import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserPlusIcon, PencilSquareIcon, TrashIcon,
  CheckCircleIcon, XCircleIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'

const ROLES = ['admin', 'manager', 'employee']

const rolePill = {
  admin:    'bg-red-500/10 text-red-400 border border-red-500/20',
  manager:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  employee: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
}

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="card rounded-xl w-full max-w-md shadow-2xl animate-fade-up">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d45]">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">✕</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)

const UserForm = ({ initial = {}, onSubmit, loading }) => {
  const [form, setForm] = useState({
    username: initial.username || '',
    email: initial.email || '',
    full_name: initial.full_name || '',
    password: '',
    role: initial.role || 'employee',
  })
  const isEdit = !!initial.id
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
          <input className="input" value={form.username} onChange={e => set('username', e.target.value)} required minLength={3} />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
        <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
        <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
      </div>
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
        <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  )
}

const UserManagement = () => {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const [modal, setModal] = useState(null) // null | 'create' | { edit: user }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.createUser(data),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries(['users']); setModal(null) },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries(['users']); setModal(null) },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['users']); setDeleteTarget(null) },
    onError: (e) => toast.error(e.message),
  })

  const users = data?.data || []

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} accounts registered</p>
        </div>
        <button onClick={() => setModal('create')} className="btn btn-primary">
          <UserPlusIcon className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              {['Name', 'Username', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-[#1e2d45]">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : users.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-200 font-medium">{user.full_name}</span>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-sky-400">(you)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 mono text-sm text-slate-400">{user.username}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`pill text-xs ${rolePill[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                      <CheckCircleIcon className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 text-sm">
                      <XCircleIcon className="w-4 h-4" /> Disabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ edit: user })}
                      className="p-1.5 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      disabled={user.id === currentUser?.id}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <Modal title="Create New User" onClose={() => setModal(null)}>
          <UserForm
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {modal?.edit && (
        <Modal title="Edit User" onClose={() => setModal(null)}>
          <UserForm
            initial={modal.edit}
            onSubmit={(data) => updateMutation.mutate({ id: modal.edit.id, data })}
            loading={updateMutation.isPending}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-300 mb-4">
            Are you sure you want to delete <strong className="text-white">{deleteTarget.full_name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="btn btn-danger"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default UserManagement
