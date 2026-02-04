'use client';

import { useState } from 'react';
import { Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { Currency } from '@/lib/items/types';

interface CurrencyTrackerProps {
  currency: Currency;
  characterSlug: string;
  onUpdate: () => void;
}

export default function CurrencyTracker({
  currency,
  characterSlug,
  onUpdate,
}: CurrencyTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState(currency);

  const totalGP = (
    currency.cp / 100 +
    currency.sp / 10 +
    currency.ep / 2 +
    currency.gp +
    currency.pp * 10
  ).toFixed(2);

  const handleSave = async () => {
    await fetch(`/api/characters/${characterSlug}/currency`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', ...editValues }),
    });
    setEditMode(false);
    onUpdate();
  };

  const coinTypes: { key: keyof Currency; label: string; color: string }[] = [
    { key: 'pp', label: 'PP', color: 'text-slate-300' },
    { key: 'gp', label: 'GP', color: 'text-yellow-400' },
    { key: 'ep', label: 'EP', color: 'text-blue-300' },
    { key: 'sp', label: 'SP', color: 'text-slate-400' },
    { key: 'cp', label: 'CP', color: 'text-orange-400' },
  ];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-700/50 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-medium">Currency</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-mono">{totalGP} gp</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700">
          {editMode ? (
            /* Edit Mode */
            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {coinTypes.map(({ key, label, color }) => (
                  <div key={key}>
                    <label className={`text-xs ${color}`}>{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={editValues[key]}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          [key]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-center focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditValues(currency);
                  }}
                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Display Mode */
            <div className="pt-3">
              <div className="flex items-center justify-between mb-3">
                {coinTypes.map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <div className={`text-lg font-mono font-bold ${color}`}>{currency[key]}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setEditValues(currency);
                  setEditMode(true);
                }}
                className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Edit Currency
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
