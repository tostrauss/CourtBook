// client/src/components/booking/LessonForm.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Button from '../common/Button';
import Input from '../common/Input';
import CoachSelector from './CoachSelector';
import { useClub } from '../../context/ClubContext';
import useCourts from '../../hooks/useCourts';

const lessonTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'kids', label: 'Kids' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'tournament_prep', label: 'Tournament Preparation' }
];

const recurringTypes = [
  { value: '', label: 'Not Recurring' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const LessonForm = ({ lesson, onSubmit, isSubmitting, submitLabel = 'Save' }) => {
  const { selectedClub } = useClub();
  const { courts, fetchCourts } = useCourts();
  
  const [formData, setFormData] = useState({
    coachId: '',
    courtId: '',
    type: 'individual',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: 60,
    maxParticipants: 1,
    price: 0,
    notes: '',
    recurringType: '',
    recurringEndDate: ''
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    if (selectedClub) {
      fetchCourts();
    }
  }, [selectedClub, fetchCourts]);
  
  useEffect(() => {
    if (lesson) {
      setFormData({
        coachId: lesson.coach_id || '',
        courtId: lesson.court_id || '',
        type: lesson.type || 'individual',
        date: lesson.date ? format(new Date(lesson.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: lesson.start_time || '09:00',
        duration: lesson.duration || 60,
        maxParticipants: lesson.max_participants || 1,
        price: lesson.price || 0,
        notes: lesson.notes || '',
        recurringType: lesson.recurring_type || '',
        recurringEndDate: lesson.recurring_end_date 
          ? format(new Date(lesson.recurring_end_date), 'yyyy-MM-dd') 
          : ''
      });
    }
  }, [lesson]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type' && value === 'individual') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        maxParticipants: 1
      }));
    } else if (name === 'recurringType' && value === '') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        recurringEndDate: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleCoachChange = (coachId) => {
    setFormData(prev => ({ ...prev, coachId }));
    if (errors.coachId) {
      setErrors(prev => ({ ...prev, coachId: undefined }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.coachId) {
      newErrors.coachId = 'Coach is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Lesson type is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.duration || formData.duration < 15 || formData.duration > 360) {
      newErrors.duration = 'Duration must be between 15 and 360 minutes';
    }
    
    if (!formData.maxParticipants || formData.maxParticipants < 1 || formData.maxParticipants > 20) {
      newErrors.maxParticipants = 'Max participants must be between 1 and 20';
    }
    
    if (formData.price === undefined || formData.price === null || formData.price < 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    if (formData.recurringType && !formData.recurringEndDate) {
      newErrors.recurringEndDate = 'End date is required for recurring lessons';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        coachId: formData.coachId,
        courtId: formData.courtId || null,
        type: formData.type,
        date: formData.date,
        startTime: formData.startTime,
        duration: parseInt(formData.duration, 10),
        maxParticipants: parseInt(formData.maxParticipants, 10),
        price: parseFloat(formData.price),
        notes: formData.notes,
        recurringType: formData.recurringType || null,
        recurringEndDate: formData.recurringEndDate || null
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CoachSelector 
        selectedCoach={formData.coachId} 
        onChange={handleCoachChange}
        clubId={selectedClub?.id}
      />
      {errors.coachId && <p className="text-red-500 text-sm mt-1">{errors.coachId}</p>}
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Court (Optional)
        </label>
        <select
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          name="courtId"
          value={formData.courtId}
          onChange={handleChange}
        >
          <option value="">No specific court</option>
          {courts.map(court => (
            <option key={court.id} value={court.id}>
              {court.name} ({court.type}, {court.surface})
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Lesson Type
        </label>
        <select
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          name="type"
          value={formData.type}
          onChange={handleChange}
        >
          {lessonTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        
        <div>
          <Input
            label="Start Time"
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            error={errors.startTime}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Duration (minutes)"
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            error={errors.duration}
            min={15}
            max={360}
            step={15}
          />
        </div>
        
        <div>
          <Input
            label="Max Participants"
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            error={errors.maxParticipants}
            min={1}
            max={20}
            disabled={formData.type === 'individual'}
          />
        </div>
      </div>
      
      <div>
        <Input
          label="Price ($)"
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          error={errors.price}
          min={0}
          step={0.01}
        />
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Notes (Optional)
        </label>
        <textarea
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Recurring Schedule
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            name="recurringType"
            value={formData.recurringType}
            onChange={handleChange}
          >
            {recurringTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        {formData.recurringType && (
          <div>
            <Input
              label="Recurring End Date"
              type="date"
              name="recurringEndDate"
              value={formData.recurringEndDate}
              onChange={handleChange}
              error={errors.recurringEndDate}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default LessonForm;