import { Loader2 } from 'lucide-react';

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
      <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
    </div>
  );
}
