import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-4">
            <Phone size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kerala Emergency Response System</h1>
          <p className="text-secondary-400 mt-2">Sign in to access the admin dashboard</p>
        </div>

        <div className="bg-dark-200 rounded-xl shadow-card p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-3 text-red-300">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="your.email@kerala-ers.gov.in"
                  required
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Demo: admin@kerala-ers.gov.in
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  required
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Demo: Any password will work
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-secondary-700 bg-dark-300 text-primary-600 focus:ring-primary-600"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-400">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#forgot-password" className="text-primary-400 hover:text-primary-300">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Lock size={18} className="mr-2" />
                    Sign in
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-secondary-800">
            <div className="text-center text-sm text-secondary-500">
              <p>For emergency assistance, please call</p>
              <p className="text-white font-semibold mt-1">112</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-secondary-500">
          <p>© 2025 Kerala Emergency Response System. All rights reserved.</p>
          <p className="mt-1">Government of Kerala, India</p>
        </div>
      </div>
    </div>
  );
};

export default Login;