// server/middleware/multiTenantMiddleware.js
const Club = require('../models/Club');
const { asyncHandler } = require('./errorMiddleware');

// Middleware to identify club from subdomain or custom domain
const identifyClub = asyncHandler(async (req, res, next) => {
  let clubIdentifier;
  
  // Check for custom domain first
  const host = req.get('host');
  const customDomainClub = await Club.findOne({ domain: host, isActive: true });
  
  if (customDomainClub) {
    req.club = customDomainClub;
    return next();
  }
  
  // Check for subdomain (e.g., vienna-tennis.bookingapp.at)
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    clubIdentifier = subdomain;
  }
  
  // Check for club in path (e.g., /clubs/vienna-tennis)
  if (!clubIdentifier && req.path.startsWith('/clubs/')) {
    clubIdentifier = req.path.split('/')[2];
  }
  
  // Check for club in header (for API requests)
  if (!clubIdentifier && req.headers['x-club-id']) {
    clubIdentifier = req.headers['x-club-id'];
  }
  
  if (!clubIdentifier) {
    // For platform landing page
    return next();
  }
  
  const club = await Club.findOne({
    $or: [
      { slug: clubIdentifier },
      { _id: clubIdentifier }
    ],
    isActive: true
  });
  
  if (!club) {
    res.status(404);
    throw new Error('Tennis club not found');
  }
  
  req.club = club;
  next();
});

// Enhanced auth middleware for multi-club
const protectWithClub = asyncHandler(async (req, res, next) => {
  // First run the standard protect middleware
  await protect(req, res, () => {});
  
  // Then check club membership
  if (req.club && req.user) {
    const membership = req.user.clubs.find(
      c => c.club.toString() === req.club._id.toString()
    );
    
    if (!membership || membership.membershipStatus !== 'active') {
      res.status(403);
      throw new Error('You are not a member of this tennis club');
    }
    
    req.userRole = membership.role;
    req.membership = membership;
  }
  
  next();
});

// Club admin authorization
const clubAdmin = (req, res, next) => {
  if (!req.userRole || !['admin', 'super_admin'].includes(req.userRole)) {
    res.status(403);
    throw new Error('Club admin access required');
  }
  next();
};

// Platform super admin (for managing all clubs)
const platformAdmin = (req, res, next) => {
  if (req.user.role !== 'platform_admin') {
    res.status(403);
    throw new Error('Platform admin access required');
  }
  next();
};

// server/controllers/multiClubController.js
const User = require('../models/User');
const Club = require('../models/Club');
const { asyncHandler } = require('../middleware/errorMiddleware');

// Switch between clubs for a user
const switchClub = asyncHandler(async (req, res) => {
  const { clubId } = req.body;
  
  const membership = req.user.clubs.find(
    c => c.club.toString() === clubId && c.membershipStatus === 'active'
  );
  
  if (!membership) {
    res.status(403);
    throw new Error('You are not a member of this club');
  }
  
  req.user.currentClub = clubId;
  await req.user.save();
  
  const club = await Club.findById(clubId);
  
  res.json({
    success: true,
    data: {
      club,
      role: membership.role
    }
  });
});

// Join a club
const joinClub = asyncHandler(async (req, res) => {
  const { clubId, membershipType } = req.body;
  
  const club = await Club.findById(clubId);
  if (!club || !club.isActive) {
    res.status(404);
    throw new Error('Club not found');
  }
  
  // Check if already a member
  const existingMembership = req.user.clubs.find(
    c => c.club.toString() === clubId
  );
  
  if (existingMembership) {
    res.status(400);
    throw new Error('Already a member of this club');
  }
  
  // Add club membership
  req.user.clubs.push({
    club: clubId,
    role: 'member',
    membershipStatus: club.settings.requireApproval ? 'pending' : 'active'
  });
  
  await req.user.save();
  
  // Update club stats
  if (!club.settings.requireApproval) {
    club.stats.totalMembers += 1;
    await club.save();
  }
  
  res.status(201).json({
    success: true,
    message: club.settings.requireApproval 
      ? 'Membership request submitted' 
      : 'Successfully joined the club'
  });
});