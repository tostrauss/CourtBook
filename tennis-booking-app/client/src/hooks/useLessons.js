// client/src/hooks/useLessons.js
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import lessonService from '../services/lessonService';
import { useAuth } from '../context/AuthContext';

const useLessons = (initialFilters = {}) => {
  const [lessons, setLessons] = useState([]);
  const [userLessons, setUserLessons] = useState([]);
  const [coachLessons, setCoachLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Fetch all lessons with filtering
  const fetchLessons = useCallback(async (filterParams = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const appliedFilters = filterParams || filters;
      const response = await lessonService.getLessons(appliedFilters);
      setLessons(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch lessons');
      toast.error(err.response?.data?.message || 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Fetch a specific lesson by ID
  const fetchLessonById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await lessonService.getLessonById(id);
      setCurrentLesson(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch lesson');
      toast.error(err.response?.data?.message || 'Failed to fetch lesson');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a new lesson
  const createLesson = useCallback(async (lessonData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await lessonService.createLesson(lessonData);
      toast.success('Lesson created successfully');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lesson');
      toast.error(err.response?.data?.message || 'Failed to create lesson');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update an existing lesson
  const updateLesson = useCallback(async (id, lessonData) => {
    setLoading(true);
    setError(null);
    
    try {
      await lessonService.updateLesson(id, lessonData);
      toast.success('Lesson updated successfully');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update lesson');
      toast.error(err.response?.data?.message || 'Failed to update lesson');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Delete a lesson
  const deleteLesson = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      await lessonService.deleteLesson(id);
      toast.success('Lesson deleted successfully');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lesson');
      toast.error(err.response?.data?.message || 'Failed to delete lesson');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Book a lesson
  const bookLesson = useCallback(async (id, userId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await lessonService.bookLesson(id, userId);
      toast.success('Lesson booked successfully');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book lesson');
      toast.error(err.response?.data?.message || 'Failed to book lesson');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Cancel a lesson booking
  const cancelBooking = useCallback(async (lessonId, participantId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      await lessonService.cancelBooking(lessonId, participantId);
      toast.success('Booking cancelled successfully');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get lessons booked by the current user
  const fetchUserLessons = useCallback(async (userId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await lessonService.getUserLessons(userId);
      setUserLessons(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user lessons');
      toast.error(err.response?.data?.message || 'Failed to fetch user lessons');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get lessons taught by a coach
  const fetchCoachLessons = useCallback(async (coachId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await lessonService.getCoachLessons(coachId);
      setCoachLessons(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch coach lessons');
      toast.error(err.response?.data?.message || 'Failed to fetch coach lessons');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update participant status (attendance or payment)
  const updateParticipantStatus = useCallback(async (lessonId, participantId, data) => {
    setLoading(true);
    setError(null);
    
    try {
      await lessonService.updateParticipantStatus(lessonId, participantId, data);
      toast.success('Participant status updated successfully');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update participant status');
      toast.error(err.response?.data?.message || 'Failed to update participant status');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update filters and refetch lessons
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
  }, []);
  
  // Reset filters to initial state
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  
  // Load user's lessons on component mount if user is logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'coach') {
        fetchCoachLessons();
      } else {
        fetchUserLessons();
      }
    }
  }, [user, fetchUserLessons, fetchCoachLessons]);
  
  return {
    lessons,
    userLessons,
    coachLessons,
    currentLesson,
    loading,
    error,
    filters,
    fetchLessons,
    fetchLessonById,
    createLesson,
    updateLesson,
    deleteLesson,
    bookLesson,
    cancelBooking,
    fetchUserLessons,
    fetchCoachLessons,
    updateParticipantStatus,
    updateFilters,
    resetFilters
  };
};

export default useLessons;