// client/src/components/club/ClubSelector.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { useClub } from '../../context/ClubContext';

const ClubSelector = () => {
  const { currentClub, userClubs, switchClub, isMultiClub } = useClub();
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isMultiClub) return null;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100"
      >
        {currentClub?.branding?.logo ? (
          <img src={currentClub.branding.logo} alt={currentClub.name} className="h-6 w-6" />
        ) : (
          <div className="h-6 w-6 rounded bg-primary-500 flex items-center justify-center text-white text-xs">
            {currentClub?.name?.[0]}
          </div>
        )}
        <span className="font-medium">{currentClub?.name}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 w-64 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-2 py-1">Switch Club</p>
            {userClubs.map(({ club, role }) => (
              <button
                key={club._id}
                onClick={() => {
                  switchClub(club._id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-2 py-2 rounded hover:bg-gray-50 ${
                  club._id === currentClub?._id ? 'bg-gray-50' : ''
                }`}
              >
                {club.branding?.logo ? (
                  <img src={club.branding.logo} alt={club.name} className="h-8 w-8 rounded" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gray-300 flex items-center justify-center">
                    {club.name[0]}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{club.name}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
                {club._id === currentClub?._id && (
                  <Check className="h-4 w-4 text-primary-500" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t p-2">
            <Link
              to="/clubs/join"
              className="flex items-center space-x-2 px-2 py-2 text-sm text-primary-600 hover:bg-gray-50 rounded"
            >
              <Plus className="h-4 w-4" />
              <span>Join Another Club</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// client/src/pages/platform/ClubDirectory.jsx
const ClubDirectory = () => {
  const [clubs, setClubs] = useState([]);
  const [filters, setFilters] = useState({
    city: '',
    features: [],
    search: ''
  });
  
  const { data: clubsData } = useQuery(
    ['clubDirectory', filters],
    () => clubService.searchClubs(filters)
  );
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Find Tennis Clubs in Austria</h1>
      
      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Input
          placeholder="Search clubs..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          icon={Search}
        />
        <select
          className="form-input"
          value={filters.city}
          onChange={(e) => setFilters({...filters, city: e.target.value})}
        >
          <option value="">All Cities</option>
          <option value="vienna">Vienna</option>
          <option value="graz">Graz</option>
          <option value="linz">Linz</option>
          <option value="salzburg">Salzburg</option>
          <option value="innsbruck">Innsbruck</option>
        </select>
      </div>
      
      {/* Club Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubsData?.clubs.map(club => (
          <Card key={club._id} className="hover:shadow-lg transition-shadow">
            <div className="aspect-w-16 aspect-h-9">
              <img 
                src={club.images?.[0] || '/default-club.jpg'} 
                alt={club.name}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-semibold mb-2">{club.name}</h3>
              <p className="text-gray-600 text-sm mb-3">
                <MapPin className="inline h-4 w-4 mr-1" />
                {club.address.city}, {club.address.state}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-primary text-xs">
                  {club.stats.totalCourts} Courts
                </span>
                <span className="badge badge-success text-xs">
                  {club.stats.totalMembers} Members
                </span>
              </div>
              <div className="flex justify-between items-center">
                <Link
                  to={`/clubs/${club.slug}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Details
                </Link>
                <Button
                  as={Link}
                  to={`/clubs/${club.slug}/join`}
                  size="sm"
                  variant="outline"
                >
                  Join Club
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};