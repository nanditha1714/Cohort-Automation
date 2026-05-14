import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(req: Request) {
  try {
    const { amount, submissionId } = await req.json();

    if (!amount || !submissionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${submissionId.substring(0, 5)}`,
      notes: {
        submission_id: submissionId
      }
    };

    const order = await razorpay.orders.create(options);

    // PERSIST ORDER IN BACKEND
    const { error: dbError } = await supabaseAdmin
      .from('payments')
      .insert({
        submission_id: submissionId,
        razorpay_order_id: order.id,
        amount: amount,
        currency: 'INR',
        status: 'PENDING'
      });

    if (dbError) {
      console.error('Database error storing payment session:', dbError);
      // We continue even if DB fails, as the order is created in Razorpay
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
