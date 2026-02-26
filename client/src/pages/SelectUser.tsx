import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface User {
  id: number;
  displayName: string;
  role: string;
}

export default function SelectUser() {
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/users/active', { withCredentials: true }).then((res) => setUsers(res.data));
  }, []);

  const selectUser = (userId: number) => {
    localStorage.setItem('selectedUserId', userId.toString());
    navigate('/chat');
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl mb-4">Who are you?</h1>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user.id)}
              className="w-full p-2 border text-left flex justify-between"
            >
              <span>{user.displayName}</span>
              <span className="bg-gray-200 px-2 rounded">{user.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}