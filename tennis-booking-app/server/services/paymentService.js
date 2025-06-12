// server/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  constructor() {
    this.paymentProviders = {
      stripe: this.stripeProvider,
      klarna: this.klarnaProvider,
      eps: this.epsProvider,
      sofort: this.sofortProvider 
    };
  }
  
  // Create payment intent for court booking
  async createBookingPayment(booking, club, user) {
    const amount = Math.round(booking.totalPrice * 100); // Convert to cents
    
    try {
      // Create Stripe customer for user if not exists
      let stripeCustomerId = user.paymentProfiles?.stripe?.customerId;
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
          metadata: {
            userId: user._id.toString(),
            clubId: club._id.toString()
          }
        });
        
        user.paymentProfiles = {
          ...user.paymentProfiles,
          stripe: { customerId: customer.id }
        };
        await user.save();
        stripeCustomerId = customer.id;
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: club.settings.currency.toLowerCase(),
        customer: stripeCustomerId,
        payment_method_types: ['card', 'sepa_debit', 'eps', 'sofort'],
        metadata: {
          bookingId: booking._id.toString(),
          clubId: club._id.toString(),
          userId: user._id.toString()
        },
        description: `Court booking at ${club.name} - ${booking.court.name}`,
        receipt_email: user.email
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }
  
  // Handle recurring membership payments
  async createMembershipSubscription(user, club, membershipPlan) {
    try {
      // Create or get Stripe product for club membership
      let product = await stripe.products.list({
        query: `metadata['clubId']:'${club._id.toString()}'`
      });
      
      if (!product.data.length) {
        product = await stripe.products.create({
          name: `${club.name} Membership`,
          metadata: {
            clubId: club._id.toString()
          }
        });
      } else {
        product = product.data[0];
      }
      
      // Create price for the membership plan
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: membershipPlan.price * 100,
        currency: club.settings.currency.toLowerCase(),
        recurring: {
          interval: membershipPlan.interval // 'month' or 'year'
        }
      });
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.paymentProfiles.stripe.customerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user._id.toString(),
          clubId: club._id.toString(),
          membershipPlanId: membershipPlan._id.toString()
        }
      });
      
      return subscription;
    } catch (error) {
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }
  
  // Process refunds
  async refundBooking(booking, reason) {
    try {
      if (booking.paymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: booking.paymentIntentId,
          reason: reason || 'requested_by_customer',
          metadata: {
            bookingId: booking._id.toString()
          }
        });
        
        return refund;
      }
    } catch (error) {
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }
  
  // Split payments between platform and clubs
  async createPlatformPayment(club, amount, description) {
    try {
      // Platform takes commission (e.g., 10%)
      const platformFee = Math.round(amount * 0.10);
      const clubAmount = amount - platformFee;
      
      // Create transfer to club's Stripe account
      if (club.paymentInfo?.stripeAccountId) {
        const transfer = await stripe.transfers.create({
          amount: clubAmount,
          currency: club.settings.currency.toLowerCase(),
          destination: club.paymentInfo.stripeAccountId,
          description: description
        });
        
        return transfer;
      }
    } catch (error) {
      throw new Error(`Platform payment failed: ${error.message}`);
    }
  }
}

