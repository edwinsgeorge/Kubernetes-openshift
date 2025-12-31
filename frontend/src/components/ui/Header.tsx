import React, { useState } from 'react';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <header className="bg-dark-200 border-b border-secondary-800 py-4 px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-secondary-500" />
            </div>
            <input
              type="text"
              placeholder="Search calls, resources, locations..."
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-full hover:bg-secondary-800 transition-colors">
            <Bell size={20} className="text-secondary-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
          </button>
          
          <div className="relative">
            <button
              className="flex items-center gap-2"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src={user?.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-secondary-400 capitalize">{user?.role || 'User'}</p>
              </div>
              <ChevronDown size={16} className="text-secondary-400" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-dark-200 border border-secondary-700 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <a href="#profile" className="block px-4 py-2 text-sm text-secondary-300 hover:bg-secondary-800">
                    Your Profile
                  </a>
                  <a href="#settings" className="block px-4 py-2 text-sm text-secondary-300 hover:bg-secondary-800">
                    Settings
                  </a>
                  <a href="#logout" className="block px-4 py-2 text-sm text-secondary-300 hover:bg-secondary-800">
                    Sign out
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;