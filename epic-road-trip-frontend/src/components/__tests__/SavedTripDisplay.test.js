// src/components/__tests__/SavedTripsDisplay.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavedTripsDisplay from '../SavedTripsDisplay';

const mockSavedTrips = [
  { _id: 'trip1', name: 'Summer Vacation', origin: 'Paris', destination: 'Nice', waypoints: [{ name: 'Lyon' }] },
  { _id: 'trip2', name: 'Weekend Getaway', origin: 'London', destination: 'Oxford', waypoints: [] },
];

describe('SavedTripsDisplay', () => {
  const mockOnLoadTrip = jest.fn();
  const mockOnDeleteTrip = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    savedTrips: mockSavedTrips,
    onLoadTrip: mockOnLoadTrip,
    onDeleteTrip: mockOnDeleteTrip,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    mockOnLoadTrip.mockClear();
    mockOnDeleteTrip.mockClear();
    mockOnClose.mockClear();
  });

  test('renders the modal with title and close button', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /your saved trips/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument(); // Close icon in header
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument(); // Footer close button
  });

  test('displays saved trips correctly', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
    expect(screen.getByText(/from: paris to: nice \(1 stops\)/i)).toBeInTheDocument();
    expect(screen.getByText('Weekend Getaway')).toBeInTheDocument();
    expect(screen.getByText(/from: london to: oxford \(0 stops\)/i)).toBeInTheDocument();
  });

  test('displays "no saved trips" message when savedTrips array is empty', () => {
    render(<SavedTripsDisplay {...defaultProps} savedTrips={[]} />);
    expect(screen.getByText(/you have no saved trips yet/i)).toBeInTheDocument();
  });

  test('calls onLoadTrip when a trip name or "Load" button is clicked', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    
    // Click on trip name
    fireEvent.click(screen.getByText('Summer Vacation'));
    expect(mockOnLoadTrip).toHaveBeenCalledWith(mockSavedTrips[0]);

    // Click on "Load" button (assuming "Load" is the accessible name or part of title)
    // There might be multiple "Load" buttons, one for each trip.
    const loadButtons = screen.getAllByRole('button', { name: /load/i });
    fireEvent.click(loadButtons[1]); // Click load for the second trip
    expect(mockOnLoadTrip).toHaveBeenCalledWith(mockSavedTrips[1]);
    expect(mockOnLoadTrip).toHaveBeenCalledTimes(2);
  });

  test('calls onDeleteTrip when "Delete" button is clicked', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    // There might be multiple "Delete" buttons.
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]); // Delete the first trip
    expect(mockOnDeleteTrip).toHaveBeenCalledWith('trip1');
  });

  test('calls onClose when header close button is clicked', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when footer close button is clicked', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  test('calls onClose when clicking outside the modal content', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    // The modal container is the first child of the dialog
    fireEvent.click(screen.getByRole('dialog', {hidden: true}).firstChild);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when clicking inside the modal content', () => {
    render(<SavedTripsDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('heading', { name: /your saved trips/i }));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('displays default trip name if trip.name is missing', () => {
    const tripWithoutName = { _id: 'trip3', origin: 'A', destination: 'B', waypoints: [] };
    render(<SavedTripsDisplay {...defaultProps} savedTrips={[tripWithoutName]} />);
    expect(screen.getByText(`Trip to B`)).toBeInTheDocument();
  });
});