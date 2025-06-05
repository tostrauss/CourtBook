// client/src/context/ClubContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import clubService from '../services/clubService';

const ClubContext = createContext({});

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within ClubProvider');
  }
  return context;
};

export const ClubProvider = ({ children }) => {
  const [currentClub, setCurrentClub] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    identifyClub();
  }, [location]);
  
  const identifyClub = async () => {
    try {
      // Get club from subdomain
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Or from path
      const pathMatch = location.pathname.match(/^\/clubs\/([^\/]+)/);
      const clubSlug = pathMatch ? pathMatch[1] : subdomain;
      
      if (clubSlug && clubSlug !== 'app' && clubSlug !== 'www') {
        const club = await clubService.getClubBySlug(clubSlug);
        setCurrentClub(club);
        
        // Apply club branding
        applyClubBranding(club);
      }
      
      // Load user's clubs
      if (user) {
        const clubs = await clubService.getUserClubs();
        setUserClubs(clubs);
      }
    } catch (error) {
      console.error('Failed to identify club:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyClubBranding = (club) => {
    if (club.branding) {
      // Update CSS variables
      document.documentElement.style.setProperty('--primary-color', club.branding.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', club.branding.secondaryColor);
      
      // Update favicon
      if (club.branding.favicon) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = club.branding.favicon;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      // Update page title
      document.title = `${club.name} - Tennis Court Booking`;
    }
  };
  
  const switchClub = async (clubId) => {
    try {
      const response = await clubService.switchClub(clubId);
      setCurrentClub(response.club);
      applyClubBranding(response.club);
      window.location.href = `/clubs/${response.club.slug}`;
    } catch (error) {
      console.error('Failed to switch club:', error);
    }
  };
  
  return (
    <ClubContext.Provider value={{
      currentClub,
      userClubs,
      loading,
      switchClub,
      isMultiClub: userClubs.length > 1
    }}>
      {children}
    </ClubContext.Provider>
  );
};