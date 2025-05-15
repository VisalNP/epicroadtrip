// src/components/__tests__/Sidebar.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import { CATEGORY_OPTIONS } from '../../constants/appConstants';

jest.mock('../../constants/appConstants', () => ({
  CATEGORY_OPTIONS: [
    { value: 'poi', label: 'Points d\'Intérêt' },
    { value: 'hotels', label: 'Hôtels' },
    { value: 'restaurants', label: 'Restaurants' },
  ],
}));

describe('Sidebar', () => {
  const mockOnSetOrigin = jest.fn();
  const mockOnFetchForOrigin = jest.fn();
  const mockOnSetDestination = jest.fn();
  const mockOnFetchForDestination = jest.fn();
  const mockOnAddNewSearchLocation = jest.fn();

  const defaultProps = {
    origin: '',
    onSetOrigin: mockOnSetOrigin,
    onFetchForOrigin: mockOnFetchForOrigin,
    destination: '',
    onSetDestination: mockOnSetDestination,
    onFetchForDestination: mockOnFetchForDestination,
    onAddNewSearchLocation: mockOnAddNewSearchLocation,
    isLoadingOrigin: false,
    isLoadingDestination: false,
    isLoadingNewLocation: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders origin and destination inputs and search buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByLabelText(/origine/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /recherche de points d'intérêt/i })[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /recherche de points d'intérêt/i })[1]).toBeInTheDocument();
  });

  test('renders advanced search section with category, keyword, and location input', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /recherche avancée/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/categorie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot-clé \(optionnel\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^location$/i)).toBeInTheDocument(); // Exact match for "Location" label
    expect(screen.getByRole('button', { name: /^recherche$/i })).toBeInTheDocument(); // Button for advanced search
  });

  test('calls onSetOrigin when origin input changes', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);
    const originInput = screen.getByLabelText(/origine/i);
    await user.type(originInput, 'Paris');
    expect(mockOnSetOrigin).toHaveBeenCalledWith('P');
    expect(mockOnSetOrigin).toHaveBeenCalledWith('Pa');
    // ... up to 'Paris'
    expect(mockOnSetOrigin).toHaveBeenCalledTimes(5); // For "Paris"
  });

  test('calls onFetchForOrigin when origin search button is clicked with valid input', async () => {
    const user = userEvent.setup();
    // Need to provide origin via props for the button to be enabled if disabled logic is based on props.origin
    render(<Sidebar {...defaultProps} origin="Paris" />); 
    const originSearchButton = screen.getAllByRole('button', { name: /recherche de points d'intérêt/i })[0];
    
    await user.click(originSearchButton);
    // Default category is 'poi', default keyword is ''
    expect(mockOnFetchForOrigin).toHaveBeenCalledWith('Paris', 'poi', '');
  });

  test('origin search button is disabled if origin input is empty', () => {
    render(<Sidebar {...defaultProps} origin=" " />); // Empty or whitespace
    const originSearchButton = screen.getAllByRole('button', { name: /recherche de points d'intérêt/i })[0];
    expect(originSearchButton).toBeDisabled();
  });
  
  test('calls onSetDestination and onFetchForDestination', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} destination="Lyon" />);
    const destInput = screen.getByLabelText(/destination/i);
    await user.clear(destInput); // Clear if prop is set initially
    await user.type(destInput, 'Lyon');
    expect(mockOnSetDestination).toHaveBeenCalledWith('L'); 
    // ... up to 'Lyon'

    const destSearchButton = screen.getAllByRole('button', { name: /recherche de points d'intérêt/i })[1];
    await user.click(destSearchButton);
    expect(mockOnFetchForDestination).toHaveBeenCalledWith('Lyon', 'poi', '');
  });

  test('calls onAddNewSearchLocation with selected category and keyword', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    const categorySelect = screen.getByLabelText(/categorie/i);
    const keywordInput = screen.getByLabelText(/mot-clé \(optionnel\)/i);
    const newLocationInput = screen.getByLabelText(/^location$/i);
    const addNewLocationButton = screen.getByRole('button', { name: /^recherche$/i });

    await user.selectOptions(categorySelect, 'hotels');
    await user.type(keywordInput, 'Luxury');
    await user.type(newLocationInput, 'Nice');
    await user.click(addNewLocationButton);

    expect(mockOnAddNewSearchLocation).toHaveBeenCalledWith('Nice', 'hotels', 'Luxury');
    expect(newLocationInput).toHaveValue(''); // Input should clear
  });
  
  test('add new location button is disabled if location input is empty', () => {
    render(<Sidebar {...defaultProps} />);
    const addNewLocationButton = screen.getByRole('button', { name: /^recherche$/i });
    expect(addNewLocationButton).toBeDisabled();
  });

  test('displays loading state for origin search button', () => {
    render(<Sidebar {...defaultProps} origin="Paris" isLoadingOrigin={true} />);
    expect(screen.getAllByRole('button', { name: /searching.../i })[0]).toBeInTheDocument();
  });
  
  test('displays loading state for destination search button', () => {
    render(<Sidebar {...defaultProps} destination="Lyon" isLoadingDestination={true} />);
    expect(screen.getAllByRole('button', { name: /searching.../i })[1]).toBeInTheDocument();
  });

  test('displays loading state for new location search button', () => {
    render(<Sidebar {...defaultProps} isLoadingNewLocation={true} />);
    // To enable the button for this test, we need some text in newLocationSearch input
    // We can simulate this by setting initial state or by typing.
    // For simplicity, let's assume the button text changes based on isLoadingNewLocation prop
    // and internal state 'newLocationSearch' has some value.
    // A more robust way is to type into the input first.
    const user = userEvent.setup();
    const { rerender } = render(<Sidebar {...defaultProps} />);
    const newLocationInput = screen.getByLabelText(/^location$/i);
    user.type(newLocationInput, 'Cannes'); // Make button enabled by having text
    
    rerender(<Sidebar {...defaultProps} isLoadingNewLocation={true} />);
    // The button name will be just "Searching..."
    expect(screen.getByRole('button', { name: /searching.../i })).toBeInTheDocument();
  });

  test('handles Enter key press for origin search', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} origin="Paris" />);
    const originInput = screen.getByLabelText(/origine/i);
    await user.type(originInput, '{enter}');
    expect(mockOnFetchForOrigin).toHaveBeenCalledWith('Paris', 'poi', '');
  });

  test('handles Enter key press for destination search', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} destination="Lyon" />);
    const destInput = screen.getByLabelText(/destination/i);
    await user.type(destInput, '{enter}');
    expect(mockOnFetchForDestination).toHaveBeenCalledWith('Lyon', 'poi', '');
  });
  
  test('handles Enter key press for new location search', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);
    const newLocationInput = screen.getByLabelText(/^location$/i);
    await user.type(newLocationInput, 'Cannes{enter}');
    expect(mockOnAddNewSearchLocation).toHaveBeenCalledWith('Cannes', 'poi', '');
  });
});