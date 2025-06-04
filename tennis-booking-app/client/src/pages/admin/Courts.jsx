import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Lock, Unlock, MapPin, Clock, DollarSign, Sun, Moon, AlertTriangle } from 'lucide-react'
import { format, parse } from 'date-fns' // Added parse
import { useQuery, useMutation, useQueryClient } from 'react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import courtService from '../../services/courtService'
import { toast } from 'react-toastify'
import { useForm, Controller, useFieldArray } from 'react-hook-form' // Added Controller and useFieldArray
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const courtSchema = yup.object({
  name: yup.string().required('Court name is required').max(100, 'Name too long'),
  description: yup.string().max(500, 'Description too long'),
  type: yup.string().oneOf(['indoor', 'outdoor', 'covered']).required('Court type is required'),
  surface: yup.string().oneOf(['hard', 'clay', 'grass', 'synthetic']).required('Surface type is required'),
  features: yup.array().of(yup.string()),
  bookingRules: yup.object({
    minBookingDuration: yup.number().typeError('Must be a number').min(15).max(240).required('Min duration is required'),
    maxBookingDuration: yup.number().typeError('Must be a number').min(15).max(240).required('Max duration is required')
      .when('minBookingDuration', (minBookingDuration, schema) => {
        return minBookingDuration ? schema.min(minBookingDuration, 'Max must be >= min duration') : schema;
      }),
    advanceBookingDays: yup.number().typeError('Must be a number').min(1).max(90).required('Advance booking days is required'),
    cancellationDeadlineHours: yup.number().typeError('Must be a number').min(0).max(168).required('Cancellation deadline is required'),
    slotIncrementMinutes: yup.number().typeError('Must be a number')
      .oneOf([15, 30, 60], 'Slot increment must be 15, 30, or 60')
      .required('Slot increment is required')
  }),
  operatingHours: yup.object(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].reduce((acc, day) => {
      acc[day] = yup.object({
        open: yup.string().matches(timeRegex, 'Invalid time (HH:MM)').required(`${day} open time required`),
        close: yup.string().matches(timeRegex, 'Invalid time (HH:MM)').required(`${day} close time required`)
          .test('is-after-open', `${day} close time must be after open time`, function(value) {
            const { open } = this.parent;
            if (!open || !value || !timeRegex.test(open) || !timeRegex.test(value)) return true; // Let other validators handle format
            return parse(value, 'HH:mm', new Date()) > parse(open, 'HH:mm', new Date());
          }),
      });
      return acc;
    }, {})
  ),
  pricing: yup.object({
    basePrice: yup.number().typeError('Must be a number').min(0).required('Base price is required'),
    peakHourMultiplier: yup.number().typeError('Must be a number').min(1, 'Multiplier must be at least 1').required('Peak multiplier is required'),
    // peakHours array validation can be complex, simplified for now or handled with useFieldArray
  }),
  peakHoursDefinition: yup.array().of(
    yup.object().shape({
        days: yup.array().of(yup.string().oneOf(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, "Select at least one day"),
        startTime: yup.string().matches(timeRegex, 'Invalid time (HH:MM)').required("Start time is required"),
        endTime: yup.string().matches(timeRegex, 'Invalid time (HH:MM)').required("End time is required")
         .test('is-after-peak-start', 'Peak end time must be after peak start time', function(value) {
            const { startTime } = this.parent;
            if (!startTime || !value || !timeRegex.test(startTime) || !timeRegex.test(value)) return true;
            return parse(value, 'HH:mm', new Date()) > parse(startTime, 'HH:mm', new Date());
          }),
    })
  ),
  isActive: yup.boolean()
});


const blockSchema = yup.object({
  reason: yup.string().oneOf(['maintenance', 'event', 'weather', 'other']).required('Reason is required'),
  description: yup.string().max(200, "Description too long"),
  startDateTime: yup.date().typeError('Valid date/time required').required('Start date/time is required'),
  endDateTime: yup.date().typeError('Valid date/time required')
    .min(yup.ref('startDateTime'), 'End time must be after start time')
    .required('End date/time is required')
});

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const AdminCourts = () => {
  const [editingCourt, setEditingCourt] = useState(null);
  const [deletingCourtId, setDeletingCourtId] = useState(null);
  const [blockingCourt, setBlockingCourt] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: courtsData, isLoading } = useQuery('adminCourts', () => 
    courtService.getCourts({ showInactive: true, includeDetails: true }) // Assuming backend can provide full details
  );
  
  const courts = courtsData?.data || [];
  
  const defaultOperatingHours = daysOfWeek.reduce((acc, day) => {
    acc[day] = { open: '08:00', close: '22:00' };
    return acc;
  }, {});

  const {
    register: registerCourt,
    handleSubmit: handleSubmitCourt,
    formState: { errors: courtErrors },
    reset: resetCourtForm,
    setValue: setCourtValue,
    watch: watchCourt,
    control: courtControl // For Controller and useFieldArray
  } = useForm({
    resolver: yupResolver(courtSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'outdoor',
      surface: 'hard',
      features: [],
      bookingRules: {
        minBookingDuration: 60,
        maxBookingDuration: 60,
        advanceBookingDays: 7,
        cancellationDeadlineHours: 2,
        slotIncrementMinutes: 30
      },
      operatingHours: defaultOperatingHours,
      pricing: {
        basePrice: 25,
        peakHourMultiplier: 1.2 // (30 EUR peak / 25 EUR base)
      },
      peakHoursDefinition: [{ days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '17:00', endTime: '22:00' }],
      isActive: true
    }
  });

  const { fields: peakHourFields, append: appendPeakHour, remove: removePeakHour } = useFieldArray({
    control: courtControl,
    name: "peakHoursDefinition"
  });
  
  const {
    register: registerBlock,
    handleSubmit: handleSubmitBlock,
    formState: { errors: blockErrors },
    reset: resetBlockForm
  } = useForm({
    resolver: yupResolver(blockSchema)
  });
  
  const createCourtMutation = useMutation(courtService.createCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCourts');
      toast.success('Court created successfully');
      setShowCreateModal(false);
      resetCourtForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create court');
    }
  });
  
  const updateCourtMutation = useMutation(
    ({ id, data }) => courtService.updateCourt(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCourts');
        toast.success('Court updated successfully');
        setEditingCourt(null);
        resetCourtForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update court');
      }
    }
  );
  
  const deleteCourtMutation = useMutation(courtService.deleteCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCourts');
      toast.success('Court deleted successfully');
      setDeletingCourtId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete court');
    }
  });
  
  const blockCourtMutation = useMutation(
    ({ id, data }) => courtService.blockCourt(id, data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('adminCourts');
        toast.success(`Court blocked successfully.`);
        if (response.affectedBookings > 0) {
          toast.info(`${response.affectedBookings} booking(s) were cancelled.`);
        }
        setBlockingCourt(null);
        resetBlockForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to block court');
      }
    }
  );
  
  const unblockCourtMutation = useMutation( // Not used in UI yet, but good to have
    ({ courtId, blockId }) => courtService.unblockCourt(courtId, blockId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCourts');
        toast.success('Court unblocked successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to unblock court');
      }
    }
  );
  
  const handleEditCourt = (court) => {
    setEditingCourt(court);
    // Transform peakHours from backend to peakHoursDefinition for form
    const peakHoursForForm = court.pricing?.peakHours?.map(ph => ({
        days: [daysOfWeek[ph.dayOfWeek]], // Example: assumes one day per definition for simplicity
        startTime: ph.startTime,
        endTime: ph.endTime,
    })) || [{ days: [], startTime: '17:00', endTime: '22:00' }];


    resetCourtForm({
        name: court.name,
        description: court.description || '',
        type: court.type,
        surface: court.surface,
        features: court.features || [],
        bookingRules: {
            minBookingDuration: court.bookingRules?.minBookingDuration || 60,
            maxBookingDuration: court.bookingRules?.maxBookingDuration || 60,
            advanceBookingDays: court.bookingRules?.advanceBookingDays || 7,
            cancellationDeadlineHours: court.bookingRules?.cancellationDeadlineHours || 2,
            slotIncrementMinutes: court.bookingRules?.slotIncrementMinutes || 30,
        },
        operatingHours: court.operatingHours || defaultOperatingHours,
        pricing: {
            basePrice: court.pricing?.basePrice || 25,
            peakHourMultiplier: court.pricing?.peakHourMultiplier || 1.2,
        },
        peakHoursDefinition: peakHoursForForm.length > 0 ? peakHoursForForm : [{ days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '17:00', endTime: '22:00' }],
        isActive: court.isActive !== undefined ? court.isActive : true,
    });
    setShowCreateModal(true);
  };
  
  const onSubmitCourt = (data) => {
    // Transform peakHoursDefinition to backend structure
    const peakHoursForBackend = data.peakHoursDefinition.flatMap(def => 
        def.days.map(day => ({
            dayOfWeek: daysOfWeek.indexOf(day),
            startTime: def.startTime,
            endTime: def.endTime
        }))
    );
    const finalData = {
        ...data,
        pricing: {
            ...data.pricing,
            peakHours: peakHoursForBackend
        }
    };
    delete finalData.peakHoursDefinition; // Remove temporary form field

    if (editingCourt) {
      updateCourtMutation.mutate({ id: editingCourt._id, data: finalData });
    } else {
      createCourtMutation.mutate(finalData);
    }
  };
  
  const onSubmitBlock = (data) => {
    if (blockingCourt) {
      blockCourtMutation.mutate({ 
        id: blockingCourt._id, 
        data: {
          ...data,
          startDateTime: new Date(data.startDateTime).toISOString(),
          endDateTime: new Date(data.endDateTime).toISOString()
        } 
      });
    }
  };
  
  const courtFeaturesOptions = ['lights', 'seating', 'scoreboard', 'practice_wall'];
  const watchCourtFeatures = watchCourt('features') || [];
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Court Management</h1>
        <button
          onClick={() => { 
            resetCourtForm(); // Reset to default values for new court
            setEditingCourt(null); 
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Court
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court) => (
          <div key={court._id} className={`card ${!court.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
                    {court.type} • {court.surface}
                  </p>
                </div>
                <span className={`badge ${court.isActive ? 'badge-success' : 'badge-error'}`}>
                  {court.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {court.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{court.description}</p>
              )}
              
              <div className="text-sm text-gray-700 space-y-1 mb-3">
                  <p><DollarSign className="inline h-4 w-4 mr-1 text-gray-400"/> Base: €{court.pricing?.basePrice || 'N/A'} /hr</p>
                  <p><Clock className="inline h-4 w-4 mr-1 text-gray-400"/> Slot Incr: {court.bookingRules?.slotIncrementMinutes || 'N/A'} min</p>
              </div>

              {court.activeBlocks?.length > 0 && (
                <div className="border-t border-dashed pt-2 mt-2 mb-3">
                  <p className="text-xs font-medium text-red-600 mb-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1"/> Currently Blocked
                  </p>
                  {court.activeBlocks.slice(0,1).map(block => (
                     <p key={block._id} className="text-xs text-red-500">
                        {format(new Date(block.startDateTime), 'MMM d, HH:mm')} - {format(new Date(block.endDateTime), 'HH:mm')} ({block.reason})
                     </p>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-2 pt-3 border-t">
                  <button
                    onClick={() => handleEditCourt(court)}
                    className="btn-secondary btn-sm p-1.5" title="Edit court" >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setBlockingCourt(court)}
                    className="btn-secondary btn-sm p-1.5 text-yellow-600 hover:bg-yellow-100" title="Block court">
                    <Lock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCourtId(court._id)}
                    className="btn-secondary btn-sm p-1.5 text-red-600 hover:bg-red-100" title="Delete court">
                    <Trash2 className="h-4 w-4" />
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCourt(null);
          resetCourtForm();
        }}
        title={editingCourt ? 'Edit Court' : 'Create New Court'}
        size="2xl"
      >
        <form onSubmit={handleSubmitCourt(onSubmitCourt)} className="space-y-6">
          {/* Basic Info */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Basic Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="md:col-span-2">
                <label className="form-label">Court Name</label>
                <input {...registerCourt('name')} className="form-input" />
                {courtErrors.name && <p className="form-error">{courtErrors.name.message}</p>}
              </div>
              <div>
                <label className="form-label">Type</label>
                <select {...registerCourt('type')} className="form-input">
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="covered">Covered</option>
                </select>
              </div>
              <div>
                <label className="form-label">Surface</label>
                <select {...registerCourt('surface')} className="form-input">
                  <option value="hard">Hard</option>
                  <option value="clay">Clay</option>
                  <option value="grass">Grass</option>
                  <option value="synthetic">Synthetic</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Description</label>
                <textarea {...registerCourt('description')} className="form-input" rows={2}/>
              </div>
            </div>
          </fieldset>

          {/* Booking Rules */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Booking Rules</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {[ 'minBookingDuration', 'maxBookingDuration', 'advanceBookingDays', 'cancellationDeadlineHours', 'slotIncrementMinutes'].map(field => (
                <div key={field}>
                  <label className="form-label capitalize">
                    {field.replace(/([A-Z])/g, ' $1').replace('Booking D', 'D').replace('Hours', '(hrs)').replace('Minutes', '(min)')}
                  </label>
                  {field === 'slotIncrementMinutes' ? (
                     <select {...registerCourt(`bookingRules.${field}`)} className="form-input">
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>60 minutes</option>
                     </select>
                  ) : (
                    <input {...registerCourt(`bookingRules.${field}`)} type="number" className="form-input"/>
                  )}
                  {courtErrors.bookingRules?.[field] && <p className="form-error">{courtErrors.bookingRules[field].message}</p>}
                </div>
              ))}
            </div>
          </fieldset>

          {/* Operating Hours */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Operating Hours (08:00 - 22:00)</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 mt-2">
              {daysOfWeek.map(day => (
                <div key={day}>
                  <label className="form-label capitalize text-xs">{day}</label>
                  <div className="flex space-x-2">
                    <input type="time" {...registerCourt(`operatingHours.${day}.open`)} className="form-input"/>
                    <input type="time" {...registerCourt(`operatingHours.${day}.close`)} className="form-input"/>
                  </div>
                   {courtErrors.operatingHours?.[day]?.open && <p className="form-error text-xs">{courtErrors.operatingHours[day].open.message}</p>}
                   {courtErrors.operatingHours?.[day]?.close && <p className="form-error text-xs">{courtErrors.operatingHours[day].close.message}</p>}
                </div>
              ))}
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Pricing (€)</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="form-label">Base Price (per hour)</label>
                <input {...registerCourt('pricing.basePrice')} type="number" step="0.01" className="form-input"/>
                {courtErrors.pricing?.basePrice && <p className="form-error">{courtErrors.pricing.basePrice.message}</p>}
              </div>
              <div>
                <label className="form-label">Peak Hour Multiplier (e.g., 1.2 for 20% higher)</label>
                <input {...registerCourt('pricing.peakHourMultiplier')} type="number" step="0.01" className="form-input"/>
                {courtErrors.pricing?.peakHourMultiplier && <p className="form-error">{courtErrors.pricing.peakHourMultiplier.message}</p>}
              </div>
            </div>
             {/* Peak Hours Definition */}
            <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Peak Hour Slots</h5>
                {peakHourFields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-2 border rounded-md">
                        <div className="md:col-span-2">
                            <label className="form-label text-xs">Days</label>
                            <Controller
                                name={`peakHoursDefinition.${index}.days`}
                                control={courtControl}
                                render={({ field }) => (
                                    <select
                                        multiple
                                        {...field}
                                        className="form-input h-24"
                                    >
                                        {daysOfWeek.map(day => (
                                            <option key={day} value={day} className="capitalize">{day}</option>
                                        ))}
                                    </select>
                                )}
                            />
                             {courtErrors.peakHoursDefinition?.[index]?.days && <p className="form-error text-xs">{courtErrors.peakHoursDefinition[index].days.message}</p>}
                        </div>
                        <div>
                            <label className="form-label text-xs">Start Time</label>
                            <input type="time" {...registerCourt(`peakHoursDefinition.${index}.startTime`)} className="form-input"/>
                            {courtErrors.peakHoursDefinition?.[index]?.startTime && <p className="form-error text-xs">{courtErrors.peakHoursDefinition[index].startTime.message}</p>}
                        </div>
                        <div>
                            <label className="form-label text-xs">End Time</label>
                            <input type="time" {...registerCourt(`peakHoursDefinition.${index}.endTime`)} className="form-input"/>
                            {courtErrors.peakHoursDefinition?.[index]?.endTime && <p className="form-error text-xs">{courtErrors.peakHoursDefinition[index].endTime.message}</p>}
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                            <button type="button" onClick={() => removePeakHour(index)} className="btn-danger btn-sm p-1 text-xs">Remove Peak Slot</button>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={() => appendPeakHour({ days: [], startTime: '17:00', endTime: '22:00' })} className="btn-secondary btn-sm mt-2 text-xs">
                    Add Peak Hour Slot
                </button>
            </div>
          </fieldset>
          
          {/* Features & Status */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Other</legend>
            <div className="mt-2">
                <label className="form-label">Features</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {courtFeaturesOptions.map((feature) => (
                    <label key={feature} className="flex items-center">
                    <input type="checkbox" value={feature}
                        checked={watchCourtFeatures.includes(feature)}
                        onChange={(e) => {
                        const current = watchCourtFeatures || [];
                        if (e.target.checked) {
                            setCourtValue('features', [...current, feature]);
                        } else {
                            setCourtValue('features', current.filter(f => f !== feature));
                        }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{feature.replace('_', ' ')}</span>
                    </label>
                ))}
                </div>
            </div>
            <div className="mt-4">
                <label className="flex items-center">
                <input {...registerCourt('isActive')} type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/>
                <span className="ml-2 text-sm text-gray-700">Court is active and available for booking</span>
                </label>
            </div>
          </fieldset>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => { setShowCreateModal(false); setEditingCourt(null); resetCourtForm();}} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createCourtMutation.isLoading || updateCourtMutation.isLoading} className="btn-primary">
              {createCourtMutation.isLoading || updateCourtMutation.isLoading ? 'Saving...' : (editingCourt ? 'Update Court' : 'Create Court')}
            </button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={!!blockingCourt} onClose={() => { setBlockingCourt(null); resetBlockForm();}} title={`Block Court: ${blockingCourt?.name || ''}`} size="md">
        <form onSubmit={handleSubmitBlock(onSubmitBlock)} className="space-y-4">
          <div>
            <label className="form-label">Reason</label>
            <select {...registerBlock('reason')} className="form-input">
              <option value="maintenance">Maintenance</option>
              <option value="event">Event</option>
              <option value="weather">Weather</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...registerBlock('description')} className="form-input" rows={2}/>
          </div>
          <div>
            <label className="form-label">Start Date/Time</label>
            <input {...registerBlock('startDateTime')} type="datetime-local" className="form-input"/>
            {blockErrors.startDateTime && <p className="form-error">{blockErrors.startDateTime.message}</p>}
          </div>
          <div>
            <label className="form-label">End Date/Time</label>
            <input {...registerBlock('endDateTime')} type="datetime-local" className="form-input"/>
            {blockErrors.endDateTime && <p className="form-error">{blockErrors.endDateTime.message}</p>}
          </div>
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <p className="text-xs text-yellow-700">
              <strong>Warning:</strong> Blocking will cancel existing bookings in this period. Users will be notified.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => { setBlockingCourt(null); resetBlockForm();}} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={blockCourtMutation.isLoading} className="btn-danger">
              {blockCourtMutation.isLoading ? 'Blocking...' : 'Confirm Block'}
            </button>
          </div>
        </form>
      </Modal>
      
      <ConfirmDialog
        isOpen={!!deletingCourtId}
        onClose={() => setDeletingCourtId(null)}
        onConfirm={() => deleteCourtMutation.mutate(deletingCourtId)}
        title="Delete Court"
        message="Are you sure you want to delete this court? This action cannot be undone. Ensure no active bookings exist."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default AdminCourts;