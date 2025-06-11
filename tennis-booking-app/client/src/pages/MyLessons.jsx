// client/src/pages/MyLessons.jsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import useLessons from '../hooks/useLessons';
import LessonCard from '../components/booking/LessonCard';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';

const LESSONS_PER_PAGE = 8;

const MyLessons = () => {
  const { user } = useAuth();
  const { selectedClub } = useClub();
  const {
    userLessons,
    coachLessons,
    loading,
    fetchUserLessons,
    fetchCoachLessons,
    cancelBooking,
    updateLesson,
    deleteLesson
  } = useLessons();

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [displayLessons, setDisplayLessons] = useState([]);
  
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (selectedClub && user) {
      if (isCoach) {
        fetchCoachLessons();
      } else {
        fetchUserLessons();
      }
    }
  }, [selectedClub, user, isCoach, fetchUserLessons, fetchCoachLessons]);

  useEffect(() => {
    const lessons = isCoach ? coachLessons : userLessons.map(booking => booking.lesson);
    
    const filtered = lessons.filter(lesson => {
      const lessonDate = new Date(`${lesson.date}T${lesson.start_time}`);
      const today = new Date();
      
      if (activeTab === 'upcoming') {
        return lessonDate >= today;
      } else if (activeTab === 'past') {
        return lessonDate < today;
      }
      return true;
    });
    
    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`);
      const dateB = new Date(`${b.date}T${b.start_time}`);
      return dateA - dateB;
    });
    
    setDisplayLessons(filtered);
  }, [activeTab, userLessons, coachLessons, isCoach]);

  const handleCancelBooking = async (lessonId) => {
    await cancelBooking(lessonId);
    if (isCoach) {
      fetchCoachLessons();
    } else {
      fetchUserLessons();
    }
  };

  const handleCancelLesson = async (lessonId) => {
    await updateLesson(lessonId, { status: 'cancelled' });
    fetchCoachLessons();
  };

  const handleDeleteLesson = async (lessonId) => {
    await deleteLesson(lessonId);
    fetchCoachLessons();
  };

  // Pagination
  const indexOfLastLesson = currentPage * LESSONS_PER_PAGE;
  const indexOfFirstLesson = indexOfLastLesson - LESSONS_PER_PAGE;
  const currentLessons = displayLessons.slice(indexOfFirstLesson, indexOfLastLesson);
  const totalPages = Math.ceil(displayLessons.length / LESSONS_PER_PAGE);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!selectedClub) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Tennis Lessons</h1>
        <p>Please select a club to view your lessons.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isCoach ? 'My Lessons Schedule' : 'My Tennis Lessons'}
      </h1>

      <div className="mb-6">
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('upcoming')}
            className={`${
              activeTab === 'upcoming'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Upcoming
          </Button>
          <Button
            onClick={() => setActiveTab('all')}
            className={`${
              activeTab === 'all'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All Lessons
          </Button>
          <Button
            onClick={() => setActiveTab('past')}
            className={`${
              activeTab === 'past'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Past Lessons
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : currentLessons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-lg">You have no {activeTab} lessons.</p>
          <Button
            onClick={() => window.location.href = '/lessons'}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Browse Available Lessons
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onCancel={isCoach ? handleCancelLesson : handleCancelBooking}
                onDelete={isCoach ? handleDeleteLesson : null}
                isUserBooked={!isCoach}
                showActions={true}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyLessons;