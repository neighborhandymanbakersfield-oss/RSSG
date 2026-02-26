import { useCallback, useEffect, useState } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';

type UserRole = 'ADMIN' | 'VIP' | 'TEMP';
type PassType = 'HOURS_24' | 'DAYS_3' | 'DAYS_7' | 'DAYS_30';

interface AccessPass {
  id: number;
  type: PassType;
  startsAt: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

interface User {
  id: number;
  displayName: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isMasterAdmin: boolean;
  accessPasses: AccessPass[];
}

interface UserFormState {
  displayName: string;
  role: UserRole;
  email: string;
  phone: string;
  isActive: boolean;
  isMasterAdmin: boolean;
}

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'VIP', 'TEMP'];
const PASS_OPTIONS: PassType[] = ['HOURS_24', 'DAYS_3', 'DAYS_7', 'DAYS_30'];

function isEpochDate(value: string): boolean {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time === 0;
}

function getPassStatus(pass: AccessPass): string {
  if (pass.isRevoked) return 'Revoked';
  if (isEpochDate(pass.startsAt) && isEpochDate(pass.expiresAt)) return 'Pending First Login';
  if (new Date(pass.expiresAt) <= new Date()) return 'Expired';
  return 'Active';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() === 0) return 'Pending';
  return date.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error;
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [createForm, setCreateForm] = useState<UserFormState>({
    displayName: '',
    role: 'TEMP',
    email: '',
    phone: '',
    isActive: true,
    isMasterAdmin: false,
  });

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UserFormState | null>(null);

  const [passSelections, setPassSelections] = useState<Record<number, PassType>>({});

  const getAuthConfig = useCallback((): AxiosRequestConfig => {
    const selectedUserId = localStorage.getItem('selectedUserId');
    if (!selectedUserId) {
      throw new Error('Select an admin user first from "Who are you?"');
    }
    return {
      withCredentials: true,
      headers: {
        'x-selected-user-id': selectedUserId,
      },
    };
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      const res = await axios.get<User[]>('/admin/users', getAuthConfig());
      setUsers(res.data);

      setPassSelections((prev) => {
        const next = { ...prev };
        for (const user of res.data) {
          if (user.role === 'TEMP' && !next[user.id]) {
            next[user.id] = 'HOURS_24';
          }
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getAuthConfig]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetCreateForm = (): void => {
    setCreateForm({
      displayName: '',
      role: 'TEMP',
      email: '',
      phone: '',
      isActive: true,
      isMasterAdmin: false,
    });
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const displayName = createForm.displayName.trim();
    if (!displayName) {
      setError('Display name is required.');
      return;
    }

    try {
      await axios.post(
        '/admin/users',
        {
          displayName,
          role: createForm.role,
          email: createForm.email.trim() || undefined,
          phone: createForm.phone.trim() || undefined,
          isMasterAdmin: createForm.role === 'ADMIN' ? createForm.isMasterAdmin : false,
        },
        getAuthConfig(),
      );

      resetCreateForm();
      setSuccess('User created.');
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const startEdit = (user: User): void => {
    setEditingUserId(user.id);
    setEditForm({
      displayName: user.displayName,
      role: user.role,
      email: user.email ?? '',
      phone: user.phone ?? '',
      isActive: user.isActive,
      isMasterAdmin: user.isMasterAdmin,
    });
  };

  const cancelEdit = (): void => {
    setEditingUserId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (editingUserId === null || editForm === null) return;

    setError('');
    setSuccess('');

    const displayName = editForm.displayName.trim();
    if (!displayName) {
      setError('Display name is required.');
      return;
    }

    try {
      await axios.patch(
        `/admin/users/${editingUserId}`,
        {
          displayName,
          role: editForm.role,
          email: editForm.email.trim() || undefined,
          phone: editForm.phone.trim() || undefined,
          isActive: editForm.isActive,
          isMasterAdmin: editForm.role === 'ADMIN' ? editForm.isMasterAdmin : false,
        },
        getAuthConfig(),
      );

      setSuccess('User updated.');
      cancelEdit();
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleIssuePass = async (userId: number): Promise<void> => {
    const type = passSelections[userId] ?? 'HOURS_24';
    setError('');
    setSuccess('');

    try {
      await axios.post('/admin/passes', { userId, type }, getAuthConfig());
      setSuccess(`Issued ${type} pass.`);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRevokePass = async (passId: number): Promise<void> => {
    setError('');
    setSuccess('');

    try {
      await axios.patch(`/admin/passes/${passId}/revoke`, {}, getAuthConfig());
      setSuccess('Pass revoked.');
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <h1 className="mb-4 text-3xl font-bold">Admin Panel</h1>

      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-700">{success}</div>}

      <section className="mb-8 rounded border bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-xl font-semibold">Create User</h2>

        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreateUser}>
          <input
            className="rounded border p-2"
            placeholder="Display Name"
            value={createForm.displayName}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, displayName: e.target.value }))}
          />

          <select
            className="rounded border p-2"
            value={createForm.role}
            onChange={(e) => setCreateForm((prev) => ({
              ...prev,
              role: e.target.value as UserRole,
              isMasterAdmin: e.target.value === 'ADMIN' ? prev.isMasterAdmin : false,
            }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded border p-2">
            <input
              type="checkbox"
              checked={createForm.isMasterAdmin}
              disabled={createForm.role !== 'ADMIN'}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, isMasterAdmin: e.target.checked }))}
            />
            <span>Master Admin</span>
          </label>

          <input
            className="rounded border p-2"
            placeholder="Email (optional)"
            value={createForm.email}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <input
            className="rounded border p-2"
            placeholder="Phone (optional)"
            value={createForm.phone}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
          />

          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">
            Create User
          </button>
        </form>
      </section>

      <section className="rounded border bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-xl font-semibold">Users</h2>

        {loading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="rounded border p-3">
                {editingUserId === user.id && editForm ? (
                  <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSaveEdit}>
                    <input
                      className="rounded border p-2"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, displayName: e.target.value } : prev)}
                    />

                    <select
                      className="rounded border p-2"
                      value={editForm.role}
                      onChange={(e) => setEditForm((prev) => prev ? {
                        ...prev,
                        role: e.target.value as UserRole,
                        isMasterAdmin: e.target.value === 'ADMIN' ? prev.isMasterAdmin : false,
                      } : prev)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 rounded border p-2">
                      <input
                        type="checkbox"
                        checked={editForm.isMasterAdmin}
                        disabled={editForm.role !== 'ADMIN'}
                        onChange={(e) => setEditForm((prev) => prev ? { ...prev, isMasterAdmin: e.target.checked } : prev)}
                      />
                      <span>Master Admin</span>
                    </label>

                    <input
                      className="rounded border p-2"
                      value={editForm.email}
                      placeholder="Email"
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, email: e.target.value } : prev)}
                    />

                    <input
                      className="rounded border p-2"
                      value={editForm.phone}
                      placeholder="Phone"
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, phone: e.target.value } : prev)}
                    />

                    <label className="flex items-center gap-2 rounded border p-2">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm((prev) => prev ? { ...prev, isActive: e.target.checked } : prev)}
                      />
                      <span>Active</span>
                    </label>

                    <div className="col-span-full flex gap-2">
                      <button className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700" type="submit">
                        Save
                      </button>
                      <button className="rounded bg-gray-300 px-3 py-2 hover:bg-gray-400" type="button" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-semibold">{user.displayName}</div>
                        <div className="text-sm text-gray-600">
                          {user.role} {user.isMasterAdmin ? '• Master Admin' : ''} {user.isActive ? '• Active' : '• Inactive'}
                        </div>
                        <div className="text-sm text-gray-600">Email: {user.email || '-'}</div>
                        <div className="text-sm text-gray-600">Phone: {user.phone || '-'}</div>
                      </div>

                      <button
                        className="rounded bg-slate-700 px-3 py-2 text-white hover:bg-slate-800"
                        type="button"
                        onClick={() => startEdit(user)}
                      >
                        Edit User
                      </button>
                    </div>

                    {user.role === 'TEMP' && (
                      <div className="rounded border bg-gray-50 p-3">
                        <div className="mb-2 text-sm font-semibold">Pass Controls</div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <select
                            className="rounded border p-2"
                            value={passSelections[user.id] ?? 'HOURS_24'}
                            onChange={(e) => setPassSelections((prev) => ({
                              ...prev,
                              [user.id]: e.target.value as PassType,
                            }))}
                          >
                            {PASS_OPTIONS.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>

                          <button
                            className="rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
                            type="button"
                            onClick={() => { void handleIssuePass(user.id); }}
                          >
                            Issue Pass
                          </button>
                        </div>

                        <div className="space-y-2">
                          {user.accessPasses.length === 0 ? (
                            <p className="text-sm text-gray-600">No non-revoked passes.</p>
                          ) : (
                            user.accessPasses.map((pass) => (
                              <div key={pass.id} className="flex flex-col gap-2 rounded border bg-white p-2 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm">
                                  <div><strong>{pass.type}</strong> • {getPassStatus(pass)}</div>
                                  <div>Starts: {formatDate(pass.startsAt)}</div>
                                  <div>Expires: {formatDate(pass.expiresAt)}</div>
                                </div>

                                {!pass.isRevoked && (
                                  <button
                                    className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                                    type="button"
                                    onClick={() => { void handleRevokePass(pass.id); }}
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
