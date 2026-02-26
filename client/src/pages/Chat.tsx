import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface Message {
  id: number;
  content: string;
  createdAt: string;
  userDisplayName: string;
  userRole: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Fetch history
    axios.get('/messages/history', { withCredentials: true }).then((res) => setMessages(res.data));

    // Connect socket
    const s = io();
    setSocket(s);

    const selectedUserId = localStorage.getItem('selectedUserId');
    s.emit('join', { selectedUserId });

    s.on('message:new', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!content.trim() || !socket) return;
    const selectedUserId = localStorage.getItem('selectedUserId');
    socket.emit('message:new', { content, selectedUserId });
    setContent('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow p-4 flex items-center">
        <img src="/RSSGLOGO.png" alt="Restaurant Superstar Group Logo" className="h-8 w-auto mr-4" />
        <h1 className="text-xl font-bold">Restaurant Superstar Group Chat</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2 p-2 bg-white rounded shadow">
            <strong className="text-blue-600">{msg.userDisplayName} ({msg.userRole})</strong>: {msg.content}
            <small className="text-gray-500 block"> {new Date(msg.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 p-2 border rounded-l"
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600">Send</button>
        </div>
      </div>
    </div>
  );
}