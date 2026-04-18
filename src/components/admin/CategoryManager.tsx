import { Plus, Trash2, FolderPlus } from 'lucide-react';
import React, { useState } from 'react';
import { Category } from '../../types';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function CategoryManager({ categories, onAdd, onDelete }: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(newName.trim());
      setNewName('');
    } catch (error) {
      console.error(error);
      alert('Failed to add category');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-dark border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
          <FolderPlus className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold">Category Management</h3>
          <p className="text-white/40 text-sm">Organize your gallery sections</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="New category name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 h-12 px-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50 transition-all text-sm"
        />
        <button
          disabled={isAdding}
          type="submit"
          className="px-6 h-12 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {categories.map(category => (
          <div
            key={category.id}
            className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-brand-primary/30 transition-all hover:bg-white/[0.05]"
          >
            <span className="font-bold text-sm tracking-tight">{category.name}</span>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${category.name}"?`)) onDelete(category.id);
              }}
              className="p-2.5 rounded-xl text-text-dim hover:text-red-500 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-white/5 md:bg-transparent"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
