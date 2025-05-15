// src/components/__tests__/TripItineraryDisplay.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TripItineraryDisplay from '../TripItineraryDisplay';

const mockWaypoint = {
  originalId: 'wp1',
  placeId: 'gwp1', // if it's a google place
  name: 'Stop 1: Museum',
  dataSource: 'datatourisme', // or 'google-places'
  location: { type: 'Point', coordinates: [2.0, 48.0] }
};

const mockDirectionsResponse = {
  routes: [
    {
      legs: [
        { distance: { value: 100000 }, duration: { value: 3600 } }, // 100km, 1hr
        { distance: { value: 50000 }, duration: { value: 1800 } },  // 50km, 30min
      ],
    },
  ],
};

describe('TripItineraryDisplay', () => {
  const mockOnRemoveWaypoint = jest.fn();
  const mockOnCalculateRoute = jest.fn();
  const mockOnSaveTrip = jest.fn();
  const mockOnClose = jest.fn();
  // onReorderWaypoints is not directly tested via UI events here but could be if UI supported it.

  const defaultProps = {
    origin: 'Paris',
    destination: 'Lyon',
    waypoints: [mockWaypoint],
    directionsResponse: null,
    onRemoveWaypoint: mockOnRemoveWaypoint,
    onCalculateRoute: mockOnCalculateRoute,
    onSaveTrip: mockOnSaveTrip,
    isUserLoggedIn: false,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    mockOnRemoveWaypoint.mockClear();
    mockOnCalculateRoute.mockClear();
    mockOnSaveTrip.mockClear();
    mockOnClose.mockClear();
  });

  test('renders basic structure with title and close button', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /votre voyage actuel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
  });

  test('displays origin, destination, and waypoints', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Lyon')).toBeInTheDocument();
    expect(screen.getByText(`1. ${mockWaypoint.name}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer l'arrêt/i })).toBeInTheDocument();
  });

  test('calls onRemoveWaypoint when a waypoint remove button is clicked', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /supprimer l'arrêt/i }));
    expect(mockOnRemoveWaypoint).toHaveBeenCalledWith(mockWaypoint.originalId);
  });

  test('displays "empty itinerary" message when no trip data', () => {
    render(<TripItineraryDisplay {...defaultProps} origin="" destination="" waypoints={[]} />);
    expect(screen.getByText(/votre itinéraire est vide/i)).toBeInTheDocument();
  });

  test('displays trip details when directionsResponse is provided', () => {
    render(<TripItineraryDisplay {...defaultProps} directionsResponse={mockDirectionsResponse} />);
    expect(screen.getByText(/distance totale :/i)).toBeInTheDocument();
    expect(screen.getByText('150.0 km')).toBeInTheDocument(); // 100000 + 50000 / 1000
    expect(screen.getByText(/durée estimée :/i)).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument(); // 3600 + 1800
  });

  test('shows "Calculer l’itinéraire" button and calls onCalculateRoute', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    const calculateButton = screen.getByRole('button', { name: /calculer l’itinéraire/i });
    expect(calculateButton).toBeInTheDocument();
    fireEvent.click(calculateButton);
    expect(mockOnCalculateRoute).toHaveBeenCalledTimes(1);
  });

  test('shows "Recalculer l’itinéraire" if directionsResponse exists', () => {
    render(<TripItineraryDisplay {...defaultProps} directionsResponse={mockDirectionsResponse} />);
    expect(screen.getByRole('button', { name: /recalculer l’itinéraire/i })).toBeInTheDocument();
  });

  test('disables calculate route button if no origin or destination', () => {
    render(<TripItineraryDisplay {...defaultProps} origin="" />);
    expect(screen.getByRole('button', { name: /calculer l’itinéraire/i })).toBeDisabled();
  });

  test('shows save trip section only when logged in and has trip data', () => {
    const { rerender } = render(<TripItineraryDisplay {...defaultProps} isUserLoggedIn={false} />);
    expect(screen.queryByPlaceholderText(/nommez ce voyage/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sauvegarder ce voyage/i })).not.toBeInTheDocument();

    rerender(<TripItineraryDisplay {...defaultProps} isUserLoggedIn={true} />);
    expect(screen.getByPlaceholderText(/nommez ce voyage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sauvegarder ce voyage/i })).toBeInTheDocument();

    rerender(<TripItineraryDisplay {...defaultProps} isUserLoggedIn={true} origin="" destination="" waypoints={[]} />);
    expect(screen.queryByPlaceholderText(/nommez ce voyage/i)).not.toBeInTheDocument();
  });

  test('handles trip name input and calls onSaveTrip', async () => {
    const user = userEvent.setup();
    render(<TripItineraryDisplay {...defaultProps} isUserLoggedIn={true} />);
    
    const nameInput = screen.getByPlaceholderText(/nommez ce voyage/i);
    await user.type(nameInput, 'My Test Trip');
    expect(nameInput).toHaveValue('My Test Trip');

    fireEvent.click(screen.getByRole('button', { name: /sauvegarder ce voyage/i }));
    expect(mockOnSaveTrip).toHaveBeenCalledWith('My Test Trip');
  });

  test('calls onSaveTrip with default name if trip name input is empty', () => {
    render(<TripItineraryDisplay {...defaultProps} isUserLoggedIn={true} />);
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder ce voyage/i }));
    expect(mockOnSaveTrip).toHaveBeenCalledWith(`Trip from Paris to Lyon`); // Default format
  });

  test('calls onClose when close button is clicked', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  test('calls onClose when clicking outside the modal content', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('dialog', {hidden: true}).firstChild);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when clicking inside the modal content', () => {
    render(<TripItineraryDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('heading', { name: /votre voyage actuel/i }));
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});