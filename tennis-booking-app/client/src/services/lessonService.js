// client/src/services/lessonService.js
import api from './api';

const getLessons = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return api.get(`/api/lessons${query}`);
};

const getLessonById = async (id) => {
  return api.get(`/api/lessons/${id}`);
};

const createLesson = async (lessonData) => {
  return api.post('/api/lessons', lessonData);
};

const updateLesson = async (id, lessonData) => {
  return api.put(`/api/lessons/${id}`, lessonData);
};

const deleteLesson = async (id) => {
  return api.delete(`/api/lessons/${id}`);
};

const bookLesson = async (id, userId = null) => {
  const data = userId ? { userId } : {};
  return api.post(`/api/lessons/${id}/book`, data);
};

const cancelBooking = async (lessonId, participantId = null) => {
  const url = participantId 
    ? `/api/lessons/${lessonId}/participants/${participantId}`
    : `/api/lessons/${lessonId}/participants`;
  return api.delete(url);
};

const getUserLessons = async (userId = null) => {
  const url = userId 
    ? `/api/lessons/user/${userId}`
    : '/api/lessons/user';
  return api.get(url);
};

const getCoachLessons = async (coachId = null) => {
  const url = coachId 
    ? `/api/lessons/coach/${coachId}`
    : '/api/lessons/coach';
  return api.get(url);
};

const updateParticipantStatus = async (lessonId, participantId, data) => {
  return api.patch(`/api/lessons/${lessonId}/participants/${participantId}`, data);
};

export default {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  bookLesson,
  cancelBooking,
  getUserLessons,
  getCoachLessons,
  updateParticipantStatus
};