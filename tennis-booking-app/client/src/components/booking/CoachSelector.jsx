// client/src/components/booking/CoachSelector.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CoachSelector = ({ selectedCoach, onChange, clubId }) => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCoaches = async () => {
      setLoading(true);
      try {
        // Fetch users with coach role from the selected club
        const response = await api.get('/api/users', {
          params: { 
            role: 'coach',
            clubId: clubId 
          }
        });
        setCoaches(response.data);
      } catch (err) {
        setError('Failed to load coaches');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token && clubId) {
      fetchCoaches();
    }
  }, [token, clubId]);

  if (loading) return <div className="text-center py-4">Loading coaches...</div>;
  if (error) return <div className="text-red-500 py-2">{error}</div>;

  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="coach">
        Coach
      </label>
      <select
        id="coach"
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        value={selectedCoach || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || coaches.length === 0}
      >
        <option value="">Select a coach</option>
        {coaches.map((coach) => (
          <option key={coach.id} value={coach.id}>
            {coach.first_name} {coach.last_name}
          </option>
        ))}
      </select>
      {coaches.length === 0 && !loading && (
        <p className="text-sm text-gray-500 mt-1">No coaches available</p>
      )}
    </div>
  );
};

export default CoachSelector;