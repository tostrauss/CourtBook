// client/src/pages/Courts.jsx
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import courtService from '../services/courtService';
import { MapPin, ShieldCheck, Filter, Search as SearchIcon, Info, Sun, Moon, DollarSign, ArrowRight, Eye, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'; // Renamed Search to SearchIcon
import { toast } from 'react-toastify'; // For potential notifications

// Common Components
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Input from '../components/common/Input';
import Pagination from '../components/common/Pagination';

const Courts = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ type: '', surface: '', searchTerm: '' });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const courtsPerPage = 9;

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
      setCurrentPage(1); // Reset page when search term changes
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [filters.searchTerm]);

  const { data: courtsData, isLoading, error } = useQuery(
    ['publicCourtsList', filters.type, filters.surface, debouncedSearchTerm, currentPage, courtsPerPage], // Include currentPage and courtsPerPage for server-side pagination if implemented
    () => courtService.getCourts({ 
      isActive: true,
      type: filters.type || undefined,
      surface: filters.surface || undefined,
      searchTerm: debouncedSearchTerm || undefined, // Pass debouncedSearchTerm to backend
      // Add pagination params if backend supports it:
      // page: currentPage,
      // limit: courtsPerPage,
    }),
    {
        staleTime: 5 * 60 * 1000,
        keepPreviousData: true, // Good for pagination experience
        onError: (err) => {
            console.error("Failed to fetch courts:", err);
            // Error is displayed in the UI
        }
    }
  );

  // If backend handles pagination and search, `allCourts` would be `courtsData?.data`
  // and `totalCourts` would be `courtsData?.count`.
  // For now, assuming backend returns all matching courts and we paginate client-side.
  // This will be less efficient with many courts.
  const allMatchingCourts = courtsData?.data || []; 
  const totalMatchingCourts = courtsData?.count || allMatchingCourts.length; // Use backend count if available

  // Client-side pagination (if backend doesn't paginate based on search)
  const currentCourts = useMemo(() => {
    // If backend paginates, this slice is not needed.
    // If backend returns ALL results for the search, then paginate here.
    // For this example, let's assume backend does NOT paginate yet for the public list.
    const indexOfLastCourt = currentPage * courtsPerPage;
    const indexOfFirstCourt = indexOfLastCourt - courtsPerPage;
    return allMatchingCourts.slice(indexOfFirstCourt, indexOfLastCourt);
  }, [allMatchingCourts, currentPage, courtsPerPage]);
  
  const totalPages = Math.ceil(totalMatchingCourts / courtsPerPage);


  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    if (filterName !== 'searchTerm') { // Search term is debounced
        setCurrentPage(1);
    }
  };

  const handleBookCourt = (courtId) => {
    navigate(`/book-court?courtId=${courtId}`); 
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Our Tennis Courts</h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500">
          Find the perfect court for your next match. All courts are maintained to the highest standards.
        </p>
      </div>

      <Card className="mb-8 shadow-md">
        <div className="p-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-primary-600"/> Find Your Court
            </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input
              id="searchTerm"
              label="Search Courts"
              placeholder="Name, description..."
              icon={SearchIcon}
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              inputClassName="text-sm"
              labelClassName="text-sm"
            />
            <div>
              <label htmlFor="court-type-filter" className="form-label text-sm">Court Type</label>
              <select 
                id="court-type-filter"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="form-input w-full text-sm"
              >
                <option value="">All Types</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="covered">Covered</option>
              </select>
            </div>
            <div>
              <label htmlFor="court-surface-filter" className="form-label text-sm">Surface</label>
              <select 
                id="court-surface-filter"
                value={filters.surface}
                onChange={(e) => handleFilterChange('surface', e.target.value)}
                className="form-input w-full text-sm"
              >
                <option value="">All Surfaces</option>
                <option value="hard">Hard</option>
                <option value="clay">Clay</option>
                <option value="grass">Grass</option>
                <option value="synthetic">Synthetic</option>
              </select>
            </div>
             <Button 
                variant="secondary" 
                size="md"
                onClick={() => {
                    setFilters({ type: '', surface: '', searchTerm: '' });
                    // Debounced search term will also clear
                }}
                className="w-full sm:w-auto h-10" // Ensure button aligns with inputs
            >
                Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="text-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading courts...</p>
        </div>
      )}

      {!isLoading && error && (
         <Card className="bg-error-50 border-error-200">
            <div className="card-body text-center text-error-700 py-16">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-error-400"/>
                <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                <p className="text-sm mt-1">{error.response?.data?.message || "Could not load court information. Please try again later."}</p>
            </div>
        </Card>
      )}

      {!isLoading && !error && currentCourts.length === 0 && (
        <Card>
            <div className="card-body text-center py-20 text-gray-500">
                <SearchIcon className="h-16 w-16 mx-auto mb-4 text-gray-300"/>
                <p className="text-xl font-semibold text-gray-700">No courts match your criteria.</p>
                <p className="text-sm mt-1">Try adjusting your filters or check back later.</p>
            </div>
        </Card>
      )}

      {!isLoading && !error && currentCourts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {currentCourts.map((court) => (
              <Card key={court._id} className="flex flex-col justify-between hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden">
                <div>
                    {court.images && court.images.length > 0 ? (
                        <img 
                            src={court.images[0].url || `https://placehold.co/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(court.name)}`} 
                            alt={court.images[0].caption || court.name} 
                            className="w-full h-52 object-cover" // Increased height
                            onError={(e) => e.target.src = `https://placehold.co/600x400/e0e7ff/4f46e5?text=Image+Error`}
                        />
                    ) : (
                        <div className="w-full h-52 bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center rounded-t-xl">
                            <MapPin className="h-20 w-20 text-primary-300"/>
                        </div>
                    )}
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-primary-700 mb-2 truncate" title={court.name}>{court.name}</h2>
                    <div className="flex items-center text-sm text-gray-500 mb-1.5">
                      <MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" /> <span className="capitalize">{court.type}</span> <span className="mx-1.5">•</span> <span className="capitalize">{court.surface}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <DollarSign className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" /> 
                      Base: €{court.pricing?.basePrice?.toFixed(2) || 'N/A'} / hr
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[2.5rem]"> 
                      {court.description || 'A great court for your tennis sessions.'}
                    </p>
                    {court.features && court.features.length > 0 && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-1.5">
                                {court.features.slice(0,3).map(feature => (
                                    <span key={feature} className="badge badge-primary text-xs capitalize !bg-indigo-100 !text-indigo-700">{feature.replace('_', ' ')}</span>
                                ))}
                                {court.features.length > 3 && <span className="text-xs text-gray-400 self-center">+{court.features.length - 3} more</span>}
                            </div>
                        </div>
                    )}
                  </div>
                </div>
                
                <div className="p-5 border-t border-gray-100 bg-gray-50">
                  <Button 
                    onClick={() => handleBookCourt(court._id)} 
                    variant="primary" 
                    fullWidth
                    icon={CalendarIcon}
                    className="shadow-sm hover:shadow-md"
                  >
                    View Availability & Book
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Courts;
