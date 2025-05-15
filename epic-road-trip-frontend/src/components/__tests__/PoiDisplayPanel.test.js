// src/components/__tests__/PoiDisplayPanel.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PoiDisplayPanel from '../PoiDisplayPanel';
import { CATEGORY_OPTIONS } from '../../constants/appConstants'; // Will use mock if jest.mock is called

// Mock the constants if you want to control them or if they are complex
jest.mock('../../constants/appConstants', () => ({
  CATEGORY_OPTIONS: [
    { value: 'poi', label: 'Points of Interest (Mocked)' },
    { value: 'hotels', label: 'Hotels (Mocked)' },
    { value: 'customCat', label: 'Custom Category (Mocked)' },
  ],
}));

const mockSearchedLocations = [
  { id: 'origin', name: 'Paris', pois: [{ originalId: 'p1', name: 'Eiffel Tower', addressString: 'Champ de Mars, Paris' }], isLoading: false, error: null, category: 'poi' },
  { id: 'dest', name: 'Lyon', pois: [{ originalId: 'p2', name: 'Place Bellecour', addressString: 'Lyon Centre' }], isLoading: false, error: null, category: 'hotels' },
  { id: 'custom1', name: 'Nice', pois: [], isLoading: true, error: null, category: 'customCat' },
];

const mockPoi = {
  originalId: 'p3',
  name: 'Louvre Museum',
  addressString: 'Rue de Rivoli, Paris',
  shortDescription: 'Famous art museum.',
  location: { type: 'Point', coordinates: [2.3376, 48.8606] },
  dataSource: 'datatourisme'
};

describe('PoiDisplayPanel', () => {
  const mockSetActiveTabId = jest.fn();
  const mockOnRemoveSearchTab = jest.fn();
  const mockOnAddWaypoint = jest.fn();
  const mockOnToggleMinimize = jest.fn();

  const defaultProps = {
    searchedLocations: mockSearchedLocations,
    activeTabId: 'origin',
    setActiveTabId: mockSetActiveTabId,
    onRemoveSearchTab: mockOnRemoveSearchTab,
    onAddWaypoint: mockOnAddWaypoint,
    isMinimized: false,
    onToggleMinimize: mockOnToggleMinimize,
  };

  beforeEach(() => {
    // Clear mocks before each test
    mockSetActiveTabId.mockClear();
    mockOnRemoveSearchTab.mockClear();
    mockOnAddWaypoint.mockClear();
    mockOnToggleMinimize.mockClear();
  });

  test('renders tabs and active tab content when not minimized', () => {
    render(<PoiDisplayPanel {...defaultProps} />);

    // Check tabs
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Lyon')).toBeInTheDocument();
    expect(screen.getByText('Nice')).toBeInTheDocument();

    // Check active tab content (Paris)
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    expect(screen.getByText('Champ de Mars, Paris')).toBeInTheDocument();

    // Check add waypoint button for the POI
    const addButton = screen.getAllByRole('button', { name: /ajouter/i });
    expect(addButton.length).toBeGreaterThan(0); // Eiffel Tower has location

    // Ensure minimize button shows "Minimize Panel" text (via title or accessible name)
    expect(screen.getByTitle('Minimize Panel')).toBeInTheDocument();
  });

  test('calls setActiveTabId when a tab is clicked', () => {
    render(<PoiDisplayPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Lyon'));
    expect(mockSetActiveTabId).toHaveBeenCalledWith('dest');
  });

  test('calls onRemoveSearchTab when close icon on a tab is clicked', () => {
    render(<PoiDisplayPanel {...defaultProps} activeTabId="dest" />); // Active tab is Lyon
    // The close button is part of the tab button for "Lyon"
    // Assuming '×' is the text content for the close span
    const lyonTabButton = screen.getByText('Lyon').closest('button');
    const closeButton = lyonTabButton.querySelector('span[class*="hover:text-red-500"]');
    
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(mockOnRemoveSearchTab).toHaveBeenCalledWith('dest');
  });

   test('does not show close icon for origin and destination tabs', () => {
    render(<PoiDisplayPanel {...defaultProps} activeTabId="origin" />);
    const originTabButton = screen.getByText('Paris').closest('button'); // 'Paris' is origin
    expect(originTabButton.querySelector('span[class*="hover:text-red-500"]')).toBeNull();

    // To test destination, we need it in searchedLocations
    const propsWithDest = {
        ...defaultProps,
        searchedLocations: [
            ...mockSearchedLocations,
            { id: 'destination', name: 'Berlin', pois: [], isLoading: false, error: null, category: 'poi' }
        ],
        activeTabId: 'destination'
    };
    render(<PoiDisplayPanel {...propsWithDest} />);
    const destinationTabButton = screen.getByText('Berlin').closest('button');
    expect(destinationTabButton.querySelector('span[class*="hover:text-red-500"]')).toBeNull();
  });


  test('calls onAddWaypoint when "Ajouter" button is clicked', () => {
    const activeLocationData = mockSearchedLocations.find(loc => loc.id === 'origin');
    render(<PoiDisplayPanel {...defaultProps} />);
    const addButton = screen.getAllByRole('button', { name: /ajouter/i })[0]; // Assuming first POI
    fireEvent.click(addButton);
    expect(mockOnAddWaypoint).toHaveBeenCalledWith(activeLocationData.pois[0]);
  });

  test('displays loading message when isLoading is true for active tab', () => {
    render(<PoiDisplayPanel {...defaultProps} activeTabId="custom1" />);
    expect(screen.getByText('Loading Custom Category (Mocked) for Nice...')).toBeInTheDocument();
  });

  test('displays error message when error exists for active tab', () => {
    const propsWithError = {
      ...defaultProps,
      searchedLocations: [
        { id: 'origin', name: 'Paris', pois: [], isLoading: false, error: 'Network Error', category: 'poi' }
      ],
      activeTabId: 'origin',
    };
    render(<PoiDisplayPanel {...propsWithError} />);
    expect(screen.getByText('Error: Network Error')).toBeInTheDocument();
  });

  test('displays "No POIs found" message correctly', () => {
    const propsNoPois = {
      ...defaultProps,
      searchedLocations: [
        { id: 'origin', name: 'EmptyPlace', pois: [], isLoading: false, error: null, category: 'hotels' }
      ],
      activeTabId: 'origin',
    };
    render(<PoiDisplayPanel {...propsNoPois} />);
    expect(screen.getByText('No Hotels (Mocked) found for EmptyPlace.')).toBeInTheDocument();
  });

  test('displays "Select a tab" message when no active tab is valid but locations exist', () => {
    render(<PoiDisplayPanel {...defaultProps} activeTabId="invalidId" />); // No location has this id
    expect(screen.getByText('Select a tab to see details.')).toBeInTheDocument();
  });

  test('displays "Recherchez des lieux" message when no locations exist', () => {
    render(<PoiDisplayPanel {...defaultProps} searchedLocations={[]} activeTabId="" />);
    expect(screen.getByText('Recherchez des lieux.')).toBeInTheDocument();
  });
  
  test('toggles minimize state and hides content when minimized', () => {
    const { rerender } = render(<PoiDisplayPanel {...defaultProps} isMinimized={false} />);
    
    // Content should be visible
    expect(screen.getByText('Paris')).toBeInTheDocument(); // A tab name
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument(); // A POI name

    // Click minimize button
    fireEvent.click(screen.getByTitle('Minimize Panel'));
    expect(mockOnToggleMinimize).toHaveBeenCalledTimes(1);

    // Rerender with isMinimized = true
    rerender(<PoiDisplayPanel {...defaultProps} isMinimized={true} />);
    
    // Content should be hidden (or significantly reduced)
    // Tabs and POI list are inside a fragment conditioned by !isMinimized
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
    expect(screen.queryByText('Eiffel Tower')).not.toBeInTheDocument();
    
    // Minimize button should now show "Expand Panel" text
    expect(screen.getByTitle('Expand Panel')).toBeInTheDocument();

    // Click expand button
    fireEvent.click(screen.getByTitle('Expand Panel'));
    expect(mockOnToggleMinimize).toHaveBeenCalledTimes(2); // Called again
  });

  test('does not render add waypoint button if POI has no location', () => {
    const poiWithoutLocation = { originalId: 'noLocPoi', name: 'No Location POI', addressString: 'Some Address', location: null };
    const propsWithNoLocationPoi = {
      ...defaultProps,
      searchedLocations: [
        { id: 'origin', name: 'Test', pois: [poiWithoutLocation], isLoading: false, error: null, category: 'poi' }
      ],
      activeTabId: 'origin',
    };
    render(<PoiDisplayPanel {...propsWithNoLocationPoi} />);
    expect(screen.getByText('No Location POI')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter/i })).not.toBeInTheDocument();
  });

  test('correctly displays category label from CATEGORY_OPTIONS', () => {
    render(<PoiDisplayPanel {...defaultProps} activeTabId="dest" />); // 'dest' has category 'hotels'
    // The loading message shows the category
    const propsLoadingHotel = {
        ...defaultProps,
        searchedLocations: [
          { id: 'dest', name: 'Lyon', pois: [], isLoading: true, error: null, category: 'hotels' },
        ],
        activeTabId: 'dest',
      };
    render(<PoiDisplayPanel {...propsLoadingHotel} />);
    expect(screen.getByText('Loading Hotels (Mocked) for Lyon...')).toBeInTheDocument();
  });

  test('falls back to category value if label not found in CATEGORY_OPTIONS', () => {
    const propsUnknownCategory = {
        ...defaultProps,
        searchedLocations: [
          { id: 'unknown', name: 'Unknown City', pois: [], isLoading: true, error: null, category: 'exotic_stuff' },
        ],
        activeTabId: 'unknown',
      };
    render(<PoiDisplayPanel {...propsUnknownCategory} />);
    expect(screen.getByText('Loading exotic_stuff for Unknown City...')).toBeInTheDocument();
  });

});