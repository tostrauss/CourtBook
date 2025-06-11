// client/src/pages/admin/Lessons.jsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClub } from '../../context/ClubContext';
import useLessons from '../../hooks/useLessons';
import LessonForm from '../../components/booking/LessonForm';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const ITEMS_PER_PAGE = 10;

const AdminLessons = () => {
  const { selectedClub } = useClub();
  const {
    lessons,
    loading,
    fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    updateFilters,
    updateParticipantStatus
  } = useLessons();

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    if (selectedClub) {
      fetchLessons();
    }
  }, [selectedClub, fetchLessons]);

  const applyFilters = () => {
    const filters = {};
    
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    if (typeFilter !== 'all') {
      filters.type = typeFilter;
    }
    
    if (dateFilter) {
      filters.date = dateFilter;
    }
    
    updateFilters(filters);
    fetchLessons(filters);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFilter('');
    updateFilters({});
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

  const handleDeleteLesson = (id) => {
    setSelectedLessonId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (selectedLessonId) {
      await deleteLesson(selectedLessonId);
      setShowConfirm(false);
      fetchLessons();
    }
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

  const handleViewParticipants = (lesson) => {
    setCurrentLesson(lesson);
    setSelectedParticipants(lesson.participants || []);
    setShowParticipants(true);
  };

  const handleUpdateParticipantStatus = async (participantId, data) => {
    await updateParticipantStatus(currentLesson.id, participantId, data);
    // Refresh current lesson data
    const updatedLesson = await fetchLessonById(currentLesson.id);
    setCurrentLesson(updatedLesson);
    setSelectedParticipants(updatedLesson.participants || []);
  };

  // Pagination
  const filteredLessons = lessons.filter(lesson => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const coachName = lesson.coach ? 
        `${lesson.coach.first_name} ${lesson.coach.last_name}`.toLowerCase() : '';
      const courtName = lesson.court ? lesson.court.name.toLowerCase() : '';
      
      return (
        coachName.includes(searchLower) ||
        courtName.includes(searchLower) ||
        lesson.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredLessons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLessons.length / ITEMS_PER_PAGE);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!selectedClub) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manage Lessons</h1>
        <p>Please select a club to manage lessons.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Tennis Lessons</h1>
        
        <Button 
          onClick={handleCreateLesson}
          className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700"
        >
          Create New Lesson
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Status
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Type
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
                <option value="kids">Kids</option>
                <option value="beginner">Beginner</option>
                <option value="advanced">Advanced</option>
                <option value="tournament_prep">Tournament Prep</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Date
              </label>
              <input
                type="date"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                onClick={applyFilters}
                className="bg-blue-600 hover:bg-blue-700 h-10"
              >
                Apply Filters
              </Button>
              <Button
                onClick={resetFilters}
                className="bg-gray-500 hover:bg-gray-600 h-10"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Search
          </label>
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Search by coach name, court name, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-lg">No lessons found.</p>
          <Button
            onClick={handleCreateLesson}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Create Your First Lesson
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coach
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Court
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(lesson.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(`2000-01-01T${lesson.start_time}`), 'h:mm a')}
                          {' - '}
                          {format(
                            new Date(
                              new Date(`2000-01-01T${lesson.start_time}`).getTime() + 
                              lesson.duration * 60000
                            ),
                            'h:mm a'
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {lesson.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lesson.coach ? (
                          <div className="text-sm text-gray-900">
                            {lesson.coach.first_name} {lesson.coach.last_name}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not assigned</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lesson.court ? (
                          <div className="text-sm text-gray-900">
                            {lesson.court.name}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not assigned</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${parseFloat(lesson.price).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {lesson.participants ? lesson.participants.length : 0}/{lesson.max_participants}
                        </div>
                        {lesson.participants && lesson.participants.length > 0 && (
                          <button
                            onClick={() => handleViewParticipants(lesson)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View participants
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          lesson.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          lesson.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          lesson.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lesson.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditLesson(lesson)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Lesson"
        message="Are you sure you want to delete this lesson? This action cannot be undone and will remove all participant bookings as well."
      />

      <Modal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Lesson Participants"
      >
        {selectedParticipants.length === 0 ? (
          <p>No participants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Payment Status</th>
                  <th className="px-4 py-2 text-left">Attended</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedParticipants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-2">
                      {participant.participant.first_name} {participant.participant.last_name}
                    </td>
                    <td className="px-4 py-2">
                      {participant.participant.email}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={participant.payment_status}
                        onChange={(e) => 
                          handleUpdateParticipantStatus(
                            participant.user_id, 
                            { paymentStatus: e.target.value }
                          )
                        }
                        className="border rounded p-1 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="refunded">Refunded</option>
                        <option value="waived">Waived</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={participant.attended === null ? '' : participant.attended.toString()}
                        onChange={(e) => 
                          handleUpdateParticipantStatus(
                            participant.user_id, 
                            { attended: e.target.value === '' ? null : e.target.value === 'true' }
                          )
                        }
                        className="border rounded p-1 text-sm"
                      >
                        <option value="">Not marked</option>
                        <option value="true">Present</option>
                        <option value="false">Absent</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleUpdateParticipantStatus(
                          participant.user_id, 
                          { notes: prompt('Enter notes for this participant:', participant.notes || '') }
                        )}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Add Note
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Remove this participant from the lesson?')) {
                            cancelBooking(currentLesson.id, participant.user_id);
                            setShowParticipants(false);
                            fetchLessons();
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminLessons;