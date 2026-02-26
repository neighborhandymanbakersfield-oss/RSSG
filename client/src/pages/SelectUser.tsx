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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <img src="/RSSGLOGO.png" alt="Restaurant Superstar Group Logo" className="mx-auto h-16 w-auto" />
        </div>
        <h1 className="text-2xl mb-4 text-center">Who are you?</h1>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user.id)}
              className="w-full p-3 border rounded hover:bg-gray-50 flex justify-between items-center"
            >
              <span className="font-medium">{user.displayName}</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{user.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}