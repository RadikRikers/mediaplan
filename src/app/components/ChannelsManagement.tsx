import { useState } from 'react';
import { CommunicationChannel } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';

interface ChannelsManagementProps {
  channels: CommunicationChannel[];
  onAdd: (channel: Omit<CommunicationChannel, 'id' | 'createdAt'>) => void;
  onUpdate: (channelId: string, updates: Partial<CommunicationChannel>) => void;
  onDelete: (channelId: string) => void;
}

export function ChannelsManagement({ channels, onAdd, onUpdate, onDelete }: ChannelsManagementProps) {
  const [newChannelName, setNewChannelName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    if (!newChannelName.trim()) return;
    onAdd({ name: newChannelName });
    setNewChannelName('');
  };

  const handleStartEdit = (channel: CommunicationChannel) => {
    setEditingId(channel.id);
    setEditingName(channel.name);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingId) return;
    onUpdate(editingId, { name: editingName });
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Каналы коммуникации</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Название канала"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>

        <div className="space-y-2">
          {channels.map(channel => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              {editingId === channel.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 mr-2"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="text-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Badge variant="outline">{channel.name}</Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(channel)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(channel.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {channels.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Нет каналов коммуникации
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
