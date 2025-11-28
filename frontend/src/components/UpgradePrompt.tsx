import { AlertTriangle, Zap, X } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentCount: number;
  limit: number;
  tier: string;
}

const UpgradePrompt = ({ isOpen, onClose, onUpgrade, currentCount, limit, tier }: UpgradePromptProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e11]/95 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-8 max-w-md w-full relative shadow-2xl shadow-yellow-500/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Warning Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="text-yellow-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Database Limit Reached</h2>
          <p className="text-gray-400">
            You've used all <span className="text-yellow-400 font-bold">{currentCount}/{limit}</span> databases on your <span className="text-purple-400 font-semibold">{tier}</span> plan.
          </p>
        </div>

        {/* Usage bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Databases used</span>
            <span className="text-yellow-400 font-mono">{currentCount}/{limit}</span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Zap size={20} />
            Upgrade Now
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Maybe later
          </button>
        </div>

        {/* Benefits preview */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 text-center mb-3">Upgrade to Pro and get:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              10 databases
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              Priority support
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              API access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
