import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      submissionId 
    } = await req.json();

    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('Signature Verification Failed. Expected:', expectedSignature, 'Received:', razorpay_signature);
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    // 2. Update Payments Table (NEW)
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'PAID',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id);

    if (paymentUpdateError) {
      console.warn("Could not update payments table record:", paymentUpdateError);
    }

    // 3. Update Submission in Database
    const { data: currentSubmission, error: fetchError } = await supabaseAdmin
      .from('form_submissions')
      .select('form_data')
      .eq('id', submissionId)
      .single();

    if (fetchError || !currentSubmission) {
      console.error('Submission lookup failed for ID:', submissionId, fetchError);
      return NextResponse.json({ error: 'Submission record not found in database' }, { status: 404 });
    }

    const formData = currentSubmission.form_data || {};
    formData.__payment_status = 'PAID';
    formData.__razorpay_payment_id = razorpay_payment_id;
    formData.__razorpay_order_id = razorpay_order_id;
    formData.__payment_date = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('form_submissions')
      .update({ 
        form_data: formData,
        is_payment_completed: true,
        is_onboarded: false 
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Submission update failed:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('Payment verified and database updated successfully for submission:', submissionId);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Payment Verification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
