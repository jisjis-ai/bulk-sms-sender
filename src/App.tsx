import React, { useState, useEffect } from 'react';
import { Upload, Send, Trash2, Plus, Clock, Smartphone, Terminal } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Message {
  text: string;
  recipients: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  timestamp: Date;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [delay, setDelay] = useState<number>(0);
  const [isQRScanned, setIsQRScanned] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const addTerminalOutput = (message: string) => {
    setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startSMSService = async () => {
    addTerminalOutput('Connecting to SMS service...');
    try {
      const response = await fetch(`${API_URL}/connect`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to SMS service');
      }
      
      const data = await response.json();
      if (data.success) {
        addTerminalOutput('SMS service connected successfully');
        setIsQRScanned(true);
      }
    } catch (error) {
      addTerminalOutput('Error connecting to SMS service');
      console.error('Service error:', error);
    }
  };

  const sendMessages = async () => {
    if (!currentMessage || contacts.length === 0) {
      addTerminalOutput('Error: No message or contacts specified');
      return;
    }

    setIsSending(true);
    addTerminalOutput(`Starting to send messages to ${contacts.length} contacts...`);

    for (const contact of contacts) {
      try {
        addTerminalOutput(`Sending message to ${contact.name} (${contact.phone})...`);
        
        const response = await fetch(`${API_URL}/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: contact.phone,
            message: currentMessage
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        addTerminalOutput(`✓ Message sent successfully to ${contact.name}`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } catch (error) {
        addTerminalOutput(`✗ Failed to send message to ${contact.name}`);
        console.error('Send error:', error);
      }
    }

    setIsSending(false);
    addTerminalOutput('Finished sending messages');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let newContacts: Contact[] = [];
        const content = e.target?.result as string;

        switch (fileExtension) {
          case 'csv':
            newContacts = parseCSV(content);
            break;
          case 'txt':
            newContacts = parseTXT(content);
            break;
          case 'json':
            newContacts = parseJSON(content);
            break;
          case 'xls':
          case 'xlsx':
            alert('Excel files support coming soon!');
            return;
          default:
            alert('Unsupported file format');
            return;
        }

        setContacts(prev => [...prev, ...newContacts]);
      } catch (error) {
        alert('Error parsing file. Please check the format.');
      }
    };

    if (fileExtension === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  };

  const parseCSV = (content: string): Contact[] => {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, phone] = line.split(',').map(item => item.trim());
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: name || '',
          phone: phone || ''
        };
      });
  };

  const parseTXT = (content: string): Contact[] => {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/[\t,]/).map(item => item.trim());
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: parts[0] || '',
          phone: parts[1] || parts[0] || ''
        };
      });
  };

  const parseJSON = (content: string): Contact[] => {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name || '',
      phone: item.phone || ''
    })) : [];
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) return;
    
    setContacts([...contacts, {
      id: Math.random().toString(36).substr(2, 9),
      ...newContact
    }]);
    setNewContact({ name: '', phone: '' });
    setShowNewContact(false);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Controls */}
        <div className="p-6 overflow-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk SMS Sender</h1>
            <p className="text-gray-600">Using Google Messages Web</p>
          </div>

          {/* Terminal Window */}
          <div className="mb-6 bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white">SMS Service Terminal</span>
              {!isQRScanned && (
                <button
                  onClick={startSMSService}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                >
                  Connect Service
                </button>
              )}
            </div>
            <div className="h-48 overflow-y-auto">
              {terminalOutput.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap py-1">{line}</div>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className={isQRScanned ? "text-green-500" : "text-gray-400"} />
                <div>
                  <h3 className="font-semibold">Service Status</h3>
                  <p className="text-sm text-gray-600">
                    {isQRScanned ? "Connected and ready" : "Not connected"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Contacts ({contacts.length})</h2>
              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2">
                  <Upload size={18} />
                  Import
                  <input
                    type="file"
                    accept=".csv,.txt,.json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <button
                  onClick={() => setShowNewContact(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            </div>

            {/* Contact List */}
            <div className="overflow-y-auto max-h-[200px] mb-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex justify-between items-center p-3 hover:bg-gray-50 border-b"
                >
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-600">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {contacts.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No contacts yet. Import a file or add contacts manually.
                </p>
              )}
            </div>

            {/* Add Contact Form */}
            {showNewContact && (
              <div className="mb-4 p-4 border rounded-md bg-gray-50">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full mb-2 p-2 rounded border"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full mb-2 p-2 rounded border"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewContact(false)}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContact}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Message</h2>
            <div className="mb-4">
              <textarea
                className="w-full h-32 p-3 border rounded-md resize-none"
                placeholder="Type your message here..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
              />
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">
                    Delay between messages (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    className="w-24 p-2 border rounded"
                  />
                </div>
                <button
                  onClick={sendMessages}
                  disabled={!isQRScanned || isSending || !currentMessage || contacts.length === 0}
                  className={`px-6 py-2 rounded-md flex items-center gap-2 ${
                    !isQRScanned || isSending || !currentMessage || contacts.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  <Send size={18} />
                  {isSending ? 'Sending...' : 'Send Messages'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Instructions */}
        <div className="bg-white p-6 border-l">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">How to Use</h2>
            <div className="prose">
              <ol className="list-decimal space-y-4">
                <li>Click <strong>Connect Service</strong> to start the SMS service</li>
                <li>Wait for the QR code window to appear and scan it with your Android phone</li>
                <li>Import your contacts using the <strong>Import</strong> button or add them manually</li>
                <li>Type your message in the message box</li>
                <li>Set a delay between messages if needed</li>
                <li>Click <strong>Send Messages</strong> to start sending</li>
              </ol>
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Important Notes</h3>
                <ul className="list-disc list-inside text-blue-800 space-y-2">
                  <li>Keep your phone connected to the internet while sending messages</li>
                  <li>The service will automatically handle message sending</li>
                  <li>You can monitor the progress in the terminal window</li>
                  <li>If you encounter any errors, try reconnecting the service</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;