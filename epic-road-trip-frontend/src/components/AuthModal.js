// src/components/AuthModal.js
import React, { useState } from 'react';
// import { X } from 'react-feather'; // Example for close icon

function AuthModal({ mode, setMode, onLogin, onRegister, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login') {
      onLogin({ username, password });
    } else {
      onRegister({ username, password });
    }
  };

  return (
    <div 
      className="bg-slate-200 bg-opacity-30 backdrop-blur-md fixed inset-0 flex items-center justify-center z-1002 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-200 bg-opacity-90 backdrop-blur-md card w-full max-w-md p-6 sm:p-8" // Using .card from index.css
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-border">
          <h2 className="text-xl font-semibold text-brand-text">{mode === 'login' ? 'Login' : 'Register'}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {/* <X size={24} /> */}
             × {/* Placeholder, replace with icon */}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username-auth" className="block text-sm font-medium text-brand-text-secondary mb-1">Username</label>
            <input
              type="text"
              id="username-auth" // Changed id to be more specific
              className="input-field" // Using .input-field from index.css
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password-auth" className="block text-sm font-medium text-brand-text-secondary mb-1">Password</label>
            <input
              type="password"
              id="password-auth" // Changed id
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary w-full" // Using .btn-primary from index.css
          >
            {mode === 'login' ? 'Login' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-center text-sm text-brand-blue hover:text-brand-blue-dark underline"
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default AuthModal;