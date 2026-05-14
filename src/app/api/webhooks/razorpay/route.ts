import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify Webhook Signature (Optional if secret is missing)
    if (secret && signature) {
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(body)
          .digest("hex");

        if (expectedSignature !== signature) {
          console.error('Invalid Webhook Signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
    } else {
        console.warn('Razorpay Webhook: Skipping signature verification (Secret or Signature missing)');
    }

    const event = JSON.parse(body);
    console.log('Razorpay Webhook Event Received:', event.event);

    // 2. Handle relevant events
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const payload = event.payload.payment?.entity || event.payload.order?.entity;
      const orderId = payload.order_id || payload.id;
      const paymentId = payload.id;

      // Find the corresponding payment record
      const { data: paymentRecord, error: fetchError } = await supabaseAdmin
        .from('payments')
        .select('submission_id, status')
        .eq('razorpay_order_id', orderId)
        .single();

      if (fetchError || !paymentRecord) {
        console.error('Payment record not found for Order ID:', orderId);
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      // If already paid, skip
      if (paymentRecord.status === 'PAID') {
        return NextResponse.json({ status: 'Already processed' });
      }

      // Update Payments Table
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: paymentId,
          status: 'PAID',
          updated_at: new Date().toISOString()
        })
        .eq('razorpay_order_id', orderId);

      // Update Submission Record
      const { data: submission } = await supabaseAdmin
        .from('form_submissions')
        .select('form_data')
        .eq('id', paymentRecord.submission_id)
        .single();

      if (submission) {
        const formData = submission.form_data || {};
        formData.__payment_status = 'PAID';
        formData.__razorpay_payment_id = paymentId;
        formData.__razorpay_order_id = orderId;
        formData.__payment_date = new Date().toISOString();

        await supabaseAdmin
          .from('form_submissions')
          .update({ 
            form_data: formData,
            is_payment_completed: true,
            is_onboarded: false 
          })
          .eq('id', paymentRecord.submission_id);

        // Initialize MOU Draft Status
        const keys = Object.keys(formData);
        const nameKey = keys.find(k => k.toLowerCase().includes('startup name') || k.toLowerCase().includes('company name'));
        const founderKey = keys.find(k => k.toLowerCase().includes('founder') && !k.toLowerCase().includes('linkedin') && !k.toLowerCase().includes('background'));
        const addressKey = keys.find(k => k.toLowerCase().includes('city') || k.toLowerCase().includes('address') || k.toLowerCase().includes('location'));
        
        const companyName = nameKey ? formData[nameKey] : 'Unknown Startup';
        const founderName = founderKey ? formData[founderKey] : 'Founder';
        const companyAddress = addressKey ? formData[addressKey] : '________________';

        formData.__mou_status = 'PENDING_REVIEW';
        formData.__mou_draft = {
            company_name: companyName,
            founder: founderName,
            address: companyAddress,
            date: new Date().toLocaleDateString('en-GB')
        };

        await supabaseAdmin
          .from('form_submissions')
          .update({ 
            form_data: formData,
            is_payment_completed: true,
            is_onboarded: false 
          })
          .eq('id', paymentRecord.submission_id);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
