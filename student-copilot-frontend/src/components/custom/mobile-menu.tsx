import BlurIn from "@/components/magicui/blur-in";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface MenuItem {
  label: string;
  id: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  onItemClick: (id: string) => void;
}

const MobileMenu = ({ isOpen, onClose, items, onItemClick }: MobileMenuProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full bg-background/80 backdrop-blur-sm transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6">
            {shouldAnimate && (
              <BlurIn word="StudentCopilot" className='tracking-normal leading-normal text-primary font-bold text-2xl font-heading' />
            )}
            <button onClick={onClose} className="text-foreground">
              <X size={24} />
            </button>
          </div>
          <nav className="flex flex-col space-y-4 p-6">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  onItemClick(item.id);
                  onClose();
                }}
                className="text-foreground hover:text-primary text-left"
              >
                {shouldAnimate ? (
                  <BlurIn word={item.label} className="leading-normal tracking-normal text-md" />
                ) : (
                  <span className="text-md">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
