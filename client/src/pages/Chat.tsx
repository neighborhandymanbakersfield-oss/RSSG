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
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <strong>{msg.userDisplayName} ({msg.userRole})</strong>: {msg.content}
            <small className="text-gray-500"> {new Date(msg.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="w-full p-2 border"
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="mt-2 bg-blue-500 text-white p-2">Send</button>
      </div>
    </div>
  );
}