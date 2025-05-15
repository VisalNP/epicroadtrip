import React from 'react';

function PremiumModal({ onClose, onProceedToPayment, isLoadingPayment }) {
  return (
    <div
      className="bg-slate-200 bg-opacity-30 backdrop-blur-md fixed inset-0 flex items-center justify-center z-1002 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-200 bg-opacity-90 backdrop-blur-md card w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-border">
          <h2 className="text-xl font-semibold text-brand-text">Epic Road Trip Premium</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
             ×
          </button>
        </div>
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-brand-text-secondary text-center">
            Rejoindre Epic Road Trip Premium!
          </h3>
          <p className="text-center text-brand-text-secondary">
            Gagnez accès à des fonctionnalités exclusives et planifiez vos aventures comme jamais auparavant.
          </p>
          <ul className="list-disc list-inside space-y-2 text-brand-text-secondary pl-4">
            <li>Itinéraires Illimités</li>
            <li>Enregistrer et Charger des Voyages Illimités</li>
            <li>Cartes Exclusives & POIs</li>
            <li>Expérience Sans Publicité</li>
            <li>Support Prioritaire</li>
          </ul>
          <p className="text-center text-3xl font-bold text-brand-blue my-4">
            10€ <span className="text-base font-normal text-brand-text-secondary">/ mois</span>
          </p>
          <button
            onClick={onProceedToPayment}
            className="btn-primary w-full"
            disabled={isLoadingPayment}
          >
            {isLoadingPayment ? 'Processing...' : 'Proceed to Payment'}
          </button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Vous serez redirigé en toute sécurité vers Stripe pour compléter votre abonnement.
          </p>
        </div>
      </div>
    </div>
  );
}
export default PremiumModal;