import { useEffect, useState } from 'react';
import axios from 'axios';

interface Settings {
  maxUsers: number;
  allowNewTempUsers: boolean;
  // etc.
}

export default function MasterSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    axios.get('/master-settings', { withCredentials: true }).then((res) => setSettings(res.data.settings));
  }, []);

  const updateSettings = async () => {
    if (!settings) return;
    await axios.put('/master-settings', settings, { withCredentials: true });
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Master Settings</h1>
      <form onSubmit={(e) => { e.preventDefault(); updateSettings(); }}>
        <label>Max Users: <input type="number" value={settings.maxUsers} onChange={(e) => setSettings({ ...settings, maxUsers: +e.target.value })} /></label>
        {/* Add other fields */}
        <button type="submit" className="mt-4 bg-blue-500 text-white p-2">Save</button>
      </form>
    </div>
  );
}