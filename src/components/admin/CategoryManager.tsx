import { Plus, Trash2, FolderPlus } from 'lucide-react';
import React, { useState } from 'react';
import { Category } from '../../types';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => Promise<string | null>;
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
    <div className="glass-dark border border-white/5 rounded-3xl p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
          <FolderPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold">Categories</h3>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-none">Management</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="New category..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 h-10 px-4 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-xs"
        />
        <button
          disabled={isAdding}
          type="submit"
          className="px-4 h-10 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {categories.filter((cat, index, self) => 
          cat && cat.id && index === self.findIndex((c) => c.id === cat.id)
        ).map((category, idx) => (
          <div
            key={`cat-mgr-${category.id || idx}-${idx}`}
            className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-brand-primary/30 transition-all hover:bg-white/[0.05]"
          >
            <span className="font-bold text-xs tracking-tight">{category.name}</span>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${category.name}"?`)) onDelete(category.id);
              }}
              className="p-1.5 rounded-lg text-text-dim hover:text-red-500 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Delete Category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
