import Stripe from 'stripe';
import env, { required } from 'shared/src/env.js';

const STRIPE_SECRET_KEY = required(env.STRIPE_SECRET_KEY);

export const stripe = new Stripe(STRIPE_SECRET_KEY);
