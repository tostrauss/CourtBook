// client/src/components/booking/LessonCard.jsx
import React from 'react';
import { format } from 'date-fns';
import Button from '../common/Button';
import Card from '../common/Card';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

const LessonCard = ({ 
  lesson, 
  onBook, 
  onCancel, 
  onEdit, 
  onDelete,
  isUserBooked = false,
  showActions = true,
  className = ''
}) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [confirmMessage, setConfirmMessage] = React.useState('');
  const { user } = useAuth();

  const handleAction = (action, message) => {
    setConfirmAction(() => action);
    setConfirmMessage(message);
    setShowConfirm(true);
  };

  const confirmHandler = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirm(false);
  };

  const isCoach = user?.role === 'coach';
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || (isCoach && lesson.coach?.id === user?.id);
  const isFull = lesson.participants?.length >= lesson.max_participants;
  const isPast = new Date(`${lesson.date}T${lesson.start_time}`) < new Date();
  const isCancelled = lesson.status === 'cancelled';

  return (
    <Card className={`relative ${className}`}>
      {isCancelled && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl">
          CANCELLED
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} Lesson
        </h3>
        <p className="text-gray-600">
          {format(new Date(lesson.date), 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-gray-600">
          {format(new Date(`2000-01-01T${lesson.start_time}`), 'h:mm a')} - 
          {format(
            new Date(new Date(`2000-01-01T${lesson.start_time}`).getTime() + lesson.duration * 60000),
            ' h:mm a'
          )}
        </p>
      </div>
      
      <div className="mb-4">
        <p>
          <span className="font-semibold">Coach:</span> {lesson.coach ? `${lesson.coach.first_name} ${lesson.coach.last_name}` : 'Not assigned'}
        </p>
        {lesson.court && (
          <p>
            <span className="font-semibold">Court:</span> {lesson.court.name}
          </p>
        )}
        <p>
          <span className="font-semibold">Price:</span> ${parseFloat(lesson.price).toFixed(2)}
        </p>
        <p>
          <span className="font-semibold">Availability:</span> {lesson.participants?.length || 0}/{lesson.max_participants} spots
        </p>
        {lesson.notes && (
          <p className="mt-2 text-sm italic">
            {lesson.notes}
          </p>
        )}
      </div>
      
      {showActions && (
        <div className="flex flex-wrap gap-2 mt-4">
          {!isUserBooked && !isFull && !isPast && !isCancelled && (
            <Button
              onClick={() => handleAction(
                () => onBook(lesson.id),
                'Are you sure you want to book this lesson?'
              )}
              className="bg-green-600 hover:bg-green-700"
            >
              Book Lesson
            </Button>
          )}
          
          {isUserBooked && !isPast && !isCancelled && (
            <Button
              onClick={() => handleAction(
                () => onCancel(lesson.id),
                'Are you sure you want to cancel your booking?'
              )}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Booking
            </Button>
          )}
          
          {canEdit && (
            <>
              <Button
                onClick={() => onEdit(lesson)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit
              </Button>
              <Button
                onClick={() => handleAction(
                  () => onDelete(lesson.id),
                  'Are you sure you want to delete this lesson? This action cannot be undone.'
                )}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      )}
      
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmHandler}
        title="Confirm Action"
        message={confirmMessage}
      />
    </Card>
  );
};

export default LessonCard;