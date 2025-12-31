import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Phone, 
  Headphones, 
  FileText, 
  Truck, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Users, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Call Queue', path: '/calls', icon: <Phone size={20} /> },
    { name: 'Live Monitoring', path: '/monitoring', icon: <Headphones size={20} /> },
    { name: 'Transcripts', path: '/transcripts', icon: <FileText size={20} /> },
    { name: 'Resources', path: '/resources', icon: <Truck size={20} /> },
    { name: 'Social Media', path: '/social', icon: <MessageSquare size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
  ];
  
  return (
    <div className="h-screen w-64 bg-dark-200 border-r border-secondary-800 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Kerala ERS</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            // Skip admin-only items for non-admin users
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-secondary-400 hover:bg-secondary-800 hover:text-secondary-200'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-secondary-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-secondary-400 hover:bg-secondary-800 hover:text-secondary-200 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;