// client/src/pages/Lessons.jsx
import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import useLessons from '../hooks/useLessons';
import LessonCard from '../components/booking/LessonCard';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LessonForm from '../components/booking/LessonForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';

const LESSONS_PER_PAGE = 8;

const Lessons = () => {
  const { user } = useAuth();
  const { selectedClub } = useClub();
  const {
    lessons,
    userLessons,
    loading,
    fetchLessons,
    bookLesson,
    cancelBooking,
    createLesson,
    updateLesson,
    deleteLesson,
    updateFilters
  } = useLessons();

  const [showModal, setShowModal] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchDate, setSearchDate] = useState('');

  const isCoach = user?.role === 'coach';
  const isAdmin = user?.role === 'admin';
  const canCreateLessons = isCoach || isAdmin;

  useEffect(() => {
    if (selectedClub) {
      fetchLessons({ 
        clubId: selectedClub.id,
        startDate: activeTab === 'upcoming' ? format(new Date(), 'yyyy-MM-dd') : undefined
      });
    }
  }, [selectedClub, fetchLessons, activeTab]);

  const handleSearch = () => {
    updateFilters({ date: searchDate });
    fetchLessons({ date: searchDate });
  };

  const resetSearch = () => {
    setSearchDate('');
    updateFilters({ 
      date: undefined,
      startDate: activeTab === 'upcoming' ? format(new Date(), 'yyyy-MM-dd') : undefined
    });
    fetchLessons({ 
      startDate: activeTab === 'upcoming' ? format(new Date(), 'yyyy-MM-dd') : undefined
    });
  };

  const handleBookLesson = async (lessonId) => {
    await bookLesson(lessonId);
    fetchLessons();
  };

  const handleCancelBooking = async (lessonId) => {
    await cancelBooking(lessonId);
    fetchLessons();
  };

  const handleCreateLesson = () => {
    setCurrentLesson(null);
    setShowModal(true);
  };

  const handleEditLesson = (lesson) => {
    setCurrentLesson(lesson);
    setShowModal(true);
  };

  const handleDeleteLesson = async (lessonId) => {
    await deleteLesson(lessonId);
    fetchLessons();
  };

  const handleSubmitLesson = async (formData) => {
    setIsSubmitting(true);
    try {
      if (currentLesson) {
        await updateLesson(currentLesson.id, formData);
      } else {
        await createLesson(formData);
      }
      setShowModal(false);
      fetchLessons();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter lessons based on user bookings
  const isUserBookedForLesson = (lesson) => {
    return userLessons.some(booking => booking.lesson.id === lesson.id);
  };

  // Pagination
  const indexOfLastLesson = currentPage * LESSONS_PER_PAGE;
  const indexOfFirstLesson = indexOfLastLesson - LESSONS_PER_PAGE;
  const currentLessons = lessons.slice(indexOfFirstLesson, indexOfLastLesson);
  const totalPages = Math.ceil(lessons.length / LESSONS_PER_PAGE);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!selectedClub) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Tennis Lessons</h1>
        <p>Please select a club to view available lessons.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Tennis Lessons</h1>
        
        {canCreateLessons && (
          <Button 
            onClick={handleCreateLesson}
            className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700"
          >
            Create New Lesson
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="flex">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 shadow appearance-none border rounded-l py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <Button
                onClick={handleSearch}
                className="rounded-l-none bg-blue-600 hover:bg-blue-700"
              >
                Search
              </Button>
              <Button
                onClick={resetSearch}
                className="ml-2 bg-gray-500 hover:bg-gray-600"
              >
                Reset
              </Button>
            </div>
          </div>
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
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : currentLessons.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-lg">No lessons found.</p>
          {canCreateLessons && (
            <Button
              onClick={handleCreateLesson}
              className="mt-4 bg-green-600 hover:bg-green-700"
            >
              Create Your First Lesson
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onBook={handleBookLesson}
                onCancel={handleCancelBooking}
                onEdit={handleEditLesson}
                onDelete={handleDeleteLesson}
                isUserBooked={isUserBookedForLesson(lesson)}
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={currentLesson ? 'Edit Lesson' : 'Create New Lesson'}
      >
        <LessonForm
          lesson={currentLesson}
          onSubmit={handleSubmitLesson}
          isSubmitting={isSubmitting}
          submitLabel={currentLesson ? 'Update Lesson' : 'Create Lesson'}
        />
      </Modal>
    </div>
  );
};

export default Lessons;