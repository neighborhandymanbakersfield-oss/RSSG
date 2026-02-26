import { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  id: number;
  displayName: string;
  role: string;
  isActive: boolean;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    axios.get('/admin/users', { withCredentials: true }).then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Admin Panel</h1>
      <div>
        <h2>Users</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.displayName} - {user.role} - {user.isActive ? 'Active' : 'Inactive'}
            </li>
          ))}
        </ul>
      </div>
      {/* Add forms for create user, etc. */}
    </div>
  );
}