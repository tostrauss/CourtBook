// server/services/austrianIntegrations.js
class AustrianIntegrations {
  // Integration with Austrian Tennis Association (ÖTV)
  async syncWithOTV(club, members) {
    // Sync member rankings and tournament results
    const otvApiUrl = process.env.OTV_API_URL;
    const apiKey = club.integrations?.otv?.apiKey;
    
    if (!apiKey) return;
    
    for (const member of members) {
      if (member.otvNumber) {
        try {
          const response = await axios.get(`${otvApiUrl}/players/${member.otvNumber}`, {
            headers: { 'X-API-Key': apiKey }
          });
          
          member.tennisProfile = {
            ...member.tennisProfile,
            otvRanking: response.data.ranking,
            otvPoints: response.data.points,
            lastUpdated: new Date()
          };
          
          await member.save();
        } catch (error) {
          console.error(`Failed to sync OTV data for ${member.otvNumber}`);
        }
      }
    }
  }
  
  // Weather integration for outdoor courts
  async getWeatherForecast(club) {
    const { lat, lng } = club.location.coordinates;
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${weatherApiKey}&units=metric`
    );
    
    return response.data.list.map(item => ({
      datetime: new Date(item.dt * 1000),
      temp: item.main.temp,
      description: item.weather[0].description,
      windSpeed: item.wind.speed,
      precipitation: item.rain?.['3h'] || 0,
      isPlayable: item.weather[0].main !== 'Rain' && item.wind.speed < 40
    }));
  }
  
  // Austrian holiday calendar
  getAustrianHolidays(year) {
    const holidays = [
      { date: `${year}-01-01`, name: 'Neujahr' },
      { date: `${year}-01-06`, name: 'Heilige Drei Könige' },
      // Easter-based holidays would be calculated
      { date: `${year}-05-01`, name: 'Staatsfeiertag' },
      { date: `${year}-08-15`, name: 'Mariä Himmelfahrt' },
      { date: `${year}-10-26`, name: 'Nationalfeiertag' },
      { date: `${year}-11-01`, name: 'Allerheiligen' },
      { date: `${year}-12-08`, name: 'Mariä Empfängnis' },
      { date: `${year}-12-25`, name: 'Christtag' },
      { date: `${year}-12-26`, name: 'Stefanitag' }
    ];
    
    return holidays;
  }
  
  // SEPA Direct Debit for memberships
  async setupSEPAMandate(user, iban, club) {
    // Validate IBAN
    const ibanValidator = require('iban');
    if (!ibanValidator.isValid(iban)) {
      throw new Error('Invalid IBAN');
    }
    
    // Create SEPA mandate
    const mandate = await stripe.setupIntents.create({
      customer: user.paymentProfiles.stripe.customerId,
      payment_method_types: ['sepa_debit'],
      usage: 'off_session',
      metadata: {
        clubId: club._id.toString(),
        userId: user._id.toString()
      }
    });
    
    return mandate;
  }
}